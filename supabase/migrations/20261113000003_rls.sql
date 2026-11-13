-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 3: ROW LEVEL SECURITY
-- ============================================================
-- Every row belongs to a tenant; public.tenant_id() returns the
-- logged-in user's tenant. Postgres combines policies with OR, so
-- each table has exactly the policies it needs and no broader one
-- that would undo a stricter rule.
-- The server (service_role key) bypasses RLS entirely — use it only
-- in API routes and webhooks, never in the browser.
-- ============================================================

ALTER TABLE public.tenants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters    ENABLE ROW LEVEL SECURITY;  -- no policies: trigger-only
ALTER TABLE public.expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_agreements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts        ENABLE ROW LEVEL SECURITY;

-- ── TENANTS ──────────────────────────────────────────────────
CREATE POLICY tenants_select ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.tenant_id());

CREATE POLICY tenants_owner_update ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.tenant_id() AND public.user_role() = 'owner')
  WITH CHECK (id = public.tenant_id());

-- ── USERS ────────────────────────────────────────────────────
-- Everyone sees their colleagues. Owners manage staff. Anyone may
-- edit their own profile (the guard trigger blocks role changes).
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (tenant_id = public.tenant_id());

CREATE POLICY users_owner_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.tenant_id() AND public.user_role() = 'owner');

CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING (tenant_id = public.tenant_id()
         AND (id = auth.uid() OR public.user_role() = 'owner'))
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY users_owner_delete ON public.users
  FOR DELETE TO authenticated
  USING (tenant_id = public.tenant_id() AND public.user_role() = 'owner'
         AND id <> auth.uid());

-- ── OPERATIONAL TABLES: whole team, read + write ─────────────
CREATE POLICY vehicles_tenant ON public.vehicles
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY customers_tenant ON public.customers
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY rentals_tenant ON public.rentals
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY leads_tenant ON public.leads
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY agreements_tenant ON public.rental_agreements
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY sequences_tenant ON public.follow_up_sequences
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

CREATE POLICY social_posts_tenant ON public.social_posts
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

-- ── FINANCE: owner and manager only ──────────────────────────
CREATE POLICY invoices_finance ON public.invoices
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id() AND public.is_finance_user())
  WITH CHECK (tenant_id = public.tenant_id() AND public.is_finance_user());

CREATE POLICY expenses_finance ON public.expenses
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id() AND public.is_finance_user())
  WITH CHECK (tenant_id = public.tenant_id() AND public.is_finance_user());

-- ── ACTIVITY LOG: append-only ────────────────────────────────
CREATE POLICY activity_select ON public.activity_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.tenant_id());

CREATE POLICY activity_insert ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.tenant_id()
              AND (user_id IS NULL OR user_id = auth.uid()));
