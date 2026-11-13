"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import {
  checkbox,
  date,
  errorMessage,
  list,
  requiredText,
  text,
  type ActionState,
} from "@/lib/crm/form";

const ID_TYPES = ["license", "passport", "state_id"] as const;

export async function saveCustomer(
  id: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  let savedId = id;

  try {
    const idType = text(fd, "id_type");
    const verified = checkbox(fd, "id_verified");
    const flagged = checkbox(fd, "is_flagged");
    const row: Record<string, unknown> = {
      first_name: requiredText(fd, "first_name", "First name"),
      last_name: requiredText(fd, "last_name", "Last name"),
      email: text(fd, "email")?.toLowerCase() ?? null,
      phone: text(fd, "phone"),
      dob: date(fd, "dob"),
      address: text(fd, "address"),
      city: text(fd, "city"),
      state: text(fd, "state")?.toUpperCase() ?? null,
      zip: text(fd, "zip"),
      id_type: idType && (ID_TYPES as readonly string[]).includes(idType) ? idType : null,
      id_expiry: date(fd, "id_expiry"),
      id_verified: verified,
      insurance_carrier: text(fd, "insurance_carrier"),
      insurance_policy: text(fd, "insurance_policy"),
      insurance_expiry: date(fd, "insurance_expiry"),
      emergency_name: text(fd, "emergency_name"),
      emergency_phone: text(fd, "emergency_phone"),
      emergency_relation: text(fd, "emergency_relation"),
      is_gig_worker: checkbox(fd, "is_gig_worker"),
      gig_platforms: list(fd, "gig_platforms"),
      is_flagged: flagged,
      flag_reason: flagged ? text(fd, "flag_reason") : null,
      notes: text(fd, "notes"),
    };
    // The full ID number is never sent to the browser; blank means "keep what's stored".
    const idNumber = text(fd, "id_number");
    if (idNumber) row.id_number = idNumber;

    const supabase = await createClient();
    if (id) {
      const { data: before } = await supabase
        .from("customers")
        .select("id_verified")
        .eq("id", id)
        .maybeSingle();
      if (verified && !before?.id_verified) row.id_verified_at = new Date().toISOString();
      if (!verified) row.id_verified_at = null;

      const { error } = await supabase.from("customers").update(row).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "customer", id, "updated");
    } else {
      if (verified) row.id_verified_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...row, tenant_id: staff.tenant_id })
        .select("id")
        .single();
      if (error) throw error;
      savedId = data.id;
      await logActivity(supabase, "customer", data.id, "created");
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${savedId}?saved=1`);
}
