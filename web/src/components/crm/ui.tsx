import Link from "next/link";
import type { ReactNode } from "react";
import { label } from "@/lib/crm/format";

// Server-safe building blocks for the staff CRM. Styling follows the public
// site: ink text, brand accent, soft black/5 borders.

export const inputClass =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:bg-black/5";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:bg-brand-dark"
      : "border border-black/10 bg-white text-ink hover:border-brand";
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/40">{hint}</span>}
    </label>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-black/20 accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-black/5 pt-5 first:border-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

const badgeColors: Record<string, string> = {
  // vehicles
  available: "bg-emerald-50 text-emerald-700",
  rented: "bg-sky-50 text-sky-700",
  service: "bg-amber-50 text-amber-700",
  inactive: "bg-black/5 text-ink/50",
  // rentals
  pending: "bg-amber-50 text-amber-700",
  active: "bg-sky-50 text-sky-700",
  overdue: "bg-rose-50 text-rose-700",
  returned: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-black/5 text-ink/50",
  // invoices
  draft: "bg-black/5 text-ink/60",
  paid: "bg-emerald-50 text-emerald-700",
  // leads
  new: "bg-sky-50 text-sky-700",
  contacted: "bg-indigo-50 text-indigo-700",
  docs: "bg-amber-50 text-amber-700",
  agreement: "bg-violet-50 text-violet-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-black/5 text-ink/50",
  // roles
  owner: "bg-ink text-white",
  manager: "bg-indigo-50 text-indigo-700",
  staff: "bg-black/5 text-ink/70",
};

export function Badge({ value, children }: { value: string; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        badgeColors[value] ?? "bg-black/5 text-ink/70"
      }`}
    >
      {children ?? value.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-ink/50">
      {children}
    </p>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-brand/10 text-brand-dark",
    error: "bg-rose-50 text-rose-700",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];
  return <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${styles}`}>{children}</p>;
}

/** Scrollable table shell; rows are plain <tr>/<td>. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-black/5 bg-black/[0.02] text-xs uppercase tracking-wide text-ink/50">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "whitespace-nowrap px-4 py-3 text-ink/80";
export const rowLink = "font-semibold text-ink hover:text-brand-dark";

/** Status filter pills that set ?status= on a list page. */
export function FilterTabs({
  base,
  options,
  current,
}: {
  base: string;
  options: readonly string[];
  current: string | null;
}) {
  const tab = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition ${
      active ? "bg-ink text-white" : "bg-white text-ink/60 border border-black/10 hover:text-ink"
    }`;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link href={base} className={tab(current === null)}>
        All
      </Link>
      {options.map((o) => (
        <Link key={o} href={`${base}?status=${o}`} className={tab(current === o)}>
          {label(o)}
        </Link>
      ))}
    </div>
  );
}
