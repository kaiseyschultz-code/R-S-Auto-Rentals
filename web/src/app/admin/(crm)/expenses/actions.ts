"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { today } from "@/lib/crm/format";
import { date, errorMessage, FormError, money, oneOf, text, type ActionState } from "@/lib/crm/form";
import { EXPENSE_CATEGORIES } from "@/lib/crm/types";

export async function saveExpense(
  id: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireFinance();

  try {
    const amount = money(fd, "amount");
    if (amount === null) throw new FormError("Amount is required.");
    const row = {
      vehicle_id: text(fd, "vehicle_id"),
      category: oneOf(fd, "category", EXPENSE_CATEGORIES),
      description: text(fd, "description"),
      amount,
      expense_date: date(fd, "expense_date") ?? today(),
      receipt_url: text(fd, "receipt_url"),
    };

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("expenses").update(row).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "expense", id, "updated");
    } else {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...row, tenant_id: staff.tenant_id, created_by: staff.id })
        .select("id")
        .single();
      if (error) throw error;
      await logActivity(supabase, "expense", data.id, "created", { amount, category: row.category });
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/expenses?saved=1");
}
