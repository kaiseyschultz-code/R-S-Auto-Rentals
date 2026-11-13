"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { today } from "@/lib/crm/format";
import {
  date,
  errorMessage,
  FormError,
  money,
  oneOf,
  requiredText,
  text,
  type ActionState,
} from "@/lib/crm/form";
import { INVOICE_STATUSES } from "@/lib/crm/types";

export async function saveInvoice(
  id: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireFinance();
  let savedId = id;

  try {
    const amount = money(fd, "amount");
    if (amount === null) throw new FormError("Amount is required.");
    const status = oneOf(fd, "status", INVOICE_STATUSES, "pending");
    let paidDate = date(fd, "paid_date");
    if (status === "paid" && !paidDate) paidDate = today();
    if (status !== "paid") paidDate = null;

    const row = {
      customer_id: requiredText(fd, "customer_id", "Customer"),
      rental_id: text(fd, "rental_id"),
      amount,
      status,
      issued_date: date(fd, "issued_date") ?? today(),
      due_date: date(fd, "due_date"),
      paid_date: paidDate,
      square_payment_link_url: text(fd, "square_payment_link_url"),
      square_payment_id: text(fd, "square_payment_id"),
      notes: text(fd, "notes"),
    };

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("invoices").update(row).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "invoice", id, "updated", { status });
    } else {
      const { data, error } = await supabase
        .from("invoices")
        .insert({ ...row, tenant_id: staff.tenant_id })
        .select("id")
        .single();
      if (error) throw error;
      savedId = data.id;
      await logActivity(supabase, "invoice", data.id, "created", { amount });
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/invoices/${savedId}?saved=1`);
}

export async function markInvoicePaid(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireFinance();
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_date: date(fd, "paid_date") ?? today(),
        square_payment_id: text(fd, "square_payment_id"),
      })
      .eq("id", id);
    if (error) throw error;
    await logActivity(supabase, "invoice", id, "status_changed", { to: "paid" });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/invoices/${id}?saved=1`);
}
