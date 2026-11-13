import { Field, FormGrid, inputClass } from "@/components/crm/ui";
import { label } from "@/lib/crm/format";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";

const SOURCES = ["website", "phone", "walk-in", "referral", "social"];

export default function LeadFields({
  lead,
  team,
}: {
  lead?: Lead;
  team: { id: string; full_name: string | null; email: string }[];
}) {
  const l = lead;
  return (
    <FormGrid>
      <Field label="Name">
        <input name="name" required defaultValue={l?.name} className={inputClass} />
      </Field>
      <Field label="Stage">
        <select name="stage" defaultValue={l?.stage ?? "new"} className={inputClass}>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Phone">
        <input name="phone" type="tel" defaultValue={l?.phone ?? ""} className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={l?.email ?? ""} className={inputClass} />
      </Field>
      <Field label="Heard about us via">
        <select name="source" defaultValue={l?.source ?? "website"} className={inputClass}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Drives for">
        <input name="platform" placeholder="Uber, DoorDash, Personal…" defaultValue={l?.platform ?? ""} className={inputClass} />
      </Field>
      <Field label="Wants">
        <select name="desired_plan" defaultValue={l?.desired_plan ?? "weekly"} className={inputClass}>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
      </Field>
      <Field label="Vehicle interest">
        <input name="desired_vehicle" defaultValue={l?.desired_vehicle ?? ""} className={inputClass} />
      </Field>
      <Field label="Assigned to">
        <select name="assigned_to" defaultValue={l?.assigned_to ?? ""} className={inputClass}>
          <option value="">Unassigned</option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name ?? t.email}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <textarea name="notes" rows={3} defaultValue={l?.notes ?? ""} className={inputClass} />
      </Field>
    </FormGrid>
  );
}
