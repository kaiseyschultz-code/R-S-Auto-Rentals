import Link from "next/link";
import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import { Badge, ButtonLink, Card, EmptyState, Notice, PageHeader, rowLink } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireStaff } from "@/lib/crm/session";
import { day, dollars } from "@/lib/crm/format";
import type { Customer } from "@/lib/crm/types";
import CustomerFields from "../CustomerFields";
import { saveCustomer } from "../actions";
import { rows } from "@/lib/crm/rows";

type RentalRow = {
  id: string;
  status: string;
  pickup_date: string;
  return_date: string;
  vehicle: { name: string } | null;
};
type InvoiceRow = { id: string; invoice_number: string; amount: number; status: string; issued_date: string };

export default async function CustomerPage({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: row }, { data: rentalData }, { data: invoiceData }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("rentals")
      .select("id, status, pickup_date, return_date, vehicle:vehicles(name)")
      .eq("customer_id", id)
      .order("pickup_date", { ascending: false }),
    canSeeFinance(staff)
      ? supabase
          .from("invoices")
          .select("id, invoice_number, amount, status, issued_date")
          .eq("customer_id", id)
          .order("issued_date", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);
  if (!row) notFound();

  // Keep the full ID number on the server.
  const { id_number, ...customer } = row as Customer & { id_number: string | null };
  const last4 = id_number ? id_number.slice(-4) : null;
  const rentals = rows<RentalRow>(rentalData);
  const invoices = invoiceData as InvoiceRow[] | null;

  return (
    <>
      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        subtitle={[customer.phone, customer.email].filter(Boolean).join(" · ") || undefined}
        action={<ButtonLink href={`/admin/rentals/new?customer=${customer.id}`}>New rental</ButtonLink>}
      />
      {saved && <Notice tone="success">Saved.</Notice>}
      {customer.is_flagged && (
        <Notice tone="error">Flagged: {customer.flag_reason || "no reason given"}. Check before renting.</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CrmForm action={saveCustomer.bind(null, customer.id)} submitLabel="Save changes">
            <CustomerFields customer={customer as Customer} idNumberLast4={last4} />
          </CrmForm>
        </Card>

        <div className="space-y-6">
          <Card title="Rentals">
            {rentals.length === 0 ? (
              <EmptyState>No rentals yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-black/5">
                {rentals.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/rentals/${r.id}`} className={rowLink}>
                        {r.vehicle?.name ?? "Vehicle"}
                      </Link>
                      <Badge value={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      {day(r.pickup_date)} → {day(r.return_date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {invoices && (
            <Card title="Invoices">
              {invoices.length === 0 ? (
                <EmptyState>No invoices.</EmptyState>
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
