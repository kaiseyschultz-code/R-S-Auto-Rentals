-- ============================================================
-- R&S AUTO RENTALS — MIGRATION 4: INDEXES
-- (UNIQUE constraints in migration 1 already create indexes for the
-- Square ID columns, VIN and invoice_number.)
-- ============================================================

CREATE INDEX idx_users_tenant              ON public.users             (tenant_id);
CREATE INDEX idx_vehicles_status           ON public.vehicles          (tenant_id, status);
CREATE INDEX idx_customers_search          ON public.customers         (tenant_id, last_name, first_name);
CREATE INDEX idx_customers_email           ON public.customers         (tenant_id, lower(email));
CREATE INDEX idx_customers_phone           ON public.customers         (tenant_id, phone);
CREATE INDEX idx_rentals_status            ON public.rentals           (tenant_id, status);
CREATE INDEX idx_rentals_customer          ON public.rentals           (customer_id);
CREATE INDEX idx_rentals_vehicle           ON public.rentals           (vehicle_id);
CREATE INDEX idx_rentals_dates             ON public.rentals           (tenant_id, pickup_date, return_date);
CREATE INDEX idx_invoices_status           ON public.invoices          (tenant_id, status);
CREATE INDEX idx_invoices_customer         ON public.invoices          (customer_id);
CREATE INDEX idx_invoices_rental           ON public.invoices          (rental_id);
CREATE INDEX idx_invoices_square_order     ON public.invoices          (square_order_id);
CREATE INDEX idx_expenses_tenant_date      ON public.expenses          (tenant_id, expense_date DESC);
CREATE INDEX idx_expenses_vehicle          ON public.expenses          (vehicle_id);
CREATE INDEX idx_leads_tenant_stage        ON public.leads             (tenant_id, stage);
CREATE INDEX idx_leads_assigned            ON public.leads             (assigned_to);
CREATE INDEX idx_agreements_status         ON public.rental_agreements (tenant_id, status);
CREATE INDEX idx_agreements_rental         ON public.rental_agreements (rental_id);
CREATE INDEX idx_activity_tenant_created   ON public.activity_log      (tenant_id, created_at DESC);
CREATE INDEX idx_activity_entity           ON public.activity_log      (entity_type, entity_id);
CREATE INDEX idx_social_posts_tenant_sched ON public.social_posts      (tenant_id, scheduled_at);
