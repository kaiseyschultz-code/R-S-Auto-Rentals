import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findInspectionByToken } from "@/lib/inspections/server";
import { ANGLE_IDS, FUEL_LEVELS } from "@/lib/inspections/angles";

type Body = {
  odometer?: unknown;
  fuel_level?: unknown;
  confirm?: unknown;
  renter_name?: unknown;
  signature?: unknown;
};

const MAX_SIGNATURE_CHARS = 300_000; // ~220 KB PNG data URL

/** Renter finishes: readings, condition statement, signature. Closes the link for good. */
export async function POST(request: Request, ctx: RouteContext<"/api/inspect/[token]/complete">) {
  if (!isSupabaseConfigured()) return error("Inspections aren't available right now.", 503);
  const { token } = await ctx.params;

  const lookup = await findInspectionByToken(token);
  if (!lookup.ok) return error("This link is no longer valid.", lookup.reason === "not_found" ? 404 : 410);
  const inspection = lookup.inspection;

  const missing = ANGLE_IDS.filter((a) => !inspection.photos.includes(a));
  if (missing.length) return error(`Please take the remaining photos first (${missing.length} left).`, 400);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error("Couldn't read the form.", 400);
  }

  const odometer = Number(body.odometer);
  if (!Number.isInteger(odometer) || odometer < 0 || odometer > 2_000_000) return error("Enter the odometer reading in miles.", 400);
  const fuel = FUEL_LEVELS.find((f) => f.id === body.fuel_level)?.id;
  if (!fuel) return error("Choose the fuel level.", 400);
  if (body.confirm !== true) return error("Please confirm the condition statement.", 400);
  const name = typeof body.renter_name === "string" ? body.renter_name.trim().slice(0, 120) : "";
  if (name.length < 2) return error("Type your full name.", 400);

  let signature: string | null = null;
  if (typeof body.signature === "string" && body.signature) {
    if (!body.signature.startsWith("data:image/png;base64,") || body.signature.length > MAX_SIGNATURE_CHARS) {
      return error("The drawn signature couldn't be saved. Clear it and try again, or leave it blank.", 400);
    }
    signature = body.signature;
  }

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("inspections")
    .update({
      status: "completed",
      odometer,
      fuel_level: fuel,
      renter_name: name,
      renter_signature: signature,
      confirmed_at: now,
      completed_at: now,
      started_at: inspection.status === "sent" ? now : undefined,
    })
    .eq("id", inspection.id)
    .neq("status", "completed") // single use: a second submit changes nothing
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("inspection complete failed:", updateError.message);
    return error("Couldn't submit. Please try again.", 502);
  }
  if (!data) return error("This report was already submitted.", 410);

  // Keep the fleet mileage current from the renter's reading (only ever upward).
  const { data: rental } = await admin
    .from("rentals")
    .select("vehicle_id, vehicle:vehicles(mileage)")
    .eq("id", inspection.rental_id)
    .maybeSingle();
  const mileage = (rental?.vehicle as unknown as { mileage: number } | null)?.mileage;
  if (rental && mileage !== undefined && odometer > mileage) {
    await admin.from("vehicles").update({ mileage: odometer }).eq("id", rental.vehicle_id);
  }

  return NextResponse.json({ ok: true });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
