-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 1: CORE TABLES
-- Payments run through Square only (no Stripe, no Shopify).
-- ============================================================

-- Needed for the rentals double-booking exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ── TENANTS ──────────────────────────────────────────────────
-- One row per rental company. R&S is the only tenant today; the
-- column stays so the CRM can be offered to other companies later.
CREATE TABLE public.tenants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  slug                text UNIQUE NOT NULL,
  logo_url            text,
  primary_color       text DEFAULT '#4db8e8',   -- matches web/ --brand
  email               text,
  phone               text,
  address             text,
  city                text,
  state               text,
  zip                 text,
  plan                text NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free','starter','pro','enterprise')),
  -- Square account this tenant sells through. The access token is a
  -- secret and lives in server env vars, never in this table.
  square_merchant_id  text,
  square_location_id  text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── USERS ────────────────────────────────────────────────────
-- Staff profiles. Extends Supabase auth.users.
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  role        text NOT NULL DEFAULT 'staff'
                CHECK (role IN ('owner','manager','staff')),
  avatar_url  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── VEHICLES ─────────────────────────────────────────────────
CREATE TABLE public.vehicles (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                        text NOT NULL,      -- display name e.g. "Toyota Camry"
  make                        text,
  model                       text,
  year                        int,
  vin                         text,
  plate                       text,
  color                       text,
  purchase_price              numeric(10,2),
  purchase_date               date,
  mileage                     int NOT NULL DEFAULT 0,
  platforms                   text[],             -- ['Uber','Lyft','DoorDash']
  status                      text NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available','rented','service','inactive')),
  photo_url                   text,
  notes                       text,
  -- Link to the Square Catalog item the website sells (see web/src/lib/square).
  square_item_id              text,
  square_daily_variation_id   text,
  square_weekly_variation_id  text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, vin),
  UNIQUE (tenant_id, square_item_id)
);

-- ── CUSTOMERS ────────────────────────────────────────────────
CREATE TABLE public.customers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Personal
  first_name             text NOT NULL,
  last_name              text NOT NULL,
  email                  text,
  phone                  text,
  dob                    date,
  address                text,
  city                   text,
  state                  text,
  zip                    text,
  -- ID verification. Prefer storing the verification provider's
  -- reference over the full ID number.
  id_type                text CHECK (id_type IN ('license','passport','state_id')),
  id_number              text,
  id_expiry              date,
  id_verified            boolean NOT NULL DEFAULT false,
  id_verified_at         timestamptz,
  id_verification_ref    text,                    -- e.g. iDenfy scan reference
  -- Insurance
  insurance_carrier      text,
  insurance_policy       text,
  insurance_expiry       date,
  insurance_coverage     text,
  insurance_claims_phone text,
  -- Emergency contact
  emergency_name         text,
  emergency_phone        text,
  emergency_relation     text,
  -- Square
  square_customer_id     text,
  -- Internal flags
  is_gig_worker          boolean NOT NULL DEFAULT false,
  gig_platforms          text[],
  is_flagged             boolean NOT NULL DEFAULT false,
  flag_reason            text,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, square_customer_id)
);

-- ── RENTALS ──────────────────────────────────────────────────
CREATE TABLE public.rentals (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id             uuid NOT NULL REFERENCES public.customers(id),
  vehicle_id              uuid NOT NULL REFERENCES public.vehicles(id),
  status                  text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','active','returned','overdue','cancelled')),
  plan_type               text NOT NULL DEFAULT 'weekly'
                            CHECK (plan_type IN ('daily','weekly')),
  rate_amount             numeric(10,2) NOT NULL,
  pickup_date             date NOT NULL,
  return_date             date NOT NULL,
  actual_return_date      date,
  odometer_out            int,
  odometer_in             int,
  platform                text,                   -- 'Uber', 'DoorDash', 'Personal', etc.
  booking_source          text NOT NULL DEFAULT 'manual'
                            CHECK (booking_source IN ('manual','web','phone','walk_in')),
  -- Set when the booking came through the website's Square checkout.
  square_order_id         text,
  square_payment_link_id  text,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CHECK (return_date >= pickup_date),
  UNIQUE (tenant_id, square_order_id),
  -- A vehicle can't have two live rentals with overlapping dates.
  CONSTRAINT rentals_no_double_booking EXCLUDE USING gist (
    vehicle_id WITH =,
    daterange(pickup_date, return_date, '[]') WITH &&
  ) WHERE (status IN ('pending','active','overdue'))
);

