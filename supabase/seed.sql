-- ============================================================
-- R&S AUTO RENTALS — SEED DATA (sample data for dev/testing)
-- Runs after all migrations (`supabase db reset` runs it
-- automatically). Rental dates are relative to today so the sample
-- "active" rentals stay current.
-- ============================================================

-- ── R&S TENANT ───────────────────────────────────────────────
INSERT INTO public.tenants (id, name, slug, email, phone, city, state, zip, plan)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'R&S Auto Rentals',
  'rs-auto-rentals',
  'admin@rsautorentals.com',
  '(772) 555-0100',
  'Port Saint Lucie',
  'FL',
  '34953',
  'pro'
);

-- ── OWNER USER ───────────────────────────────────────────────
-- Create your login first (Supabase Dashboard → Authentication →
-- Users → Add user), copy its UUID, then run this in the SQL Editor:
--
-- INSERT INTO public.users (id, tenant_id, email, full_name, role)
-- VALUES ('YOUR_USER_UUID_HERE', 'a1b2c3d4-0000-0000-0000-000000000001',
--         'you@example.com', 'Your Name', 'owner');

-- ── VEHICLES ─────────────────────────────────────────────────
INSERT INTO public.vehicles (id, tenant_id, name, make, model, year, vin, plate, purchase_price, purchase_date, mileage, platforms, status)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Toyota Camry', 'Toyota', 'Camry', 2022, 'SAMPLE-VIN-0001', 'FL ABC-1234',
   18500.00, '2024-11-01', 41200, ARRAY['Uber','Lyft'], 'available'),
  ('b1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Ford Fusion', 'Ford', 'Fusion', 2021, 'SAMPLE-VIN-0002', 'FL XYZ-5678',
   14200.00, '2024-12-01', 38800, ARRAY['DoorDash','Lyft'], 'available'),
  ('b1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Honda Odyssey', 'Honda', 'Odyssey', 2020, 'SAMPLE-VIN-0003', 'FL MNO-9012',
   21000.00, '2025-02-15', 52300, ARRAY['Uber'], 'available');

-- ── SAMPLE CUSTOMERS ─────────────────────────────────────────
INSERT INTO public.customers (id, tenant_id, first_name, last_name, email, phone, is_gig_worker, gig_platforms)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Marcus', 'T.', 'marcus.t@example.com', '(772) 555-0101', true, ARRAY['Uber']),
  ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Janelle', 'R.', 'janelle.r@example.com', '(772) 555-0102', true, ARRAY['DoorDash']),
  ('c1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Priya', 'S.', 'priya.s@example.com', '(561) 555-0103', false, NULL);

-- ── SAMPLE RENTALS (trigger marks the vehicles as rented) ────
INSERT INTO public.rentals (id, tenant_id, customer_id, vehicle_id, status, plan_type, rate_amount, pickup_date, return_date, platform, booking_source)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'active', 'weekly', 199.00, CURRENT_DATE - 6, CURRENT_DATE + 8, 'Uber', 'manual'),
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002',
   'active', 'weekly', 179.00, CURRENT_DATE - 9, CURRENT_DATE + 5, 'DoorDash', 'web'),
  ('d1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003',
   'returned', 'daily', 45.00, CURRENT_DATE - 30, CURRENT_DATE - 27, 'Personal', 'phone');

-- ── SAMPLE INVOICES (numbers are generated: INV-0001...) ─────
INSERT INTO public.invoices (tenant_id, rental_id, customer_id, amount, status, issued_date, due_date, paid_date)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003',
   'c1000000-0000-0000-0000-000000000003', 135.00, 'paid', CURRENT_DATE - 30, CURRENT_DATE - 30, CURRENT_DATE - 30),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 199.00, 'paid', CURRENT_DATE - 6, CURRENT_DATE - 6, CURRENT_DATE - 6),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002', 179.00, 'overdue', CURRENT_DATE - 9, CURRENT_DATE - 2, NULL);

-- ── SAMPLE EXPENSES ──────────────────────────────────────────
INSERT INTO public.expenses (tenant_id, vehicle_id, category, description, amount, expense_date)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'purchase',    'Vehicle purchase',   18500.00, '2024-11-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'insurance',   'Monthly insurance',    240.00, CURRENT_DATE - 12),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'maintenance', 'Oil change + tires',   320.00, CURRENT_DATE - 60),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'purchase',    'Vehicle purchase',   14200.00, '2024-12-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'insurance',   'Monthly insurance',    210.00, CURRENT_DATE - 12),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'maintenance', 'Brake pads',           180.00, CURRENT_DATE - 45);

-- ── SAMPLE LEADS ─────────────────────────────────────────────
INSERT INTO public.leads (tenant_id, name, phone, source, platform, stage, desired_plan)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Devon K.', '(772) 555-0111', 'website',  'Uber',     'new',       'weekly'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Alicia M.', '(772) 555-0112', 'referral', 'DoorDash', 'contacted', 'weekly');

-- ── DEFAULT FOLLOW-UP SEQUENCES ──────────────────────────────
INSERT INTO public.follow_up_sequences (tenant_id, name, trigger_event, steps)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Abandoned Inquiry', 'no_reply_24h', '[
    {"delay_hours": 24,  "channel": "sms",   "template": "Hi {name}, still interested in renting with R&S? We have vehicles available this week. Reply or call (772) 555-0100."},
    {"delay_hours": 72,  "channel": "sms",   "template": "Last chance — {name}, our {vehicle_type} is available starting {date}. Book now: {booking_link}"},
    {"delay_hours": 168, "channel": "email", "template": "Follow-up: Your R&S rental inquiry"}
  ]'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Docs Reminder', 'docs_pending_48h', '[
    {"delay_hours": 48, "channel": "sms", "template": "Hi {name}, we still need your license photo to confirm your booking. Upload here: {upload_link}"},
    {"delay_hours": 96, "channel": "sms", "template": "{name}, your booking will be released in 24hrs if we don''t receive your docs. Upload: {upload_link}"}
  ]'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'eSign Nudge', 'esign_pending_24h', '[
    {"delay_hours": 24, "channel": "sms",   "template": "Hi {name}, please sign your R&S rental agreement to confirm your booking: {esign_link}"},
    {"delay_hours": 48, "channel": "email", "template": "Action required: Sign your rental agreement"}
  ]'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Post-Return Check-In', 'post_return_1d', '[
    {"delay_hours": 24, "channel": "sms", "template": "Hi {name}, thanks for renting with R&S! How was your experience? Reply to let us know — and book again anytime at {booking_link}"}
  ]');
