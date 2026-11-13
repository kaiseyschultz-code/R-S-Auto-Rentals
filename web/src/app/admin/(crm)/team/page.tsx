import CrmForm from "@/components/crm/CrmForm";
import { Badge, Card, Checkbox, Field, FormGrid, inputClass, Notice, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/crm/session";
import type { StaffUser } from "@/lib/crm/types";
import { addStaff, updateStaff } from "./actions";
import { rows } from "@/lib/crm/rows";

export default async function TeamPage({ searchParams }: PageProps<"/admin/team">) {
  const owner = await requireOwner();
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, tenant_id, email, full_name, role, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("full_name");
  const team = rows<StaffUser>(data);

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Owners see everything. Managers also see invoices and expenses. Staff handle rentals, vehicles, customers and leads."
      />
      {saved && <Notice tone="success">Saved.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {team.map((u) => (
            <Card key={u.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">
                    {u.full_name ?? u.email} {u.id === owner.id && <span className="text-xs text-ink/40">(you)</span>}
                  </p>
                  <p className="text-xs text-ink/60">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge value={u.role} />
                  {!u.is_active && <Badge value="inactive">No access</Badge>}
                </div>
              </div>
              <CrmForm
                action={updateStaff.bind(null, u.id)}
                submitLabel="Update"
                className="flex flex-wrap items-end gap-4"
              >
                <Field label="Role">
                  <select name="role" defaultValue={u.role} className={inputClass}>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </Field>
                <div className="pb-2">
                  <Checkbox name="is_active" label="Has access" defaultChecked={u.is_active} />
                </div>
              </CrmForm>
            </Card>
          ))}
        </div>

        <Card title="Add a team member">
          <CrmForm action={addStaff} submitLabel="Create login" className="space-y-4">
            <FormGrid>
              <Field label="Name" className="sm:col-span-2">
                <input name="full_name" required className={inputClass} />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input name="email" type="email" required className={inputClass} />
              </Field>
              <Field label="Role">
                <select name="role" defaultValue="staff" className={inputClass}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </Field>
              <Field label="Temporary password" hint="10+ characters. Share it privately.">
                <input name="password" type="text" autoComplete="new-password" required minLength={10} className={inputClass} />
              </Field>
            </FormGrid>
          </CrmForm>
        </Card>
      </div>
    </>
  );
}
