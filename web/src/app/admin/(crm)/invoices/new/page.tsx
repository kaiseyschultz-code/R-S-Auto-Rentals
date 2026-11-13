import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { customerOptions, rentalTotal } from "@/lib/crm/options";
import { today } from "@/lib/crm/format";
import InvoiceFields, { type RentalOption } from "../InvoiceFields";
import { saveInvoice } from "../actions";
import { rows } from "@/lib/crm/rows";

export default async function NewInvoicePage({ searchParams }: PageProps<"/admin/invoices/new">) {
  await requireFinance();
  const { rental: rentalId, customer } = await searchParams;
  const supabase = await createClient();

  const [customers, { data: rentalData }, { data: fromRental }] = await Promise.all([
    customerOptions(supabase),
    supabase
      .from("rentals")
      .select("id, pickup_date, customer_id, customer:customers(first_name,last_name), vehicle:vehicles(name)")
      .order("pickup_date", { ascending: false })
      .limit(100),
    typeof rentalId === "string"
      ? supabase
          .from("rentals")
          .select("id, customer_id, plan_type, rate_amount, pickup_date, return_date")
          .eq("id", rentalId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const issued = today();
  const due = issued; // rentals are paid up front; change per invoice if needed
  const defaults = fromRental
    ? {
        customer_id: fromRental.customer_id as string,
        rental_id: fromRental.id as string,
        amount: rentalTotal(fromRental as Parameters<typeof rentalTotal>[0]).total,
        issued_date: issued,
        due_date: due,
      }
    : {
        customer_id: typeof customer === "string" ? customer : undefined,
        issued_date: issued,
        due_date: due,
      };

  return (
    <>
      <PageHeader title="New invoice" subtitle="The invoice number (INV-0001…) is assigned when you save." />
      <Card>
        <CrmForm
          action={saveInvoice.bind(null, null)}
          submitLabel="Create invoice"
          footer={<ButtonLink href="/admin/invoices" variant="secondary">Cancel</ButtonLink>}
        >
          <InvoiceFields customers={customers} rentals={rows<RentalOption>(rentalData)} defaults={defaults} />
        </CrmForm>
      </Card>
    </>
  );
}
