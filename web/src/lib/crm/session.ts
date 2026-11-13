import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StaffUser } from "./types";

/**
 * The signed-in staff member, or a redirect to the login page.
 * A login with no active staff profile can't use the CRM (RLS would show
 * it nothing anyway), so it's sent back to login with an explanation.
 */
export const requireStaff = cache(async (): Promise<StaffUser> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/admin/login");

  const { data: staff } = await supabase
    .from("users")
    .select("id, tenant_id, email, full_name, role, is_active, created_at")
    .eq("id", userId)
    .maybeSingle<StaffUser>();

  if (!staff || !staff.is_active) redirect("/admin/login?error=no-access");
  return staff;
});

export function canSeeFinance(staff: StaffUser): boolean {
  return staff.role === "owner" || staff.role === "manager";
}

/** For finance pages and actions: staff role gets bounced to the dashboard. */
export async function requireFinance(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!canSeeFinance(staff)) redirect("/admin?error=finance-only");
  return staff;
}

export async function requireOwner(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (staff.role !== "owner") redirect("/admin?error=owner-only");
  return staff;
}
