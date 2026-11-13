import Link from "next/link";
import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import { Badge, ButtonLink, Card, EmptyState, Notice, PageHeader, rowLink } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { day, dollars, fullName } from "@/lib/crm/format";
import type { Vehicle } from "@/lib/crm/types";
import VehicleFields from "../VehicleFields";
import { saveVehicle } from "../actions";
import { rows } from "@/lib/crm/rows";

type RentalRow = {
  id: string;
  status: string;
  pickup_date: string;
  return_date: string;
  rate_amount: number;
  plan_type: string;
  customer: { first_name: string; last_name: string } | null;
};

export default async function VehiclePage({ params, searchParams }: PageProps<"/admin/vehicles/[id]">) {
  await requireStaff();
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: vehicle }, { data: rentalData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle<Vehicle>(),
    supabase
      .from("rentals")
      .select("id, status, pickup_date, return_date, rate_amount, plan_type, customer:customers(first_name,last_name)")
      .eq("vehicle_id", id)
      .order("pickup_date", { ascending: false })
      .limit(20),
  ]);
  if (!vehicle) notFound();
  const rentals = rows<RentalRow>(rentalData);

  return (
    <>
      <PageHeader
        title={vehicle.name}
        subtitle={
          <span className="flex items-center gap-2">
            <Badge value={vehicle.status} /> {vehicle.plate}
          </span>
        }
        action={<ButtonLink href={`/admin/rentals/new?vehicle=${vehicle.id}`}>Rent this vehicle</ButtonLink>}
      />
      {saved && <Notice tone="success">Saved.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CrmForm action={saveVehicle.bind(null, vehicle.id)} submitLabel="Save changes">
            <VehicleFields vehicle={vehicle} />
          </CrmForm>
          <p className="mt-4 text-xs text-ink/40">
            To retire a vehicle, set its status to Inactive. Records are never deleted, so its history and
            ROI stay intact.
          </p>
        </Card>

        <Card title="Rental history">
          {rentals.length === 0 ? (
            <EmptyState>No rentals yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-black/5">
              {rentals.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/admin/rentals/${r.id}`} className={rowLink}>
                      {fullName(r.customer)}
                    </Link>
                    <Badge value={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink/60">
                    {day(r.pickup_date)} → {day(r.return_date)} · {dollars(r.rate_amount)}/{r.plan_type === "daily" ? "day" : "week"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
