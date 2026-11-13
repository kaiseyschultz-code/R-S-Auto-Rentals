-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 6: FIX STAFF PROFILE CREATION
-- Supabase Auth's admin.createUser inserts the auth.users row first
-- and writes app_metadata in a follow-up UPDATE, so the INSERT-only
-- trigger from migration 2 never saw tenant_id. Run on both, and only
-- create the profile if it doesn't exist yet (never overwrite a role
-- an owner has since changed).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
BEGIN
  IF meta ? 'tenant_id' THEN
    INSERT INTO public.users (id, tenant_id, email, full_name, role)
    VALUES (
      NEW.id,
      (meta->>'tenant_id')::uuid,
      NEW.email,
      meta->>'full_name',
      COALESCE(NULLIF(meta->>'role', ''), 'staff')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
