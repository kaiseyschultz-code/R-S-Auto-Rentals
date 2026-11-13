import { Field, FormGrid, inputClass } from "@/components/crm/ui";
import { label, today } from "@/lib/crm/format";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/crm/types";

export default function ExpenseFields({
  expense,
  vehicles,
  defaultVehicleId,
}: {
  expense?: Expense;
  vehicles: { id: string; name: string; plate: string | null }[];
  defaultVehicleId?: string;
}) {
  const e = expense;
  return (
    <FormGrid>
      <Field label="Category">
        <select name="category" required defaultValue={e?.category ?? "maintenance"} className={inputClass}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Vehicle" hint="Leave as General for business-wide costs.">
        <select name="vehicle_id" defaultValue={e?.vehicle_id ?? defaultVehicleId ?? ""} className={inputClass}>
          <option value="">General (no vehicle)</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.plate ? ` · ${v.plate}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount ($)">
        <input name="amount" inputMode="decimal" required defaultValue={e?.amount ?? ""} className={inputClass} />
      </Field>
      <Field label="Date">
        <input name="expense_date" type="date" defaultValue={e?.expense_date ?? today()} className={inputClass} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <input name="description" defaultValue={e?.description ?? ""} className={inputClass} />
      </Field>
      <Field label="Receipt link (optional)" className="sm:col-span-2">
        <input name="receipt_url" type="url" defaultValue={e?.receipt_url ?? ""} className={inputClass} />
      </Field>
    </FormGrid>
  );
}
