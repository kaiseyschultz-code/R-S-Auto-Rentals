# Archived SQL drafts

The original CRM schema drafts, kept for reference only. **Do not run these.**

They were replaced on 2026-11-13 by `supabase/migrations/*.sql` and `supabase/seed.sql`, which fix:
staff being able to read invoices and expenses, recursive and self-promoting `users` policies,
inflated dashboard/ROI totals, views that leaked across tenants, invalid seed UUIDs, colliding
invoice numbers, and Stripe/Shopify fields (payments are Square only).

`schema2-sql.txt` and `001_functions-sql.txt` were already stale duplicates that defined
`auth.tenant_id()`, which Supabase does not allow.
