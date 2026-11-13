import { Field, FormGrid, FormSection, inputClass } from "@/components/crm/ui";
import { day, label } from "@/lib/crm/format";
import { INVOICE_STATUSES, type Invoice } from "@/lib/crm/types";

export type RentalOption = {
  id: string;
  pickup_date: string;
  customer_id: string;
  customer: { first_name: string; last_name: string } | null;
  vehicle: { name: string } | null;
};

export default function InvoiceFields({
  invoice,
  customers,
  rentals,
  defaults = {},
}: {
  invoice?: Invoice;
  customers: { id: string; first_name: string; last_name: string }[];
  rentals: RentalOption[];
  defaults?: Partial<Pick<Invoice, "customer_id" | "rental_id" | "amount" | "issued_date" | "due_date">>;
}) {
  const i = invoice;
  return (
    <>
      <FormSection title="Bill to">
        <FormGrid>
          <Field label="Customer">
            <select name="customer_id" required defaultValue={i?.customer_id ?? defaults.customer_id ?? ""} className={inputClass}>
              <option value="" disabled>
                Choose a customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="For rental (optional)">
            <select name="rental_id" defaultValue={i?.rental_id ?? defaults.rental_id ?? ""} className={inputClass}>
              <option value="">No rental</option>
              {rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.customer ? `${r.customer.first_name} ${r.customer.last_name}` : "?"} · {r.vehicle?.name} · {day(r.pickup_date)}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Amount and dates">
        <FormGrid>
          <Field label="Amount ($)">
            <input name="amount" inputMode="decimal" required defaultValue={i?.amount ?? defaults.amount ?? ""} className={inputClass} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={i?.status ?? "pending"} className={inputClass}>
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Issued">
            <input name="issued_date" type="date" defaultValue={i?.issued_date ?? defaults.issued_date ?? ""} className={inputClass} />
          </Field>
          <Field label="Due">
            <input name="due_date" type="date" defaultValue={i?.due_date ?? defaults.due_date ?? ""} className={inputClass} />
          </Field>
          <Field label="Paid on" hint="Filled in automatically when marked paid.">
            <input name="paid_date" type="date" defaultValue={i?.paid_date ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Square">
        <FormGrid>
          <Field label="Payment link" hint="Square payment link sent to the customer, if any.">
            <input name="square_payment_link_url" type="url" defaultValue={i?.square_payment_link_url ?? ""} className={inputClass} />
          </Field>
          <Field label="Square payment ID" hint="From the Square Dashboard once paid.">
            <input name="square_payment_id" defaultValue={i?.square_payment_id ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Notes">
        <textarea name="notes" rows={3} defaultValue={i?.notes ?? ""} className={inputClass} />
      </FormSection>
    </>
  );
}
