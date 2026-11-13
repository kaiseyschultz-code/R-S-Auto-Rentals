import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireStaff } from "@/lib/crm/session";
import { day, daysAgo, daysBetween, dollars, fullName, today } from "@/lib/crm/format";
import type { DashboardKpis, VehicleRoi } from "@/lib/crm/types";
import { Badge, ButtonLink, Card, EmptyState, Notice, rowLink, Table, td } from "@/components/crm/ui";
import { rows } from "@/lib/crm/rows";

type RentalRow = {
  id: string;
  status: string;
  pickup_date: string;
  return_date: string;
  customer: { first_name: string; last_name: string; phone: string | null } | null;
  vehicle: { name: string; plate: string | null } | null;
  inspections?: { kind: string; status: string }[];
};

type ReviewRow = {
  id: string;
  kind: string;
  rental_id: string;
  completed_at: string;
  rental: { vehicle: { name: string } | null; customer: { first_name: string; last_name: string } | null } | null;
};

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { error } = await searchParams;
  const staff = await requireStaff();
  const finance = canSeeFinance(staff);
  const supabase = await createClient();
  const now = today();

  const monthAgo = daysAgo(30);
  const [kpisRes, liveRes, upcomingRes, roiRes, returnedRes, reviewRes] = await Promise.all([
    supabase.from("dashboard_kpis").select("*").maybeSingle<DashboardKpis>(),
    supabase
      .from("rentals")
      .select("id, status, pickup_date, return_date, customer:customers(first_name,last_name,phone), vehicle:vehicles(name,plate), inspections(kind,status)")
      .in("status", ["active", "overdue"])
      .order("return_date"),
    supabase
      .from("rentals")
      .select("id, status, pickup_date, return_date, customer:customers(first_name,last_name,phone), vehicle:vehicles(name,plate)")
      .eq("status", "pending")
      .order("pickup_date")
      .limit(8),
    finance
      ? supabase.from("vehicle_roi").select("*").order("name")
      : Promise.resolve({ data: null }),
    supabase
      .from("rentals")
      .select("id, status, pickup_date, return_date, customer:customers(first_name,last_name,phone), vehicle:vehicles(name,plate), inspections(kind,status)")
      .eq("status", "returned")
      .gte("return_date", monthAgo),
    supabase
      .from("inspections")
      .select("id, kind, rental_id, completed_at, rental:rentals(vehicle:vehicles(name), customer:customers(first_name,last_name))")
      .eq("status", "completed")
      .eq("staff_review", "pending")
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  const k = kpisRes.data;
  const live = rows<RentalRow>(liveRes.data);
  const upcoming = rows<RentalRow>(upcomingRes.data);
  const roi = roiRes.data as VehicleRoi[] | null;
  const done = (r: RentalRow, kind: string) => (r.inspections ?? []).some((i) => i.kind === kind && i.status === "completed");
  const chase = [
    ...live.filter((r) => !done(r, "pickup")).map((r) => ({ r, what: "No pickup inspection" })),
    ...rows<RentalRow>(returnedRes.data).filter((r) => !done(r, "return")).map((r) => ({ r, what: "No return inspection" })),
  ];
  const toReview = rows<ReviewRow>(reviewRes.data);
  const lateOrDue = live.filter((r) => daysBetween(now, r.return_date) <= 2);

  const stats = [
    { label: "Active rentals", value: k?.active_rentals ?? 0, href: "/admin/rentals?status=active" },
    { label: "Overdue rentals", value: k?.overdue_rentals ?? 0, href: "/admin/rentals?status=overdue", alert: (k?.overdue_rentals ?? 0) > 0 },
    { label: "Cars available", value: k?.available_vehicles ?? 0, href: "/admin/vehicles?status=available" },
    { label: "Open leads", value: k?.open_leads ?? 0, href: "/admin/leads" },
    ...(finance
      ? [
          { label: "Revenue this month", value: dollars(k?.monthly_revenue ?? 0), href: "/admin/invoices?status=paid" },
          {
            label: "Overdue invoices",
            value: `${k?.overdue_invoices ?? 0} · ${dollars(k?.overdue_amount ?? 0)}`,
            href: "/admin/invoices?status=overdue",
            alert: (k?.overdue_invoices ?? 0) > 0,
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Hi{staff.full_name ? `, ${staff.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-ink/60">Here&apos;s the fleet today, {day(now)}.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/admin/rentals/new">New rental</ButtonLink>
          <ButtonLink href="/admin/leads/new" variant="secondary">
            Add lead
          </ButtonLink>
        </div>
      </div>

      {error === "finance-only" && <Notice tone="error">Invoices and expenses are for owners and managers.</Notice>}
      {error === "owner-only" && <Notice tone="error">Only the owner can manage the team.</Notice>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-brand ${
              s.alert ? "border-rose-200" : "border-black/5"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{s.label}</p>
            <p className={`mt-2 text-xl font-semibold ${s.alert ? "text-rose-700" : "text-ink"}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Due back soon or late" action={<Link href="/admin/rentals" className="text-xs font-semibold text-brand-dark">All rentals</Link>}>
          {lateOrDue.length === 0 ? (
            <EmptyState>Nothing due back in the next two days.</EmptyState>
          ) : (
            <ul className="divide-y divide-black/5">
              {lateOrDue.map((r) => {
                const diff = daysBetween(now, r.return_date);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/rentals/${r.id}`} className={rowLink}>
                        {r.vehicle?.name ?? "Vehicle"}
                      </Link>
                      <p className="truncate text-xs text-ink/60">
                        {fullName(r.customer)} {r.customer?.phone ? `· ${r.customer.phone}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${diff < 0 ? "text-rose-700" : "text-ink/70"}`}>
                      {diff < 0 ? `${-diff} day${diff === -1 ? "" : "s"} late` : diff === 0 ? "Due today" : `Due ${day(r.return_date)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Upcoming pickups" action={<Link href="/admin/rentals?status=pending" className="text-xs font-semibold text-brand-dark">All pending</Link>}>
          {upcoming.length === 0 ? (
            <EmptyState>No pending bookings.</EmptyState>
          ) : (
            <ul className="divide-y divide-black/5">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/rentals/${r.id}`} className={rowLink}>
                      {fullName(r.customer)}
                    </Link>
                    <p className="truncate text-xs text-ink/60">{r.vehicle?.name}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-ink/70">{day(r.pickup_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(chase.length > 0 || toReview.length > 0) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title={`Inspections missing (${chase.length})`}>
            {chase.length === 0 ? (
              <EmptyState>Every car out or recently back has its inspection.</EmptyState>
            ) : (
              <ul className="divide-y divide-black/5">
                {chase.slice(0, 8).map(({ r, what }) => (
                  <li key={r.id + what} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/rentals/${r.id}`} className={rowLink}>
                        {r.vehicle?.name ?? "Vehicle"}
                      </Link>
                      <p className="truncate text-xs text-ink/60">{fullName(r.customer)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-amber-700">{what}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={`Inspections to review (${toReview.length})`}>
            {toReview.length === 0 ? (
              <EmptyState>Nothing waiting for review.</EmptyState>
            ) : (
              <ul className="divide-y divide-black/5">
                {toReview.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/rentals/${i.rental_id}/inspection`} className={rowLink}>
                        {i.rental?.vehicle?.name ?? "Vehicle"}
                      </Link>
                      <p className="truncate text-xs capitalize text-ink/60">
                        {i.kind} · {fullName(i.rental?.customer)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink/60">{day(i.completed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {finance && roi && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-ink">Fleet return on investment</h2>
          <Table head={["Vehicle", "Status", "Rentals", "Revenue (paid)", "Running costs", "Net incl. purchase"]}>
            {roi.map((v) => (
              <tr key={v.id}>
                <td className={td}>
                  <Link href={`/admin/vehicles/${v.id}`} className={rowLink}>
                    {v.name}
                  </Link>
                </td>
                <td className={td}>
                  <Badge value={v.status} />
                </td>
                <td className={td}>{v.total_rentals}</td>
                <td className={td}>{dollars(v.revenue)}</td>
                <td className={td}>{dollars(v.operating_cost)}</td>
                <td className={`${td} font-semibold ${v.net_position < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {dollars(v.net_position)}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
