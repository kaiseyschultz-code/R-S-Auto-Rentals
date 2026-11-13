// Display helpers for CRM values. Database money columns are dollars
// (numeric), unlike Square's cents; see lib/format.ts for those.

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function dollars(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return usd.format(Number(value));
}

/** "2026-11-13" → "Nov 13, 2026". Parsed as a calendar date, not a moment, so it never shifts by timezone. */
export function day(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date in Port Saint Lucie (America/New_York), as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from.slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(to.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export function fullName(c: { first_name: string; last_name: string } | null | undefined): string {
  return c ? `${c.first_name} ${c.last_name}` : "—";
}

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/^\w/, (ch) => ch.toUpperCase());
}

/** The date `n` days before today (America/New_York), as YYYY-MM-DD. */
export function daysAgo(n: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(Date.now() - n * 86_400_000));
}
