import Link from "next/link";
import CrmForm from "@/components/crm/CrmForm";
import CopyLink from "@/components/crm/CopyLink";
import { Badge, Card } from "@/components/crm/ui";
import { ANGLES } from "@/lib/inspections/angles";
import { inspectionUrl, isLinkExpired } from "@/lib/inspections/server";
import { sendInspection } from "@/app/admin/(crm)/inspections/actions";

export type InspectionSummary = {
  id: string;
  kind: "pickup" | "return";
  status: "sent" | "in_progress" | "completed";
  token: string;
  token_expires_at: string;
  completed_at: string | null;
  staff_review: "pending" | "clean" | "damage";
  photo_count: number;
};

const statusText = { sent: "Link sent", in_progress: "In progress", completed: "Completed" } as const;

/** Pickup + return inspection status and links, for the rental detail page. */
export default function InspectionsCard({
  rentalId,
  rentalStatus,
  inspections,
  justSent,
}: {
  rentalId: string;
  rentalStatus: string;
  inspections: InspectionSummary[];
  justSent?: string;
}) {
  const kinds: ("pickup" | "return")[] = ["pickup", "return"];
  const anyCompleted = inspections.some((i) => i.status === "completed");

  return (
    <Card
      title="Condition inspections"
      action={
        anyCompleted ? (
          <Link href={`/admin/rentals/${rentalId}/inspection`} className="text-xs font-semibold text-brand-dark">
            Review photos →
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {kinds.map((kind) => {
          const i = inspections.find((x) => x.kind === kind);
          const expired = i && i.status !== "completed" && isLinkExpired(i.token_expires_at);
          const relevant = kind === "pickup" || ["active", "overdue", "returned"].includes(rentalStatus);
          return (
            <div key={kind} className="border-b border-black/5 pb-4 last:border-0 last:pb-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize text-ink">{kind}</p>
                {i ? (
                  <span className="flex gap-1.5">
                    <Badge value={i.status === "completed" ? "returned" : expired ? "overdue" : "pending"}>
                      {expired ? "Link expired" : statusText[i.status]}
                    </Badge>
                    {i.status === "completed" && i.staff_review !== "pending" && (
                      <Badge value={i.staff_review === "clean" ? "paid" : "overdue"}>
                        {i.staff_review === "clean" ? "No damage" : "Damage"}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-ink/40">Not sent</span>
                )}
              </div>

              {i && i.status !== "completed" && (
                <p className="mb-2 text-xs text-ink/60">
                  {i.photo_count}/{ANGLES.length} photos taken
                </p>
              )}
              {i && i.status !== "completed" && !expired && (justSent === kind || i.status === "sent" || i.status === "in_progress") && (
                <div className="mb-2">
                  <CopyLink url={inspectionUrl(i.token)} />
                  <p className="mt-1 text-xs text-ink/40">Text this link to the renter. It works for 72 hours.</p>
                </div>
              )}

              {(!i || i.status !== "completed") && relevant && (
                <CrmForm
                  action={sendInspection.bind(null, rentalId, kind)}
                  submitLabel={i ? "New link" : `Send ${kind} inspection`}
                  className="space-y-2"
                >
                  {null}
                </CrmForm>
              )}
              {!i && !relevant && <p className="text-xs text-ink/40">Available once the car is out.</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
