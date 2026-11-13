import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findInspectionByToken, INSPECTION_BUCKET, MAX_PHOTO_BYTES } from "@/lib/inspections/server";
import { isAngle } from "@/lib/inspections/angles";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Renter uploads one inspection photo. No login: the link token is the
 * credential, re-checked on every request. Writes with the secret key, so
 * the renter never gets database or storage access of their own.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/inspect/[token]/photo">) {
  if (!isSupabaseConfigured()) return error("Inspections aren't available right now.", 503);
  const { token } = await ctx.params;

  const lookup = await findInspectionByToken(token);
  if (!lookup.ok) {
    const msg = { not_found: "This link isn't valid.", expired: "This link has expired.", completed: "This report was already submitted." };
    return error(msg[lookup.reason], lookup.reason === "not_found" ? 404 : 410);
  }
  const inspection = lookup.inspection;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Couldn't read the upload.", 400);
  }
  const angle = form.get("angle");
  const photo = form.get("photo");
  if (!isAngle(angle)) return error("Unknown photo angle.", 400);
  if (!(photo instanceof File) || photo.size === 0) return error("No photo was attached.", 400);
  if (photo.size > MAX_PHOTO_BYTES) return error("That photo is too large (15 MB max).", 413);
  const type = photo.type || "image/jpeg";
  if (!ALLOWED_TYPES.includes(type)) return error("Please upload a photo (JPEG, PNG, WebP or HEIC).", 415);

  const bytes = Buffer.from(await photo.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type.startsWith("image/hei") ? "heic" : "jpg";
  // Tenant first: the storage read policy matches staff to this folder.
  const path = `${inspection.tenant_id}/${inspection.id}/${angle}-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(INSPECTION_BUCKET)
    .upload(path, bytes, { contentType: type, upsert: false });
  if (uploadError) {
    console.error("inspection upload failed:", uploadError.message);
    return error("Couldn't save the photo. Please try again.", 502);
  }

  // A retake replaces the row for that angle; the earlier file stays in storage as a record.
  const { error: rowError } = await admin.from("inspection_photos").upsert(
    {
      tenant_id: inspection.tenant_id,
      inspection_id: inspection.id,
      angle,
      storage_path: path,
      sha256,
      taken_at: isoOrNull(form.get("taken_at")),
      uploaded_at: new Date().toISOString(),
      lat: coord(form.get("lat"), 90),
      lng: coord(form.get("lng"), 180),
      damage_flag: false,
      damage_note: null,
    },
    { onConflict: "inspection_id,angle" },
  );
  if (rowError) {
    console.error("inspection photo row failed:", rowError.message);
    return error("Couldn't save the photo. Please try again.", 502);
  }

  if (inspection.status === "sent") {
    await admin
      .from("inspections")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", inspection.id)
      .eq("status", "sent");
  }

  return NextResponse.json({ ok: true, angle });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isoOrNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function coord(v: FormDataEntryValue | null, max: number): number | null {
  if (typeof v !== "string" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 1e6) / 1e6 : null;
}
