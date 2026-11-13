import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { day, label } from "@/lib/crm/format";
import { LEAD_STAGES, type Lead, type LeadStage } from "@/lib/crm/types";
import { Badge, ButtonLink, Notice, PageHeader } from "@/components/crm/ui";
import { moveLead } from "./actions";
import { rows } from "@/lib/crm/rows";

const NEXT: Partial<Record<LeadStage, LeadStage>> = {
  new: "contacted",
  contacted: "docs",
  docs: "agreement",
  agreement: "won",
};

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await requireStaff();
  const { saved, closed } = await searchParams;
  const showClosed = closed === "1";
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  const leads = rows<Lead>(data);

  const stages = showClosed ? LEAD_STAGES : LEAD_STAGES.filter((s) => s !== "won" && s !== "lost");

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="People interested in renting. Move them along as you follow up."
        action={
          <div className="flex gap-2">
            <ButtonLink href={showClosed ? "/admin/leads" : "/admin/leads?closed=1"} variant="secondary">
              {showClosed ? "Hide won/lost" : "Show won/lost"}
            </ButtonLink>
            <ButtonLink href="/admin/leads/new">Add lead</ButtonLink>
          </div>
        }
      />
      {saved && <Notice tone="success">Lead saved.</Notice>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage) => {
          const column = leads.filter((l) => l.stage === stage);
          return (
            <section key={stage} className="rounded-2xl bg-black/[0.03] p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-ink/60">
                {label(stage)} <span>{column.length}</span>
              </h2>
              <div className="space-y-2">
                {column.map((l) => (
                  <article key={l.id} className="rounded-xl border border-black/5 bg-white p-3 shadow-sm">
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-ink hover:text-brand-dark">
                      {l.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink/60">
                      {[l.phone, l.platform, l.desired_plan].filter(Boolean).join(" · ") || "No details"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-ink/40">{day(l.created_at)}</span>
                      {NEXT[l.stage] ? (
                        <form action={moveLead.bind(null, l.id)}>
                          <input type="hidden" name="stage" value={NEXT[l.stage]} />
                          <button className="text-xs font-semibold text-brand-dark hover:text-ink">
                            → {label(NEXT[l.stage])}
                          </button>
                        </form>
                      ) : (
                        <Badge value={l.stage} />
                      )}
                    </div>
                  </article>
                ))}
                {column.length === 0 && <p className="px-1 py-4 text-center text-xs text-ink/40">Empty</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
