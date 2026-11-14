import CrmForm from "@/components/crm/CrmForm";
import { Badge, Card, Field, inputClass, Notice, PageHeader } from "@/components/crm/ui";
import { requireStaff } from "@/lib/crm/session";
import { changePassword } from "./actions";

export default async function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  const staff = await requireStaff();
  const { changed } = await searchParams;

  return (
    <>
      <PageHeader title="Your account" />
      {changed && <Notice tone="success">Password changed. Use the new one next time you sign in.</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <dt className="text-ink/50">Name</dt>
            <dd className="text-ink">{staff.full_name ?? "—"}</dd>
            <dt className="text-ink/50">Email</dt>
            <dd className="text-ink">{staff.email}</dd>
            <dt className="text-ink/50">Role</dt>
            <dd>
              <Badge value={staff.role} />
            </dd>
          </dl>
          <p className="mt-4 text-xs text-ink/40">To change your name, email or role, ask an owner (Team page).</p>
        </Card>

        <Card title="Change password">
          <CrmForm action={changePassword} submitLabel="Change password" className="space-y-4">
            <Field label="New password" hint="At least 10 characters.">
              <input name="password" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
            </Field>
            <Field label="Type it again">
              <input name="confirm" type="password" autoComplete="new-password" required minLength={10} className={inputClass} />
            </Field>
          </CrmForm>
        </Card>
      </div>
    </>
  );
}
