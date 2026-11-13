import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { day, daysBetween, dollars, fullName, label, today } from "@/lib/crm/format";
import { RENTAL_STATUSES } from "@/lib/crm/types";
import { Badge, ButtonLink, EmptyState, FilterTabs, PageHeader, rowLink, Table, td } from "@/components/crm/ui";
import { rows } from "@/lib/crm/rows";

type Row = {
  id: string;
  status: string;
  plan_type: string;
  rate_amount: number;
  pickup_date: string;
  return_date: string;
  platform: string | null;
  customer: { first_name: string; last_name: string } | null;
  vehicle: { name: string; plate: string | null } | null;
};

export default async function RentalsPage({ searchParams }: PageProps<"/admin/rentals">) {
  await requireStaff();
  const { status } = await searchParams;
  const filter = typeof status === "string" && (RENTAL_STATUSES as readonly string[]).includes(status) ? status : null;
  const now = today();

  const supabase = await createClient();
  let query = supabase
    .from("rentals")
    .select("id, status, plan_type, rate_amount, pickup_date, return_date, platform, customer:customers(first_name,last_name), vehicle:vehicles(name,plate)")
    .order("pickup_date", { ascending: false })
    .limit(300);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const rentals = rows<Row>(data);

  return (
    <>
      <PageHeader
        title="Rentals"
        subtitle={`${rentals.length} ${filter ? label(filter).toLowerCase() : "total"}`}
        action={<ButtonLink href="/admin/rentals/new">New rental</ButtonLink>}
      />
      <FilterTabs base="/admin/rentals" options={RENTAL_STATUSES} current={filter} />
      {rentals.length === 0 ? (
        <EmptyState>No rentals here.</EmptyState>
      ) : (
        <Table head={["Customer", "Vehicle", "Status", "Pickup", "Return", "Rate", "Platform"]}>
          {rentals.map((r) => {
            const late = r.status === "active" && daysBetween(now, r.return_date) < 0;
            return (
              <tr key={r.id}>
                <td className={td}>
                  <Link href={`/admin/rentals/${r.id}`} className={rowLink}>
                    {fullName(r.customer)}
                  </Link>
                </td>
                <td className={td}>
                  {r.vehicle?.name}
                  {r.vehicle?.plate && <span className="ml-1 text-xs text-ink/50">{r.vehicle.plate}</span>}
                </td>
                <td className={td}>
                  <Badge value={r.status} />
                  {late && (
                    <span className="ml-2">
                      <Badge value="overdue">Late</Badge>
                    </span>
                  )}
                </td>
                <td className={td}>{day(r.pickup_date)}</td>
                <td className={td}>{day(r.return_date)}</td>
                <td className={td}>
                  {dollars(r.rate_amount)}/{r.plan_type === "daily" ? "day" : "wk"}
                </td>
                <td className={td}>{r.platform ?? "—"}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
