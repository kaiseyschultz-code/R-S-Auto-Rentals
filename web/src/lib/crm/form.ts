// Helpers for turning <form> submissions into database rows, and database
// errors into messages staff can act on.

export type ActionState = { error: string | null };
export const initialActionState: ActionState = { error: null };

/** Trimmed text, or null when blank. */
export function text(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function requiredText(fd: FormData, name: string, label: string): string {
  const v = text(fd, name);
  if (v === null) throw new FormError(`${label} is required.`);
  return v;
}

export function money(fd: FormData, name: string): number | null {
  const v = text(fd, name);
  if (v === null) return null;
  const n = Number(v.replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new FormError(`"${v}" isn't a valid amount.`);
  return Math.round(n * 100) / 100;
}

export function integer(fd: FormData, name: string): number | null {
  const v = text(fd, name);
  if (v === null) return null;
  const n = Number(v.replace(/,/g, ""));
  if (!Number.isInteger(n) || n < 0) throw new FormError(`"${v}" isn't a whole number.`);
  return n;
}

/** <input type="date"> value (YYYY-MM-DD) or null. */
export function date(fd: FormData, name: string): string | null {
  const v = text(fd, name);
  if (v === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new FormError(`"${v}" isn't a valid date.`);
  return v;
}

export function checkbox(fd: FormData, name: string): boolean {
  return fd.get(name) === "on";
}

/** "Uber, DoorDash" → ["Uber", "DoorDash"]; blank → null. */
export function list(fd: FormData, name: string): string[] | null {
  const v = text(fd, name);
  if (v === null) return null;
  const items = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

/** Value must be one of the allowed options. */
export function oneOf<T extends string>(
  fd: FormData,
  name: string,
  options: readonly T[],
  fallback?: T,
): T {
  const v = text(fd, name);
  if (v !== null && (options as readonly string[]).includes(v)) return v as T;
  if (fallback !== undefined) return fallback;
  throw new FormError(`Choose a valid ${name.replace(/_/g, " ")}.`);
}

/** Validation problem to show the user as-is. */
export class FormError extends Error {}

type DbError = { code?: string; message: string; details?: string | null };

export function friendlyDbError(error: DbError): string {
  switch (error.code) {
    case "23P01":
      return "That vehicle is already booked for some of those dates. Pick other dates or another vehicle.";
    case "23505":
      if (error.message.includes("vin")) return "Another vehicle already has that VIN.";
      if (error.message.includes("square")) return "That Square ID is already linked to another record.";
      return "A record with those details already exists.";
    case "23514":
      if (error.message.includes("return_date")) return "The return date can't be before the pickup date.";
      return "One of the values isn't allowed. Check the form and try again.";
    case "23503":
      return "This record is linked to others (rentals, invoices…), so it can't be removed.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return `Couldn't save: ${error.message}`;
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof FormError) return e.message;
  if (e && typeof e === "object" && "message" in e) return friendlyDbError(e as DbError);
  return "Something went wrong. Please try again.";
}
