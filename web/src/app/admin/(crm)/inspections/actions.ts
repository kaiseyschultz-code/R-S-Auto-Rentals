"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireStaff } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { today } from "@/lib/crm/format";
import { errorMessage, FormError, money, oneOf, text, type ActionState } from "@/lib/crm/form";
import { ANGLE_IDS } from "@/lib/inspections/angles";
import { LINK_LIFETIME_HOURS, newInspectionToken } from "@/lib/inspections/server";

/**
 * Create the renter's inspection link for a rental, or issue a fresh one
 * (new token, new 72h window) if it was sent before but not finished.
 * Photos already taken are kept.
 */
export async function sendInspection(
  rentalId: string,
  kind: "pickup" | "return",
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();

  try {
    const supabase = await createClient();
    const token = newInspectionToken();
    const expires = new Date(Date.now() + LINK_LIFETIME_HOURS * 3_600_000).toISOString();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("inspections")
      .select("id, status")
      .eq("rental_id", rentalId)
      .eq("kind", kind)
      .maybeSingle();

    if (existing?.status === "completed") throw new FormError(`The ${kind} inspection is already completed.`);

    if (existing) {
      const { error } = await supabase
        .from("inspections")
        .update({ token, token_expires_at: expires, sent_at: now })
        .eq("id", existing.id);
      if (error) throw error;
      await logActivity(supabase, "rental", rentalId, "inspection_link_reissued", { kind });
    } else {
      const { error } = await supabase.from("inspections").insert({
        tenant_id: staff.tenant_id,
        rental_id: rentalId,
        kind,
        token,
        token_expires_at: expires,
        created_by: staff.id,
      });
      if (error) throw error;
      await logActivity(supabase, "rental", rentalId, "inspection_sent", { kind });
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath(`/admin/rentals/${rentalId}`);
  redirect(`/admin/rentals/${rentalId}?link=${kind}`);
}

/** Staff verdict on an inspection, plus per-photo damage flags. */
export async function reviewInspection(
  inspectionId: string,
  rentalId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();

  try {
    const verdict = oneOf(fd, "staff_review", ["clean", "damage"] as const);
    const notes = text(fd, "damage_notes");
    const flagged = ANGLE_IDS.filter((a) => fd.get(`flag_${a}`) === "on");
    if (verdict === "damage" && !notes && flagged.length === 0) {
      throw new FormError("Describe the damage or tick the photos that show it.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("inspections")
      .update({
        staff_review: verdict,
        damage_notes: verdict === "damage" ? notes : null,
        reviewed_by: staff.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", inspectionId);
    if (error) throw error;

    // Reset then set flags so un-ticking a photo clears it.
    const { error: clearError } = await supabase
      .from("inspection_photos")
      .update({ damage_flag: false, damage_note: null })
      .eq("inspection_id", inspectionId);
    if (clearError) throw clearError;
    for (const angle of flagged) {
      const { error: flagError } = await supabase
        .from("inspection_photos")
        .update({ damage_flag: true, damage_note: text(fd, `note_${angle}`) })
        .eq("inspection_id", inspectionId)
        .eq("angle", angle);
      if (flagError) throw flagError;
    }
    await logActivity(supabase, "rental", rentalId, "inspection_reviewed", { verdict, flagged });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/rentals/${rentalId}/inspection?saved=1`);
}

/**
 * One step from a damage finding to the money side: a damage invoice to the
 * renter (owners/managers only) and/or a repair expense on the vehicle.
 */
export async function createDamageCharges(
  rentalId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  let invoiceId: string | null = null;

  try {
    const invoiceAmount = money(fd, "invoice_amount");
    const expenseAmount = money(fd, "expense_amount");
    if (!invoiceAmount && !expenseAmount) throw new FormError("Enter an invoice amount, a repair cost, or both.");
    if (!canSeeFinance(staff)) throw new FormError("Only owners and managers can create invoices and expenses.");
    const description = text(fd, "description") ?? "Damage found at vehicle inspection";

    const supabase = await createClient();
    const { data: rental, error: readError } = await supabase
      .from("rentals")
      .select("customer_id, vehicle_id")
      .eq("id", rentalId)
      .single();
    if (readError) throw readError;

    if (invoiceAmount) {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          tenant_id: staff.tenant_id,
          rental_id: rentalId,
          customer_id: rental.customer_id,
          amount: invoiceAmount,
          status: "pending",
          issued_date: today(),
          due_date: today(),
          notes: `Damage charge: ${description}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      invoiceId = data.id;
      await logActivity(supabase, "invoice", data.id, "created", { reason: "damage", amount: invoiceAmount });
    }

    if (expenseAmount) {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          tenant_id: staff.tenant_id,
          vehicle_id: rental.vehicle_id,
          category: "maintenance",
          description: `Damage repair: ${description}`,
          amount: expenseAmount,
          expense_date: today(),
          created_by: staff.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logActivity(supabase, "expense", data.id, "created", { reason: "damage", amount: expenseAmount });
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin", "layout");
  redirect(invoiceId ? `/admin/invoices/${invoiceId}?saved=1` : `/admin/rentals/${rentalId}/inspection?charged=1`);
}
