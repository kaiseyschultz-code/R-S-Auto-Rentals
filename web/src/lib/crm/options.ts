import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Dropdown options shared by the rental, invoice, expense and lead forms.

export async function customerOptions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name, is_flagged")
    .order("last_name")
    .order("first_name");
  return (data ?? []) as { id: string; first_name: string; last_name: string; is_flagged: boolean }[];
}

export async function vehicleOptions(supabase: SupabaseClient, { includeInactive = false } = {}) {
  let query = supabase.from("vehicles").select("id, name, plate, status").order("name");
  if (!includeInactive) query = query.neq("status", "inactive");
  const { data } = await query;
  return (data ?? []) as { id: string; name: string; plate: string | null; status: string }[];
}

/** Rental total: days × daily rate, or started weeks × weekly rate. */
export function rentalTotal(r: {
  plan_type: string;
  rate_amount: number;
  pickup_date: string;
  return_date: string;
}): { periods: number; unit: string; total: number } {
  const days = Math.max(
    1,
    Math.round((Date.parse(r.return_date + "T00:00:00Z") - Date.parse(r.pickup_date + "T00:00:00Z")) / 86_400_000),
  );
  if (r.plan_type === "daily") {
    return { periods: days, unit: days === 1 ? "day" : "days", total: days * Number(r.rate_amount) };
  }
  const weeks = Math.ceil(days / 7);
  return { periods: weeks, unit: weeks === 1 ? "week" : "weeks", total: weeks * Number(r.rate_amount) };
}