-- ── INVOICES ─────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rental_id                uuid REFERENCES public.rentals(id),
  customer_id              uuid NOT NULL REFERENCES public.customers(id),
  invoice_number           text,                  -- auto-generated per tenant, e.g. INV-0014
  amount                   numeric(10,2) NOT NULL,
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('draft','pending','paid','overdue','cancelled')),
  issued_date              date NOT NULL DEFAULT CURRENT_DATE,
  due_date                 date,
  paid_date                date,
  -- Square
  square_order_id          text,
  square_payment_id        text,
  square_invoice_id        text,                  -- if billed via the Square Invoices API
  square_payment_link_url  text,
  pdf_url                  text,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number),
  UNIQUE (tenant_id, square_payment_id)
);

-- Per-tenant invoice counter (keeps numbering race-free).
CREATE TABLE public.invoice_counters (
  tenant_id    uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  last_number  int NOT NULL DEFAULT 0
);

-- ── EXPENSES ─────────────────────────────────────────────────
CREATE TABLE public.expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_id   uuid REFERENCES public.vehicles(id),
  category     text NOT NULL
                 CHECK (category IN ('purchase','maintenance','insurance','cleaning','fuel','platform','other')),
  description  text,
  amount       numeric(10,2) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url  text,                              -- Supabase Storage URL
  created_by   uuid REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── LEADS ────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                   text NOT NULL,
  email                  text,
  phone                  text,
  source                 text,                    -- 'website','phone','referral','social'
  platform               text,                    -- 'Uber','DoorDash', etc.
  stage                  text NOT NULL DEFAULT 'new'
                           CHECK (stage IN ('new','contacted','docs','agreement','won','lost')),
  desired_plan           text,
  desired_vehicle        text,
  converted_to_rental_id uuid REFERENCES public.rentals(id),
  notes                  text,
  assigned_to            uuid REFERENCES public.users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── RENTAL AGREEMENTS ────────────────────────────────────────
CREATE TABLE public.rental_agreements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rental_id           uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  customer_id         uuid NOT NULL REFERENCES public.customers(id),
  template_type       text NOT NULL DEFAULT 'standard_weekly',
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','signed','expired','cancelled')),
  sent_at             timestamptz,
  signed_at           timestamptz,
  esign_request_id    text,                       -- e-signature provider request ID
  esign_signature_id  text,
  document_url        text,                       -- final signed PDF (Supabase Storage)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── FOLLOW-UP SEQUENCES ──────────────────────────────────────
CREATE TABLE public.follow_up_sequences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name           text NOT NULL,
  trigger_event  text NOT NULL,
    -- 'no_reply_24h' | 'docs_pending_48h' | 'esign_pending_24h'
    -- 'post_return_1d' | 'overdue_invoice' | 'renewal_reminder'
  steps          jsonb NOT NULL DEFAULT '[]',
    -- [{delay_hours: 24, channel: "sms", template: "Hi {name}, ..."}]
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── ACTIVITY LOG ─────────────────────────────────────────────
CREATE TABLE public.activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.users(id),
  entity_type  text,                              -- 'rental','customer','vehicle','invoice'
  entity_id    uuid,
  action       text NOT NULL,                     -- 'created','updated','status_changed', etc.
  details      jsonb,                             -- {from: 'active', to: 'returned'}
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── SOCIAL POSTS ─────────────────────────────────────────────
CREATE TABLE public.social_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform      text NOT NULL CHECK (platform IN ('instagram','facebook','twitter')),
  caption       text,
  media_url     text,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','published','failed')),
  created_by    uuid REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
