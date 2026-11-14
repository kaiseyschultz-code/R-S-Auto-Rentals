-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 0: ARCHIVE THE 2025 DRAFT SCHEMA
--
-- The live Supabase project had the old draft CRM schema pasted in
-- by hand (archive/sql-drafts/), with the bugs fixed in Phase 1
-- (staff could read invoices, recursive users policies, inflated
-- views, RLS-bypassing views). All its tables were empty.
--
-- If (and only if) that old schema is present, this moves its tables,
-- views and functions into schema "archive_2025_drafts". Nothing is
-- dropped, the API doesn't expose that schema, and any object can be
-- moved back with ALTER ... SET SCHEMA public. On a fresh database
-- (local dev, tests) it does nothing.
--
-- Detection: the old public.tenants has stripe_customer_id, which the
-- current schema never had.
-- ============================================================

DO $$
DECLARE
  t text;
  n bigint;
  f record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'stripe_customer_id'
  ) THEN
    RAISE NOTICE 'No 2025 draft schema found; nothing to archive.';
    RETURN;
  END IF;

  CREATE SCHEMA IF NOT EXISTS archive_2025_drafts;
  REVOKE ALL ON SCHEMA archive_2025_drafts FROM anon, authenticated;

  -- Views first (they depend on the tables).
  FOREACH t IN ARRAY ARRAY['dashboard_kpis', 'vehicle_roi'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET SCHEMA archive_2025_drafts', t);
    END IF;
  END LOOP;

  -- Tables (their triggers, policies, indexes and constraints move with them).
  FOREACH t IN ARRAY ARRAY[
    'activity_log', 'social_posts', 'follow_up_sequences', 'rental_agreements',
    'leads', 'expenses', 'invoices', 'rentals', 'customers', 'vehicles', 'users', 'tenants'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      RAISE NOTICE 'archiving public.% (% rows)', t, n;
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive_2025_drafts', t);
    END IF;
  END LOOP;

  -- The draft's functions, so the current migrations create fresh ones
  -- instead of CREATE OR REPLACE-ing these.
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public'
       AND p.proname IN ('set_updated_at', 'generate_invoice_number', 'tenant_id',
                         'sync_vehicle_status', 'log_activity')
  LOOP
    RAISE NOTICE 'archiving function %', f.sig;
    EXECUTE format('ALTER FUNCTION %s SET SCHEMA archive_2025_drafts', f.sig);
  END LOOP;
END
$$;
