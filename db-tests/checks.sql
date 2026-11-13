\set ON_ERROR_STOP 0
\pset footer off
-- second tenant + staff accounts
INSERT INTO tenants (id,name,slug) VALUES ('a1b2c3d4-0000-0000-0000-000000000002','Other Co','other');
INSERT INTO auth.users (id,email,raw_app_meta_data) VALUES
 ('00000000-0000-0000-0000-00000000000a','owner@x', '{"tenant_id":"a1b2c3d4-0000-0000-0000-000000000001","role":"owner"}'),
 ('00000000-0000-0000-0000-00000000000b','staff@x', '{"tenant_id":"a1b2c3d4-0000-0000-0000-000000000001"}'),
 ('00000000-0000-0000-0000-00000000000c','other@x', '{"tenant_id":"a1b2c3d4-0000-0000-0000-000000000002","role":"owner"}');
-- public sign-up trying to grant itself owner via user metadata: must get NO profile
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-00000000000d','evil@x','{"tenant_id":"a1b2c3d4-0000-0000-0000-000000000001","role":"owner"}');
SELECT 'profiles' t, email, role FROM users ORDER BY email;
INSERT INTO invoices (tenant_id, customer_id, amount) VALUES ('a1b2c3d4-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001',1);
SELECT 'other-tenant invoice number (expect INV-0001, no clash)' t, invoice_number FROM invoices WHERE tenant_id='a1b2c3d4-0000-0000-0000-000000000002';
DELETE FROM invoices WHERE tenant_id='a1b2c3d4-0000-0000-0000-000000000002';

SELECT 'KPIs as superuser (expect revenue 199 this month unless month rolled, 2 active, 1 overdue inv 179)' t, * FROM dashboard_kpis WHERE tenant_id='a1b2c3d4-0000-0000-0000-000000000001';
SELECT 'ROI' t, name, status, revenue, total_expenses, net_position, total_rentals FROM vehicle_roi ORDER BY name;

-- double booking must fail
INSERT INTO rentals (tenant_id,customer_id,vehicle_id,status,rate_amount,pickup_date,return_date)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','pending',199,CURRENT_DATE,CURRENT_DATE+3);

-- ===== as STAFF =====
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
SELECT 'staff sees invoices (expect 0)' t, count(*) FROM invoices;
SELECT 'staff sees expenses (expect 0)' t, count(*) FROM expenses;
SELECT 'staff sees vehicles (expect 3)' t, count(*) FROM vehicles;
SELECT 'staff KPI revenue (expect 0) / active (expect 2)' t, monthly_revenue, active_rentals FROM dashboard_kpis;
UPDATE users SET role='owner' WHERE id='00000000-0000-0000-0000-00000000000b';  -- expect error
UPDATE users SET full_name='Staff Person' WHERE id='00000000-0000-0000-0000-00000000000b';
SELECT 'staff renamed self' t, full_name, role FROM users WHERE id='00000000-0000-0000-0000-00000000000b';
INSERT INTO invoices (tenant_id,customer_id,amount) VALUES ('a1b2c3d4-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',5); -- expect RLS error
SELECT log_activity('vehicle','b1000000-0000-0000-0000-000000000001','viewed');
SELECT 'activity rows' t, count(*) FROM activity_log;
RESET ROLE;

-- ===== as OWNER =====
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
SELECT 'owner sees invoices (expect 3)' t, count(*) FROM invoices;
SELECT 'owner KPI' t, monthly_revenue, overdue_amount FROM dashboard_kpis;
UPDATE users SET role='manager' WHERE id='00000000-0000-0000-0000-00000000000b';
SELECT 'owner promoted staff' t, role FROM users WHERE id='00000000-0000-0000-0000-00000000000b';
RESET ROLE;

-- ===== as OTHER TENANT =====
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
SELECT 'other tenant sees R&S vehicles/customers/kpis (expect 0,0,1 row own)' t,
  (SELECT count(*) FROM vehicles),(SELECT count(*) FROM customers),(SELECT count(*) FROM dashboard_kpis);
RESET ROLE;

-- ===== anon / evil signup =====
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
SELECT 'evil signup sees (expect 0,0)' t, (SELECT count(*) FROM vehicles),(SELECT count(*) FROM users);
RESET ROLE;

-- return car → vehicle available
UPDATE rentals SET status='returned' WHERE id='d1000000-0000-0000-0000-000000000001';
SELECT 'camry after return (expect available)' t, status FROM vehicles WHERE id='b1000000-0000-0000-0000-000000000001';
