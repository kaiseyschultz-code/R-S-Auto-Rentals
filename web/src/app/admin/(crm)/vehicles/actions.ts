"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import {
  date,
  errorMessage,
  integer,
  list,
  money,
  oneOf,
  requiredText,
  text,
  type ActionState,
} from "@/lib/crm/form";
import { VEHICLE_STATUSES } from "@/lib/crm/types";

export async function saveVehicle(
  id: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  let savedId = id;

  try {
    const year = integer(fd, "year");
    const row = {
      name: requiredText(fd, "name", "Display name"),
      make: text(fd, "make"),
      model: text(fd, "model"),
      year,
      color: text(fd, "color"),
      vin: text(fd, "vin")?.toUpperCase() ?? null,
      plate: text(fd, "plate")?.toUpperCase() ?? null,
      mileage: integer(fd, "mileage") ?? 0,
      purchase_price: money(fd, "purchase_price"),
      purchase_date: date(fd, "purchase_date"),
      platforms: list(fd, "platforms"),
      status: oneOf(fd, "status", VEHICLE_STATUSES, "available"),
      photo_url: text(fd, "photo_url"),
      notes: text(fd, "notes"),
      square_item_id: text(fd, "square_item_id"),
      square_daily_variation_id: text(fd, "square_daily_variation_id"),
      square_weekly_variation_id: text(fd, "square_weekly_variation_id"),
    };

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("vehicles").update(row).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "vehicle", id, "updated");
    } else {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({ ...row, tenant_id: staff.tenant_id })
        .select("id")
        .single();
      if (error) throw error;
      savedId = data.id;
      await logActivity(supabase, "vehicle", data.id, "created", { name: row.name });
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin/vehicles");
  redirect(`/admin/vehicles/${savedId}?saved=1`);
}
