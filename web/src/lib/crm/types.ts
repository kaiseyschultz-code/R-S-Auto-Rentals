// Row shapes for the CRM tables in supabase/migrations. Hand-written; keep in
// sync with the schema (or replace with `supabase gen types typescript`).

export type Role = "owner" | "manager" | "staff";

export type StaffUser = {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export const VEHICLE_STATUSES = ["available", "rented", "service", "inactive"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export type Vehicle = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  plate: string | null;
  color: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  mileage: number;
  platforms: string[] | null;
  status: VehicleStatus;
  photo_url: string | null;
  notes: string | null;
  square_item_id: string | null;
  square_daily_variation_id: string | null;
  square_weekly_variation_id: string | null;
};

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  id_type: "license" | "passport" | "state_id" | null;
  id_expiry: string | null;
  id_verified: boolean;
  insurance_carrier: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relation: string | null;
  is_gig_worker: boolean;
  gig_platforms: string[] | null;
  is_flagged: boolean;
  flag_reason: string | null;
  notes: string | null;
  square_customer_id: string | null;
  created_at: string;
};

export const RENTAL_STATUSES = ["pending", "active", "overdue", "returned", "cancelled"] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];
export const BOOKING_SOURCES = ["manual", "web", "phone", "walk_in"] as const;

export type Rental = {
  id: string;
  customer_id: string;
  vehicle_id: string;
  status: RentalStatus;
  plan_type: "daily" | "weekly";
  rate_amount: number;
  pickup_date: string;
  return_date: string;
  actual_return_date: string | null;
  odometer_out: number | null;
  odometer_in: number | null;
  platform: string | null;
  booking_source: (typeof BOOKING_SOURCES)[number];
  square_order_id: string | null;
  notes: string | null;
  created_at: string;
};

export const INVOICE_STATUSES = ["draft", "pending", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type Invoice = {
  id: string;
  rental_id: string | null;
  customer_id: string;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string | null;
  paid_date: string | null;
  square_payment_id: string | null;
  square_payment_link_url: string | null;
  notes: string | null;
};

export const EXPENSE_CATEGORIES = [
  "purchase",
  "maintenance",
  "insurance",
  "cleaning",
  "fuel",
  "platform",
  "other",
] as const;

export type Expense = {
  id: string;
  vehicle_id: string | null;
  category: (typeof EXPENSE_CATEGORIES)[number];
  description: string | null;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
};

export const LEAD_STAGES = ["new", "contacted", "docs", "agreement", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  platform: string | null;
  stage: LeadStage;
  desired_plan: string | null;
  desired_vehicle: string | null;
  converted_to_rental_id: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
};

export type DashboardKpis = {
  monthly_revenue: number;
  active_rentals: number;
  overdue_rentals: number;
  available_vehicles: number;
  open_leads: number;
  overdue_invoices: number;
  overdue_amount: number;
};

export type VehicleRoi = {
  id: string;
  name: string;
  status: VehicleStatus;
  purchase_price: number | null;
  revenue: number;
  operating_cost: number;
  total_expenses: number;
  net_position: number;
  total_rentals: number;
};
