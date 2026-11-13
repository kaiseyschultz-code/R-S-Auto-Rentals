import { Field, FormGrid, FormSection, inputClass } from "@/components/crm/ui";
import { label } from "@/lib/crm/format";
import { VEHICLE_STATUSES, type Vehicle } from "@/lib/crm/types";

export default function VehicleFields({ vehicle }: { vehicle?: Vehicle }) {
  const v = vehicle;
  return (
    <>
      <FormSection title="Vehicle">
        <FormGrid>
          <Field label="Display name" hint='Shown everywhere, e.g. "Toyota Camry".'>
            <input name="name" required defaultValue={v?.name} className={inputClass} />
          </Field>
          <Field label="Status" hint="Rented/available also update automatically from rentals.">
            <select name="status" defaultValue={v?.status ?? "available"} className={inputClass}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Make">
            <input name="make" defaultValue={v?.make ?? ""} className={inputClass} />
          </Field>
          <Field label="Model">
            <input name="model" defaultValue={v?.model ?? ""} className={inputClass} />
          </Field>
          <Field label="Year">
            <input name="year" inputMode="numeric" defaultValue={v?.year ?? ""} className={inputClass} />
          </Field>
          <Field label="Color">
            <input name="color" defaultValue={v?.color ?? ""} className={inputClass} />
          </Field>
          <Field label="License plate">
            <input name="plate" defaultValue={v?.plate ?? ""} className={inputClass} />
          </Field>
          <Field label="VIN">
            <input name="vin" defaultValue={v?.vin ?? ""} className={inputClass} />
          </Field>
          <Field label="Current mileage">
            <input name="mileage" inputMode="numeric" defaultValue={v?.mileage ?? 0} className={inputClass} />
          </Field>
          <Field label="Approved platforms" hint="Comma-separated, e.g. Uber, Lyft, DoorDash">
            <input name="platforms" defaultValue={v?.platforms?.join(", ") ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Purchase">
        <FormGrid>
          <Field label="Purchase price ($)">
            <input name="purchase_price" inputMode="decimal" defaultValue={v?.purchase_price ?? ""} className={inputClass} />
          </Field>
          <Field label="Purchase date">
            <input name="purchase_date" type="date" defaultValue={v?.purchase_date ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Square (links this car to the website's listing)">
        <FormGrid>
          <Field label="Square item ID">
            <input name="square_item_id" defaultValue={v?.square_item_id ?? ""} className={inputClass} />
          </Field>
          <Field label="Photo URL">
            <input name="photo_url" type="url" defaultValue={v?.photo_url ?? ""} className={inputClass} />
          </Field>
          <Field label="Daily variation ID">
            <input name="square_daily_variation_id" defaultValue={v?.square_daily_variation_id ?? ""} className={inputClass} />
          </Field>
          <Field label="Weekly variation ID">
            <input name="square_weekly_variation_id" defaultValue={v?.square_weekly_variation_id ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Notes">
        <textarea name="notes" rows={3} defaultValue={v?.notes ?? ""} className={inputClass} />
      </FormSection>
    </>
  );
}
