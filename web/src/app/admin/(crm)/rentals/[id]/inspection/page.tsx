import Link from "next/link";
import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import PrintButton from "@/components/crm/PrintButton";
import { Badge, Card, Field, FormGrid, inputClass, Notice, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireStaff } from "@/lib/crm/session";
import { day, fullName } from "@/lib/crm/format";
import { rows } from "@/lib/crm/rows";
import { ANGLES, fuelLabel } from "@/lib/inspections/angles";
import { INSPECTION_BUCKET } from "@/lib/inspections/server";
import { createDamageCharges, reviewInspection } from "../../../inspections/actions";

type Photo = {
  angle: string;
  storage_path: string;
  sha256: string;
  taken_at: string | null;
  uploaded_at: string;
  lat: number | null;
  lng: number | null;
  damage_flag: boolean;
  damage_note: string | null;
};

type Inspection = {
  id: string;
  kind: "pickup" | "return";
  status: string;
  odometer: number | null;
  fuel_level: string | null;
  renter_name: string | null;
  renter_signature: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  staff_review: "pending" | "clean" | "damage";
  damage_notes: string | null;
  reviewed_at: string | null;
  reviewer: { full_name: string | null; email: string } | null;
  photos: Photo[];
};

const SIGNED_URL_SECONDS = 60 * 10;

