import { Field, FormGrid, FormSection, inputClass } from "@/components/crm/ui";
import { label } from "@/lib/crm/format";
import { BOOKING_SOURCES, RENTAL_STATUSES, type Rental } from "@/lib/crm/types";

export type CustomerOption = { id: string; first_name: string; last_name: string; is_flagged: boolean };
export type VehicleOption = { id: string; name: string; plate: string | null; status: string };

export default function RentalFields({
  rental,
  customers,
  vehicles,
  defaults = {},
}: {
  rental?: Rental;
  customers: CustomerOption[];
  vehicles: VehicleOption[];
  defaults?: { customer_id?: string; vehicle_id?: string; pickup_date?: string; lead_id?: string };
}) {
  const r = rental;
  return (
    <>
      {defaults.lead_id && <input type="hidden" name="lead_id" value={defaults.lead_id} />}
      <FormSection title="Who and what">
        <FormGrid>
          <Field label="Customer" hint="Not listed? Add them under Customers first.">
            <select name="customer_id" required defaultValue={r?.customer_id ?? defaults.customer_id ?? ""} className={inputClass}>
              <option value="" disabled>
                Choose a customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}
                  {c.is_flagged ? " (FLAGGED)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vehicle">
            <select name="vehicle_id" required defaultValue={r?.vehicle_id ?? defaults.vehicle_id ?? ""} className={inputClass}>
              <option value="" disabled>
                Choose a vehicle…
              </option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.plate ? ` · ${v.plate}` : ""} ({v.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Driving for" hint="Uber, DoorDash, Lyft, Personal…">
            <input name="platform" defaultValue={r?.platform ?? ""} className={inputClass} />
          </Field>
          <Field label="Booked via">
            <select name="booking_source" defaultValue={r?.booking_source ?? "manual"} className={inputClass}>
              {BOOKING_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s === "web" ? "Website" : label(s)}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Dates and price">
        <FormGrid>
          <Field label="Pickup date">
            <input name="pickup_date" type="date" required defaultValue={r?.pickup_date ?? defaults.pickup_date ?? ""} className={inputClass} />
          </Field>
          <Field label="Return date">
            <input name="return_date" type="date" required defaultValue={r?.return_date ?? ""} className={inputClass} />
          </Field>
          <Field label="Plan">
            <select name="plan_type" defaultValue={r?.plan_type ?? "weekly"} className={inputClass}>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </Field>
          <Field label="Rate ($ per day or week)">
            <input name="rate_amount" inputMode="decimal" required defaultValue={r?.rate_amount ?? ""} className={inputClass} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={r?.status ?? "pending"} className={inputClass}>
              {RENTAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
      </FormSection>

      {r && (
        <FormSection title="Handover">
          <FormGrid>
            <Field label="Odometer at pickup">
              <input name="odometer_out" inputMode="numeric" defaultValue={r.odometer_out ?? ""} className={inputClass} />
            </Field>
            <Field label="Odometer at return">
              <input name="odometer_in" inputMode="numeric" defaultValue={r.odometer_in ?? ""} className={inputClass} />
            </Field>
            <Field label="Actually returned on">
              <input name="actual_return_date" type="date" defaultValue={r.actual_return_date ?? ""} className={inputClass} />
            </Field>
          </FormGrid>
        </FormSection>
      )}

      <FormSection title="Notes">
        <textarea name="notes" rows={3} defaultValue={r?.notes ?? ""} className={inputClass} />
      </FormSection>
    </>
  );
}
