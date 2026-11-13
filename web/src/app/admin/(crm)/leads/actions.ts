"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { errorMessage, oneOf, requiredText, text, type ActionState } from "@/lib/crm/form";
import { LEAD_STAGES } from "@/lib/crm/types";

export async function saveLead(
  id: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();

  try {
    const row = {
      name: requiredText(fd, "name", "Name"),
      phone: text(fd, "phone"),
      email: text(fd, "email")?.toLowerCase() ?? null,
      source: text(fd, "source"),
      platform: text(fd, "platform"),
      stage: oneOf(fd, "stage", LEAD_STAGES, "new"),
      desired_plan: text(fd, "desired_plan"),
      desired_vehicle: text(fd, "desired_vehicle"),
      assigned_to: text(fd, "assigned_to"),
      notes: text(fd, "notes"),
    };

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("leads").update(row).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "lead", id, "updated", { stage: row.stage });
    } else {
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...row, tenant_id: staff.tenant_id })
        .select("id")
        .single();
      if (error) throw error;
      await logActivity(supabase, "lead", data.id, "created");
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/leads?saved=1");
}

/** One-click stage move from the pipeline board. */
export async function moveLead(id: string, fd: FormData): Promise<void> {
  await requireStaff();
  const stage = oneOf(fd, "stage", LEAD_STAGES, "new");
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
  if (!error) await logActivity(supabase, "lead", id, "stage_changed", { to: stage });
  revalidatePath("/admin/leads");
}

/**
 * Lead is ready to rent: create a customer from it, then open the new-rental
 * form. Saving that rental marks the lead won and links it (see saveRental).
 */
export async function convertLead(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  let customerId: string;

  try {
    const supabase = await createClient();
    const { data: lead, error: readError } = await supabase
      .from("leads")
      .select("name, email, phone, platform")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    const [first, ...rest] = lead.name.trim().split(/\s+/);
    const platforms = lead.platform && lead.platform.toLowerCase() !== "personal" ? [lead.platform] : null;
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        tenant_id: staff.tenant_id,
        first_name: first,
        last_name: rest.join(" ") || "—",
        email: lead.email,
        phone: lead.phone,
        is_gig_worker: Boolean(platforms),
        gig_platforms: platforms,
        notes: "Created from a lead.",
      })
      .select("id")
      .single();
    if (error) throw error;
    customerId = customer.id;
    await logActivity(supabase, "customer", customer.id, "created", { from_lead: id });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  redirect(`/admin/rentals/new?customer=${customerId}&lead=${id}`);
}
