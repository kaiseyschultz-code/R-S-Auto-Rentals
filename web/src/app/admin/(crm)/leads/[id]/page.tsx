import Link from "next/link";
import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { day } from "@/lib/crm/format";
import type { Lead } from "@/lib/crm/types";
import LeadFields from "../LeadFields";
import { convertLead, saveLead } from "../actions";

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: lead }, { data: team }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle<Lead>(),
    supabase.from("users").select("id, full_name, email").eq("is_active", true).order("full_name"),
  ]);
  if (!lead) notFound();

  return (
    <>
      <PageHeader
        title={lead.name}
        subtitle={
          <span className="flex items-center gap-2">
            <Badge value={lead.stage} /> Added {day(lead.created_at)}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CrmForm
            action={saveLead.bind(null, lead.id)}
            submitLabel="Save changes"
            footer={<ButtonLink href="/admin/leads" variant="secondary">Back</ButtonLink>}
          >
            <LeadFields lead={lead} team={team ?? []} />
          </CrmForm>
        </Card>

        <Card title="Ready to rent?">
          {lead.converted_to_rental_id ? (
            <Link href={`/admin/rentals/${lead.converted_to_rental_id}`} className="text-sm font-semibold text-brand-dark">
              Became a rental →
            </Link>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink/60">
                Creates a customer from this lead and opens a new rental for them. Saving the rental marks
                the lead as won.
              </p>
              <CrmForm action={convertLead.bind(null, lead.id)} submitLabel="Convert to customer" className="space-y-3">
                {null}
              </CrmForm>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
