-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 7: THE R&S TENANT
-- Every CRM row hangs off a tenant, and staff logins are tied to one
-- (scripts/create-staff-user.mjs defaults to this id). seed.sql only
-- runs locally, so production needs this one real row from a
-- migration. Real business details only; no sample data.
-- ============================================================

INSERT INTO public.tenants (id, name, slug, email, phone, city, state, plan)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'R&S Auto Rentals',
  'rs-auto-rentals',
  NULL,
  '(772) 202-0853',
  'Stuart',
  'FL',
  'pro'
)
ON CONFLICT (id) DO NOTHING;
