"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { today } from "@/lib/crm/format";
import {
  date,
  errorMessage,
  FormError,
  integer,
  money,
  oneOf,
  requiredText,
  text,
  type ActionState,
} from "@/lib/crm/form";
import { BOOKING_SOURCES, RENTAL_STATUSES } from "@/lib/crm/types";

export async function saveRental(
  id: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const staff = await requireStaff();
  let savedId = id;

  try {
    const pickup = date(fd, "pickup_date");
    const ret = date(fd, "return_date");
    if (!pickup || !ret) throw new FormError("Pickup and return dates are required.");
    if (ret < pickup) throw new FormError("The return date can't be before the pickup date.");
    const rate = money(fd, "rate_amount");
    if (rate === null) throw new FormError("Rate is required.");

    const row = {
      customer_id: requiredText(fd, "customer_id", "Customer"),
      vehicle_id: requiredText(fd, "vehicle_id", "Vehicle"),
      status: oneOf(fd, "status", RENTAL_STATUSES, "pending"),
      plan_type: oneOf(fd, "plan_type", ["daily", "weekly"] as const, "weekly"),
      rate_amount: rate,
      pickup_date: pickup,
      return_date: ret,
      actual_return_date: date(fd, "actual_return_date"),
      odometer_out: integer(fd, "odometer_out"),
      odometer_in: integer(fd, "odometer_in"),
      platform: text(fd, "platform"),
      booking_source: oneOf(fd, "booking_source", BOOKING_SOURCES, "manual"),
      notes: text(fd, "notes"),
    };

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("rentals").update(row).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "rental", id, "updated");
    } else {
      const { data, error } = await supabase
        .from("rentals")
        .insert({ ...row, tenant_id: staff.tenant_id })
        .select("id")
        .single();
      if (error) throw error;
      savedId = data.id;
      await logActivity(supabase, "rental", data.id, "created", { status: row.status });

      // Came from a lead's "Convert to customer": close the lead as won.
      const leadId = text(fd, "lead_id");
      if (leadId) {
        await supabase
          .from("leads")
          .update({ stage: "won", converted_to_rental_id: data.id })
          .eq("id", leadId);
        await logActivity(supabase, "lead", leadId, "stage_changed", { to: "won", rental: data.id });
      }
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/rentals/${savedId}?saved=1`);
}

/** Hand over the keys: pending → active, recording the odometer. */
export async function startRental(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  try {
    const supabase = await createClient();
    const odometer = integer(fd, "odometer_out");
    const { error } = await supabase
      .from("rentals")
      .update({ status: "active", ...(odometer !== null && { odometer_out: odometer }) })
      .eq("id", id);
    if (error) throw error;
    await logActivity(supabase, "rental", id, "status_changed", { to: "active" });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/rentals/${id}?saved=1`);
}

/** Car is back: → returned, record date + odometer, bump the vehicle's mileage. */
export async function returnRental(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  try {
    const supabase = await createClient();
    const odometer = integer(fd, "odometer_in");
    const returnedOn = date(fd, "actual_return_date") ?? today();

    const { data: rental, error: readError } = await supabase
      .from("rentals")
      .select("vehicle_id, odometer_out, vehicle:vehicles(mileage)")
      .eq("id", id)
      .single();
    if (readError) throw readError;
    if (odometer !== null && rental.odometer_out !== null && odometer < rental.odometer_out) {
      throw new FormError(`Return odometer can't be below the pickup reading (${rental.odometer_out.toLocaleString()}).`);
    }

    const { error } = await supabase
      .from("rentals")
      .update({
        status: "returned",
        actual_return_date: returnedOn,
        ...(odometer !== null && { odometer_in: odometer }),
      })
      .eq("id", id);
    if (error) throw error;

    const vehicle = rental.vehicle as unknown as { mileage: number } | null;
    if (odometer !== null && vehicle && odometer > vehicle.mileage) {
      await supabase.from("vehicles").update({ mileage: odometer }).eq("id", rental.vehicle_id);
    }
    await logActivity(supabase, "rental", id, "status_changed", { to: "returned" });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/rentals/${id}?saved=1`);
}

/** Simple status moves with no extra data (overdue, cancelled). */
export async function setRentalStatus(
  id: string,
  status: "overdue" | "cancelled",
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireStaff();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("rentals").update({ status }).eq("id", id);
    if (error) throw error;
    await logActivity(supabase, "rental", id, "status_changed", { to: status });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/rentals/${id}?saved=1`);
}
