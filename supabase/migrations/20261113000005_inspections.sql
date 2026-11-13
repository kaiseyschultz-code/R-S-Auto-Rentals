-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 5: VEHICLE INSPECTIONS
-- Renter-taken condition photos at pickup and return, reviewed by
-- staff. Our own design (no third-party inspection service).
--
-- Renters never touch the database: they get a single-use link
-- (/inspect/<token>) and the website's server checks the token and
-- writes with the secret key. Staff read through normal RLS.
-- ============================================================

CREATE TABLE public.inspections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rental_id         uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('pickup','return')),
  status            text NOT NULL DEFAULT 'sent'
                      CHECK (status IN ('sent','in_progress','completed')),
  -- Random link token. Rotated on resend; refused once completed or expired.
  token             text NOT NULL UNIQUE,
  token_expires_at  timestamptz NOT NULL DEFAULT now() + interval '72 hours',
  -- Filled in by the renter
  odometer          int CHECK (odometer >= 0),
  fuel_level        text CHECK (fuel_level IN ('empty','quarter','half','three_quarters','full')),
  renter_name       text,                       -- typed name
  renter_signature  text,                       -- drawn signature, PNG data URL (optional)
  confirmed_at      timestamptz,                -- renter confirmed the condition statement
  sent_at           timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  -- Staff review
  staff_review      text NOT NULL DEFAULT 'pending'
                      CHECK (staff_review IN ('pending','clean','damage')),
  damage_notes      text,
  reviewed_by       uuid REFERENCES public.users(id),
  reviewed_at       timestamptz,
  created_by        uuid REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, kind)                      -- one pickup + one return per rental
);

-- Fixed shot list. Keep in sync with web/src/lib/inspections/angles.ts.
CREATE TABLE public.inspection_photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inspection_id  uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  angle          text NOT NULL CHECK (angle IN (
                   'front','rear','left','right',
                   'front_left','front_right','rear_left','rear_right',
                   'wheels','windshield','interior','odometer','fuel_gauge')),
  storage_path   text NOT NULL,                 -- <tenant_id>/<inspection_id>/<angle>-<ts>.jpg in bucket "inspections"
  sha256         text NOT NULL,                 -- fingerprint of the uploaded file, for tamper evidence
  taken_at       timestamptz,                   -- as reported by the renter's device
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  lat            numeric(9,6),                  -- only if the renter allowed location
  lng            numeric(9,6),
  damage_flag    boolean NOT NULL DEFAULT false,
  damage_note    text,
  UNIQUE (inspection_id, angle)                 -- a retake replaces the earlier photo
);

CREATE TRIGGER set_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_inspections_rental  ON public.inspections (rental_id);
CREATE INDEX idx_inspections_review  ON public.inspections (tenant_id, staff_review);
CREATE INDEX idx_inspection_photos   ON public.inspection_photos (inspection_id);

-- ── RLS: same tenant pattern as everything else ──────────────
ALTER TABLE public.inspections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspections_tenant ON public.inspections
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY inspection_photos_tenant ON public.inspection_photos
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

-- ── PRIVATE STORAGE BUCKET ───────────────────────────────────
-- Not public: photos are only reachable through short-lived signed
-- URLs. Uploads come from the server (secret key), so there is no
-- insert policy for signed-in users or anyone else.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inspections', 'inspections', false, 15728640,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO NOTHING;

-- Staff may read (and so sign URLs for) their own tenant's folder only.
CREATE POLICY inspections_bucket_staff_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inspections'
    AND (storage.foldername(name))[1] = public.tenant_id()::text
  );
