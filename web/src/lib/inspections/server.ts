import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

export const INSPECTION_BUCKET = "inspections";
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const LINK_LIFETIME_HOURS = 72;

/** 192 bits of randomness, URL-safe. */
export function newInspectionToken(): string {
  return randomBytes(24).toString("base64url");
}

export function inspectionUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/inspect/${token}`;
}

export type RenterInspection = {
  id: string;
  tenant_id: string;
  rental_id: string;
  kind: "pickup" | "return";
  status: "sent" | "in_progress" | "completed";
  token_expires_at: string;
  vehicle_name: string;
  vehicle_plate: string | null;
  renter_first_name: string;
  photos: string[]; // angles already uploaded
};

export type TokenLookup =
  | { ok: true; inspection: RenterInspection }
  | { ok: false; reason: "not_found" | "expired" | "completed" };

/**
 * Looks up an inspection by its link token for the PUBLIC renter flow.
 * Uses the secret-key client (renters have no login), so it returns only
 * what the renter's page needs: vehicle name, their first name, progress.
 */
export async function findInspectionByToken(token: string): Promise<TokenLookup> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return { ok: false, reason: "not_found" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("inspections")
    .select(
      "id, tenant_id, rental_id, kind, status, token_expires_at, rental:rentals(vehicle:vehicles(name, plate), customer:customers(first_name)), photos:inspection_photos(angle)",
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) return { ok: false, reason: "not_found" };
  if (data.status === "completed") return { ok: false, reason: "completed" };
  if (Date.parse(data.token_expires_at) < Date.now()) return { ok: false, reason: "expired" };

  const rental = data.rental as unknown as {
    vehicle: { name: string; plate: string | null } | null;
    customer: { first_name: string } | null;
  } | null;

  return {
    ok: true,
    inspection: {
      id: data.id,
      tenant_id: data.tenant_id,
      rental_id: data.rental_id,
      kind: data.kind,
      status: data.status,
      token_expires_at: data.token_expires_at,
      vehicle_name: rental?.vehicle?.name ?? "your rental",
      vehicle_plate: rental?.vehicle?.plate ?? null,
      renter_first_name: rental?.customer?.first_name ?? "",
      photos: ((data.photos ?? []) as { angle: string }[]).map((p) => p.angle),
    },
  };
}

export function isLinkExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) < Date.now();
}
