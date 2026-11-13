import Link from "next/link";
import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClass, Notice, PageHeader, rowLink } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireStaff } from "@/lib/crm/session";
import { customerOptions, rentalTotal, vehicleOptions } from "@/lib/crm/options";
import { day, daysBetween, dollars, today } from "@/lib/crm/format";
import type { Rental } from "@/lib/crm/types";
import RentalFields from "../RentalFields";
import InspectionsCard, { type InspectionSummary } from "@/components/inspections/InspectionsCard";
import { returnRental, saveRental, setRentalStatus, startRental } from "../actions";

type InvoiceRow = { id: string; invoice_number: string; amount: number; status: string };

export default async function RentalPage({ params, searchParams }: PageProps<"/admin/rentals/[id]">) {
  const staff = await requireStaff();
  const finance = canSeeFinance(staff);
  const { id } = await params;
  const { saved, link } = await searchParams;
  const supabase = await createClient();

  const [{ data: rental }, customers, vehicles, { data: invoiceData }, { data: inspectionData }] = await Promise.all([
    supabase
      .from("rentals")
      .select("*, customer:customers(first_name,last_name,phone,is_flagged,flag_reason), vehicle:vehicles(name,plate,mileage)")
      .eq("id", id)
      .maybeSingle(),
    customerOptions(supabase),
    vehicleOptions(supabase, { includeInactive: true }),
    finance
      ? supabase.from("invoices").select("id, invoice_number, amount, status").eq("rental_id", id).order("issued_date")
      : Promise.resolve({ data: null }),
    supabase
      .from("inspections")
      .select("id, kind, status, token, token_expires_at, completed_at, staff_review, photos:inspection_photos(count)")
      .eq("rental_id", id),
  ]);
  if (!rental) notFound();

  const r = rental as Rental & {
    customer: { first_name: string; last_name: string; phone: string | null; is_flagged: boolean; flag_reason: string | null } | null;
    vehicle: { name: string; plate: string | null; mileage: number } | null;
  };
  const invoices = invoiceData as InvoiceRow[] | null;
  const inspections: InspectionSummary[] = ((inspectionData ?? []) as unknown as (Omit<InspectionSummary, "photo_count"> & { photos: { count: number }[] })[]).map(
    ({ photos, ...rest }) => ({ ...rest, photo_count: photos?.[0]?.count ?? 0 }),
  );
  const total = rentalTotal(r);
  const now = today();
  const late = (r.status === "active" || r.status === "overdue") && daysBetween(now, r.return_date) < 0;

  return (
    <>
      <PageHeader
        title={`${r.customer?.first_name ?? ""} ${r.customer?.last_name ?? ""} · ${r.vehicle?.name ?? ""}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge value={r.status} />
            {day(r.pickup_date)} → {day(r.return_date)}
            {late && <Badge value="overdue">{-daysBetween(now, r.return_date)} days late</Badge>}
          </span>
        }
      />
      {saved && <Notice tone="success">Saved.</Notice>}
      {r.customer?.is_flagged && (
        <Notice tone="error">This customer is flagged: {r.customer.flag_reason || "no reason given"}.</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CrmForm action={saveRental.bind(null, r.id)} submitLabel="Save changes">
            <RentalFields rental={r} customers={customers} vehicles={vehicles} />
          </CrmForm>
        </Card>

        <div className="space-y-6">
          <Card title="Next step">
            {r.status === "pending" && (
              <CrmForm action={startRental.bind(null, r.id)} submitLabel="Hand over keys" className="space-y-3">
                <Field label="Odometer at pickup" hint={r.vehicle ? `Last recorded: ${r.vehicle.mileage.toLocaleString()} mi` : undefined}>
                  <input name="odometer_out" inputMode="numeric" defaultValue={r.vehicle?.mileage ?? ""} className={inputClass} />
                </Field>
              </CrmForm>
            )}
            {(r.status === "active" || r.status === "overdue") && (
              <CrmForm action={returnRental.bind(null, r.id)} submitLabel="Mark returned" className="space-y-3">
                <Field label="Returned on">
                  <input name="actual_return_date" type="date" defaultValue={now} className={inputClass} />
                </Field>
                <Field label="Odometer at return">
                  <input name="odometer_in" inputMode="numeric" className={inputClass} />
                </Field>
              </CrmForm>
            )}
            {(r.status === "returned" || r.status === "cancelled") && (
              <p className="text-sm text-ink/60">
                This rental is {r.status}.
                {r.actual_return_date && ` Returned ${day(r.actual_return_date)}.`}
                {r.odometer_in !== null && r.odometer_out !== null &&
                  ` Driven ${(r.odometer_in - r.odometer_out).toLocaleString()} mi.`}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4">
              {r.status === "active" && late && (
                <CrmForm action={setRentalStatus.bind(null, r.id, "overdue")} submitLabel="Mark overdue" className="">
                  {null}
                </CrmForm>
              )}
              {r.status === "pending" && (
                <CrmForm action={setRentalStatus.bind(null, r.id, "cancelled")} submitLabel="Cancel booking" className="">
                  {null}
                </CrmForm>
              )}
            </div>
          </Card>

          <InspectionsCard
            rentalId={r.id}
            rentalStatus={r.status}
            inspections={inspections}
            justSent={typeof link === "string" ? link : undefined}
          />

          <Card title="Price">
            <p className="text-2xl font-semibold text-ink">{dollars(total.total)}</p>
            <p className="mt-1 text-xs text-ink/60">
              {total.periods} {total.unit} × {dollars(r.rate_amount)} (booked dates)
            </p>
          </Card>

          {invoices && (
            <Card
              title="Invoices"
              action={
                <ButtonLink href={`/admin/invoices/new?rental=${r.id}`} variant="secondary">
                  New invoice
                </ButtonLink>
              }
            >
              {invoices.length === 0 ? (
                <EmptyState>Not invoiced yet.</EmptyState>
              ) : (
                <ul className="divide-y divide-black/5">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2 py-3">
                      <Link href={`/admin/invoices/${inv.id}`} className={rowLink}>
                        {inv.invoice_number}
                      </Link>
                      <span className="text-sm text-ink/70">{dollars(inv.amount)}</span>
                      <Badge value={inv.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
