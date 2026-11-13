import { Checkbox, Field, FormGrid, FormSection, inputClass } from "@/components/crm/ui";
import type { Customer } from "@/lib/crm/types";

export default function CustomerFields({
  customer,
  idNumberLast4,
}: {
  customer?: Customer;
  /** Last 4 characters of the stored ID number, if any. The full number never reaches the browser. */
  idNumberLast4?: string | null;
}) {
  const c = customer;
  return (
    <>
      <FormSection title="Contact">
        <FormGrid>
          <Field label="First name">
            <input name="first_name" required defaultValue={c?.first_name} className={inputClass} />
          </Field>
          <Field label="Last name">
            <input name="last_name" required defaultValue={c?.last_name} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input name="phone" type="tel" defaultValue={c?.phone ?? ""} className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={c?.email ?? ""} className={inputClass} />
          </Field>
          <Field label="Date of birth">
            <input name="dob" type="date" defaultValue={c?.dob ?? ""} className={inputClass} />
          </Field>
          <Field label="Street address">
            <input name="address" defaultValue={c?.address ?? ""} className={inputClass} />
          </Field>
          <Field label="City">
            <input name="city" defaultValue={c?.city ?? ""} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              <input name="state" maxLength={2} defaultValue={c?.state ?? "FL"} className={inputClass} />
            </Field>
            <Field label="ZIP">
              <input name="zip" inputMode="numeric" defaultValue={c?.zip ?? ""} className={inputClass} />
            </Field>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Driver ID">
        <FormGrid>
          <Field label="ID type">
            <select name="id_type" defaultValue={c?.id_type ?? "license"} className={inputClass}>
              <option value="license">Driver&apos;s license</option>
              <option value="state_id">State ID</option>
              <option value="passport">Passport</option>
            </select>
          </Field>
          <Field
            label="ID number"
            hint={idNumberLast4 ? "Leave blank to keep the number on file." : undefined}
          >
            <input
              name="id_number"
              autoComplete="off"
              placeholder={idNumberLast4 ? `On file, ending ${idNumberLast4}` : ""}
              className={inputClass}
            />
          </Field>
          <Field label="ID expiry">
            <input name="id_expiry" type="date" defaultValue={c?.id_expiry ?? ""} className={inputClass} />
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox name="id_verified" label="ID checked and verified" defaultChecked={c?.id_verified} />
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Insurance">
        <FormGrid>
          <Field label="Carrier">
            <input name="insurance_carrier" defaultValue={c?.insurance_carrier ?? ""} className={inputClass} />
          </Field>
          <Field label="Policy number">
            <input name="insurance_policy" defaultValue={c?.insurance_policy ?? ""} className={inputClass} />
          </Field>
          <Field label="Policy expiry">
            <input name="insurance_expiry" type="date" defaultValue={c?.insurance_expiry ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Emergency contact">
        <FormGrid>
          <Field label="Name">
            <input name="emergency_name" defaultValue={c?.emergency_name ?? ""} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input name="emergency_phone" type="tel" defaultValue={c?.emergency_phone ?? ""} className={inputClass} />
          </Field>
          <Field label="Relationship">
            <input name="emergency_relation" defaultValue={c?.emergency_relation ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Gig work and flags">
        <FormGrid>
          <div className="flex items-end pb-2">
            <Checkbox name="is_gig_worker" label="Gig driver" defaultChecked={c?.is_gig_worker} />
          </div>
          <Field label="Platforms" hint="Comma-separated, e.g. Uber, DoorDash">
            <input name="gig_platforms" defaultValue={c?.gig_platforms?.join(", ") ?? ""} className={inputClass} />
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox name="is_flagged" label="Flag this customer (do not rent)" defaultChecked={c?.is_flagged} />
          </div>
          <Field label="Flag reason">
            <input name="flag_reason" defaultValue={c?.flag_reason ?? ""} className={inputClass} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Notes">
        <textarea name="notes" rows={3} defaultValue={c?.notes ?? ""} className={inputClass} />
      </FormSection>
    </>
  );
}
