import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { label } from "@/lib/crm/format";
import { VEHICLE_STATUSES, type Vehicle } from "@/lib/crm/types";
import { Badge, ButtonLink, EmptyState, FilterTabs, PageHeader, rowLink, Table, td } from "@/components/crm/ui";
import { rows } from "@/lib/crm/rows";

export default async function VehiclesPage({ searchParams }: PageProps<"/admin/vehicles">) {
  await requireStaff();
  const { status } = await searchParams;
  const filter = typeof status === "string" && (VEHICLE_STATUSES as readonly string[]).includes(status) ? status : null;

  const supabase = await createClient();
  let query = supabase.from("vehicles").select("*").order("name");
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const vehicles = rows<Vehicle>(data);

  return (
    <>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} ${filter ? label(filter).toLowerCase() : "in the fleet"}`}
        action={<ButtonLink href="/admin/vehicles/new">Add vehicle</ButtonLink>}
      />
      <FilterTabs base="/admin/vehicles" options={VEHICLE_STATUSES} current={filter} />
      {vehicles.length === 0 ? (
        <EmptyState>No vehicles here yet.</EmptyState>
      ) : (
        <Table head={["Vehicle", "Plate", "Status", "Mileage", "Platforms", "On Square"]}>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td className={td}>
                <Link href={`/admin/vehicles/${v.id}`} className={rowLink}>
                  {v.name}
                </Link>
                <span className="ml-2 text-xs text-ink/50">{v.year ?? ""}</span>
              </td>
              <td className={td}>{v.plate ?? "—"}</td>
              <td className={td}>
                <Badge value={v.status} />
              </td>
              <td className={td}>{v.mileage.toLocaleString()} mi</td>
              <td className={td}>{v.platforms?.join(", ") ?? "—"}</td>
              <td className={td}>{v.square_item_id ? "Linked" : <span className="text-ink/40">Not linked</span>}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
