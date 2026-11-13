import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import LeadFields from "../LeadFields";
import { saveLead } from "../actions";

export default async function NewLeadPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: team } = await supabase.from("users").select("id, full_name, email").eq("is_active", true).order("full_name");

  return (
    <>
      <PageHeader title="Add lead" />
      <Card>
        <CrmForm
          action={saveLead.bind(null, null)}
          submitLabel="Add lead"
          footer={<ButtonLink href="/admin/leads" variant="secondary">Cancel</ButtonLink>}
        >
          <LeadFields team={team ?? []} />
        </CrmForm>
      </Card>
    </>
  );
}
