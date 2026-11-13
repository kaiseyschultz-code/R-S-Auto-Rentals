import Link from "next/link";
import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import { Badge, Card, Field, inputClass, Notice, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { customerOptions } from "@/lib/crm/options";
import { day, dollars, today } from "@/lib/crm/format";
import type { Invoice } from "@/lib/crm/types";
import InvoiceFields, { type RentalOption } from "../InvoiceFields";
import { markInvoicePaid, saveInvoice } from "../actions";
import { rows } from "@/lib/crm/rows";

export default async function InvoicePage({ params, searchParams }: PageProps<"/admin/invoices/[id]">) {
  await requireFinance();
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const [{ data }, customers, { data: rentalData }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customer:customers(first_name,last_name,phone,email)")
      .eq("id", id)
      .maybeSingle(),
    customerOptions(supabase),
    supabase
      .from("rentals")
      .select("id, pickup_date, customer_id, customer:customers(first_name,last_name), vehicle:vehicles(name)")
      .order("pickup_date", { ascending: false })
      .limit(100),
  ]);
  if (!data) notFound();
  const invoice = data as Invoice & {
    customer: { first_name: string; last_name: string; phone: string | null; email: string | null } | null;
  };
  const open = invoice.status === "pending" || invoice.status === "overdue" || invoice.status === "draft";

  return (
    <>
      <PageHeader
        title={`${invoice.invoice_number} · ${dollars(invoice.amount)}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge value={invoice.status} />
            {invoice.customer && `${invoice.customer.first_name} ${invoice.customer.last_name}`}
            {invoice.due_date && open && ` · due ${day(invoice.due_date)}`}
          </span>
        }
      />
      {saved && <Notice tone="success">Saved.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CrmForm action={saveInvoice.bind(null, invoice.id)} submitLabel="Save changes">
            <InvoiceFields invoice={invoice} customers={customers} rentals={rows<RentalOption>(rentalData)} />
          </CrmForm>
        </Card>

        <div className="space-y-6">
          {open ? (
            <Card title="Record payment">
              <CrmForm action={markInvoicePaid.bind(null, invoice.id)} submitLabel="Mark paid" className="space-y-3">
                <Field label="Paid on">
                  <input name="paid_date" type="date" defaultValue={today()} className={inputClass} />
                </Field>
                <Field label="Square payment ID (optional)">
                  <input name="square_payment_id" defaultValue={invoice.square_payment_id ?? ""} className={inputClass} />
                </Field>
              </CrmForm>
            </Card>
          ) : (
            <Card title="Payment">
              <p className="text-sm text-ink/70">
                {invoice.status === "paid" ? `Paid ${day(invoice.paid_date)}.` : "Cancelled."}
              </p>
            </Card>
          )}
          {invoice.square_payment_link_url && (
            <Card title="Square payment link">
              <a
                href={invoice.square_payment_link_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm font-semibold text-brand-dark"
              >
                {invoice.square_payment_link_url}
              </a>
            </Card>
          )}
          {invoice.rental_id && (
            <Link href={`/admin/rentals/${invoice.rental_id}`} className="block text-sm font-semibold text-brand-dark">
              View the rental →
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