export default async function InspectionReviewPage({ params, searchParams }: PageProps<"/admin/rentals/[id]/inspection">) {
  const staff = await requireStaff();
  const { id } = await params;
  const { saved, charged } = await searchParams;
  const supabase = await createClient();

  const [{ data: rental }, { data: inspectionData }] = await Promise.all([
    supabase
      .from("rentals")
      .select("id, pickup_date, return_date, customer:customers(first_name,last_name), vehicle:vehicles(name,plate)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inspections")
      .select(
        "id, kind, status, odometer, fuel_level, renter_name, renter_signature, confirmed_at, completed_at, staff_review, damage_notes, reviewed_at, reviewer:users!inspections_reviewed_by_fkey(full_name,email), photos:inspection_photos(angle, storage_path, sha256, taken_at, uploaded_at, lat, lng, damage_flag, damage_note)",
      )
      .eq("rental_id", id),
  ]);
  if (!rental) notFound();
  const r = rental as unknown as {
    id: string;
    pickup_date: string;
    return_date: string;
    customer: { first_name: string; last_name: string } | null;
    vehicle: { name: string; plate: string | null } | null;
  };
  const inspections = rows<Inspection>(inspectionData);
  const pickup = inspections.find((i) => i.kind === "pickup");
  const ret = inspections.find((i) => i.kind === "return");

  // Short-lived signed URLs, created as the signed-in staff member (storage RLS applies).
  const paths = inspections.flatMap((i) => i.photos.map((p) => p.storage_path));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(INSPECTION_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  const photo = (i: Inspection | undefined, angle: string) => i?.photos.find((p) => p.angle === angle);
  // Review the latest completed inspection: return if done, else pickup.
  const reviewTarget = ret?.status === "completed" ? ret : pickup?.status === "completed" ? pickup : undefined;

  return (
    <>
      <PageHeader
        title={`Condition report · ${r.vehicle?.name ?? ""}`}
        subtitle={`${fullName(r.customer)} · ${day(r.pickup_date)} → ${day(r.return_date)}${r.vehicle?.plate ? ` · ${r.vehicle.plate}` : ""}`}
        action={
          <div className="flex gap-2 print:hidden">
            <PrintButton />
            <Link
              href={`/admin/rentals/${r.id}`}
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
            >
              Back to rental
            </Link>
          </div>
        }
      />
      {saved && <Notice tone="success">Review saved.</Notice>}
      {charged && <Notice tone="success">Repair expense recorded.</Notice>}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {[pickup, ret].map((i, n) => (
          <SummaryCard key={n} title={n === 0 ? "Pickup" : "Return"} inspection={i} />
        ))}
      </div>

      <div className="space-y-3">
        <div className="hidden grid-cols-[140px_1fr_1fr] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50 md:grid">
          <span>Angle</span>
          <span>Pickup</span>
          <span>Return</span>
        </div>
        {ANGLES.map((a) => {
          const before = photo(pickup, a.id);
          const after = photo(ret, a.id);
          return (
            <div key={a.id} className="grid gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm break-inside-avoid md:grid-cols-[140px_1fr_1fr]">
              <div>
                <p className="text-sm font-semibold text-ink">{a.label}</p>
                {(before?.damage_flag || after?.damage_flag) && (
                  <span className="mt-1 inline-block">
                    <Badge value="overdue">Damage</Badge>
                  </span>
                )}
              </div>
              <PhotoCell label="Pickup" photo={before} url={before && urls.get(before.storage_path)} />
              <PhotoCell label="Return" photo={after} url={after && urls.get(after.storage_path)} />
            </div>
          );
        })}
      </div>

      {reviewTarget && (
        <Card title={`Review the ${reviewTarget.kind} inspection`} className="mt-6 print:hidden">
          <CrmForm action={reviewInspection.bind(null, reviewTarget.id, r.id)} submitLabel="Save review">
            <fieldset className="flex flex-wrap gap-4 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input type="radio" name="staff_review" value="clean" defaultChecked={reviewTarget.staff_review !== "damage"} className="h-4 w-4 accent-[var(--brand)]" />
                No new damage
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="staff_review" value="damage" defaultChecked={reviewTarget.staff_review === "damage"} className="h-4 w-4 accent-[var(--brand)]" />
                Damage found
              </label>
            </fieldset>
            <Field label="What's damaged">
              <textarea name="damage_notes" rows={2} defaultValue={reviewTarget.damage_notes ?? ""} className={inputClass} />
            </Field>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Photos showing damage</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ANGLES.map((a) => {
                  const p = photo(reviewTarget, a.id);
                  if (!p) return null;
                  return (
                    <div key={a.id} className="rounded-lg border border-black/5 p-2">
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input type="checkbox" name={`flag_${a.id}`} defaultChecked={p.damage_flag} className="h-4 w-4 accent-[var(--brand)]" />
                        {a.label}
                      </label>
                      <input
                        name={`note_${a.id}`}
                        defaultValue={p.damage_note ?? ""}
                        placeholder="Note (optional)"
                        className="mt-1 w-full rounded-md border border-black/10 px-2 py-1 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CrmForm>
        </Card>
      )}

      {reviewTarget?.staff_review === "damage" && canSeeFinance(staff) && (
        <Card title="Charge for the damage" className="mt-6 print:hidden">
          <CrmForm action={createDamageCharges.bind(null, r.id)} submitLabel="Create charges">
            <FormGrid>
              <Field label="Bill the renter ($)" hint="Creates a pending damage invoice.">
                <input name="invoice_amount" inputMode="decimal" className={inputClass} />
              </Field>
              <Field label="Repair cost ($)" hint="Records a maintenance expense on this vehicle.">
                <input name="expense_amount" inputMode="decimal" className={inputClass} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <input name="description" defaultValue={reviewTarget.damage_notes ?? ""} className={inputClass} />
              </Field>
            </FormGrid>
          </CrmForm>
        </Card>
      )}

      {!pickup && !ret && (
        <Notice>No inspections for this rental yet. Send one from the rental page.</Notice>
      )}
    </>
  );
}

function SummaryCard({ title, inspection: i }: { title: string; inspection: Inspection | undefined }) {
  return (
    <Card title={title} className="break-inside-avoid">
      {!i ? (
        <p className="text-sm text-ink/50">Not sent.</p>
      ) : i.status !== "completed" ? (
        <p className="text-sm text-ink/60">
          Not finished yet ({i.photos.length}/{ANGLES.length} photos).
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/50">Completed</dt>
          <dd className="text-ink">{i.completed_at ? new Date(i.completed_at).toLocaleString("en-US", { timeZone: "America/New_York" }) : "—"}</dd>
          <dt className="text-ink/50">Odometer</dt>
          <dd className="text-ink">{i.odometer?.toLocaleString() ?? "—"} mi</dd>
          <dt className="text-ink/50">Fuel</dt>
          <dd className="text-ink">{fuelLabel(i.fuel_level)}</dd>
          <dt className="text-ink/50">Signed by</dt>
          <dd className="text-ink">{i.renter_name ?? "—"}</dd>
          <dt className="text-ink/50">Staff review</dt>
          <dd>
            {i.staff_review === "pending" ? (
              <span className="text-ink/50">Not reviewed</span>
            ) : (
              <Badge value={i.staff_review === "clean" ? "paid" : "overdue"}>{i.staff_review === "clean" ? "No damage" : "Damage"}</Badge>
            )}
            {i.reviewer && <span className="ml-1 text-xs text-ink/50">by {i.reviewer.full_name ?? i.reviewer.email}</span>}
          </dd>
          {i.renter_signature && (
            <>
              <dt className="text-ink/50">Signature</dt>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the renter */}
              <dd><img src={i.renter_signature} alt="Renter signature" className="h-12 rounded border border-black/5 bg-white" /></dd>
            </>
          )}
        </dl>
      )}
    </Card>
  );
}

function PhotoCell({ label, photo, url }: { label: string; photo: Photo | undefined; url: string | undefined }) {
  if (!photo || !url) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-black/[0.03] text-xs text-ink/40">
        {label}: no photo
      </div>
    );
  }
  return (
    <figure>
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
        <img
          src={url}
          alt={`${label} photo`}
          className={`aspect-[4/3] w-full rounded-xl object-cover ${photo.damage_flag ? "ring-2 ring-rose-500" : ""}`}
        />
      </a>
      <figcaption className="mt-1 text-[11px] leading-tight text-ink/50">
        <span className="md:hidden">{label} · </span>
        {photo.taken_at ? new Date(photo.taken_at).toLocaleString("en-US", { timeZone: "America/New_York" }) : "time unknown"}
        {photo.lat !== null && photo.lng !== null && (
          <>
            {" · "}
            <a href={`https://maps.google.com/?q=${photo.lat},${photo.lng}`} target="_blank" rel="noreferrer" className="underline">
              location
            </a>
          </>
        )}
        <span className="block font-mono" title={`SHA-256 ${photo.sha256}`}>#{photo.sha256.slice(0, 12)}</span>
        {photo.damage_note && <span className="block text-rose-700">{photo.damage_note}</span>}
      </figcaption>
    </figure>
  );
}
