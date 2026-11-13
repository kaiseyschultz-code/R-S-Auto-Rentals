-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 2: FUNCTIONS, TRIGGERS, VIEWS
-- ============================================================

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tenants_updated_at           BEFORE UPDATE ON public.tenants             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_users_updated_at             BEFORE UPDATE ON public.users               FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_vehicles_updated_at          BEFORE UPDATE ON public.vehicles            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_customers_updated_at         BEFORE UPDATE ON public.customers           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_rentals_updated_at           BEFORE UPDATE ON public.rentals             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_invoices_updated_at          BEFORE UPDATE ON public.invoices            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_expenses_updated_at          BEFORE UPDATE ON public.expenses            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_leads_updated_at             BEFORE UPDATE ON public.leads               FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_rental_agreements_updated_at BEFORE UPDATE ON public.rental_agreements   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_follow_up_sequences_updated_at BEFORE UPDATE ON public.follow_up_sequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_social_posts_updated_at      BEFORE UPDATE ON public.social_posts        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── CURRENT USER HELPERS (used by RLS) ───────────────────────
-- SECURITY DEFINER so RLS policies can call them without recursing
-- into the users table's own policies.
CREATE OR REPLACE FUNCTION public.tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION public.is_finance_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.user_role() IN ('owner','manager'), false)
$$;

-- ── INVOICE AUTO-NUMBER ──────────────────────────────────────
-- INV-0001, INV-0002 ... per tenant. The counter row is locked by the
-- upsert, so two invoices created at the same moment can't collide.
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_num int;
BEGIN
  INSERT INTO public.invoice_counters AS c (tenant_id, last_number)
  VALUES (NEW.tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE SET last_number = c.last_number + 1
  RETURNING last_number INTO next_num;

  NEW.invoice_number = 'INV-' || LPAD(next_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.generate_invoice_number();

-- ── PROTECT ROLE / TENANT ON USERS ───────────────────────────
-- Staff may edit their own profile, but only an owner (or the
-- server, via service_role) may change anyone's role or tenant.
CREATE OR REPLACE FUNCTION public.guard_user_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;                       -- server / SQL editor
  END IF;
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND public.user_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only an owner can change role, tenant or active status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_user_privileges
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_privileges();

-- ── STAFF PROFILE ON INVITE ──────────────────────────────────
-- When the server creates a staff login with APP metadata
-- {"tenant_id": "...", "role": "staff", "full_name": "..."}
-- (auth.admin.createUser({ app_metadata: ... }) with the service_role
-- key), create their profile row automatically.
-- Deliberately NOT raw_user_meta_data: any public sign-up can set
-- that, which would let a stranger make themselves an owner.
-- Sign-ups without a tenant_id get no profile, and so can see nothing.
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
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ── VEHICLE STATUS SYNC ──────────────────────────────────────
-- Rental active/overdue → vehicle rented.
-- Rental returned/cancelled → vehicle available (unless staff have
-- since moved it to service or inactive).
CREATE OR REPLACE FUNCTION public.sync_vehicle_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('active','overdue') THEN
    UPDATE public.vehicles SET status = 'rented'
     WHERE id = NEW.vehicle_id AND status <> 'rented';
  ELSIF NEW.status IN ('returned','cancelled') THEN
    UPDATE public.vehicles SET status = 'available'
     WHERE id = NEW.vehicle_id AND status = 'rented'
       AND NOT EXISTS (
         SELECT 1 FROM public.rentals r
          WHERE r.vehicle_id = NEW.vehicle_id
            AND r.id <> NEW.id
            AND r.status IN ('active','overdue')
       );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_status_vehicle_sync
  AFTER INSERT OR UPDATE OF status ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vehicle_status();

-- ── ACTIVITY LOG HELPER ──────────────────────────────────────
-- Runs as the caller, so RLS decides whether the insert is allowed.
CREATE OR REPLACE FUNCTION public.log_activity(
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_details     jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.activity_log (tenant_id, user_id, entity_type, entity_id, action, details)
  VALUES (public.tenant_id(), auth.uid(), p_entity_type, p_entity_id, p_action, p_details);
$$;

-- ── DASHBOARD KPI VIEW ───────────────────────────────────────
-- Each figure is its own subquery (joining them all at once
-- multiplied the totals). security_invoker = RLS applies, so staff
-- see 0 for the finance figures they aren't allowed to read.
CREATE OR REPLACE VIEW public.dashboard_kpis
WITH (security_invoker = true) AS
SELECT
  t.id AS tenant_id,
  (SELECT COALESCE(SUM(i.amount), 0) FROM public.invoices i
    WHERE i.tenant_id = t.id AND i.status = 'paid'
      AND DATE_TRUNC('month', i.paid_date) = DATE_TRUNC('month', now()))   AS monthly_revenue,
  (SELECT COUNT(*) FROM public.rentals r
    WHERE r.tenant_id = t.id AND r.status = 'active')                      AS active_rentals,
  (SELECT COUNT(*) FROM public.rentals r
    WHERE r.tenant_id = t.id AND r.status = 'overdue')                     AS overdue_rentals,
  (SELECT COUNT(*) FROM public.vehicles v
    WHERE v.tenant_id = t.id AND v.status = 'available')                   AS available_vehicles,
  (SELECT COUNT(*) FROM public.leads l
    WHERE l.tenant_id = t.id AND l.stage NOT IN ('won','lost'))            AS open_leads,
  (SELECT COUNT(*) FROM public.invoices i
    WHERE i.tenant_id = t.id AND i.status = 'overdue')                     AS overdue_invoices,
  (SELECT COALESCE(SUM(i.amount), 0) FROM public.invoices i
    WHERE i.tenant_id = t.id AND i.status = 'overdue')                     AS overdue_amount
FROM public.tenants t;

-- ── VEHICLE ROI VIEW ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.vehicle_roi
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.tenant_id,
  v.name,
  v.make,
  v.model,
  v.year,
  v.status,
  v.purchase_price,
  v.mileage,
  COALESCE(rev.revenue, 0)                                  AS revenue,
  COALESCE(exp.maintenance_cost, 0)                         AS maintenance_cost,
  COALESCE(exp.insurance_cost, 0)                           AS insurance_cost,
  COALESCE(exp.operating_cost, 0)                           AS operating_cost,
  COALESCE(exp.total_expenses, 0)                           AS total_expenses,
  COALESCE(rev.revenue, 0) - COALESCE(exp.total_expenses, 0) AS net_position,
  COALESCE(rc.total_rentals, 0)                             AS total_rentals
FROM public.vehicles v
LEFT JOIN (
  SELECT r.vehicle_id, SUM(i.amount) AS revenue
    FROM public.invoices i
    JOIN public.rentals r ON r.id = i.rental_id
   WHERE i.status = 'paid'
   GROUP BY r.vehicle_id
) rev ON rev.vehicle_id = v.id
LEFT JOIN (
  SELECT e.vehicle_id,
         SUM(e.amount) FILTER (WHERE e.category = 'maintenance') AS maintenance_cost,
         SUM(e.amount) FILTER (WHERE e.category = 'insurance')   AS insurance_cost,
         SUM(e.amount) FILTER (WHERE e.category <> 'purchase')   AS operating_cost,
         SUM(e.amount)                                           AS total_expenses
    FROM public.expenses e
   GROUP BY e.vehicle_id
) exp ON exp.vehicle_id = v.id
LEFT JOIN (
  SELECT vehicle_id, COUNT(*) AS total_rentals
    FROM public.rentals
   GROUP BY vehicle_id
) rc ON rc.vehicle_id = v.id;
