import { findInspectionByToken } from "@/lib/inspections/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import Walkthrough from "./Walkthrough";

export const dynamic = "force-dynamic";

const PHONE = "(772) 202-0853";

export default async function InspectPage({ params }: PageProps<"/inspect/[token]">) {
  const { token } = await params;
  if (!isSupabaseConfigured()) return <Message title="Not available">This link isn&apos;t working right now. Please call us at {PHONE}.</Message>;

  const result = await findInspectionByToken(token);
  if (!result.ok) {
    if (result.reason === "completed")
      return <Message title="All done ✓">This condition check has already been submitted. Thank you! Drive safe.</Message>;
    if (result.reason === "expired")
      return <Message title="Link expired">This link has expired. Text or call us at {PHONE} and we&apos;ll send a new one.</Message>;
    return <Message title="Link not found">Check that you opened the full link from your message, or call us at {PHONE}.</Message>;
  }

  const i = result.inspection;
  return (
    <Walkthrough
      token={token}
      kind={i.kind}
      vehicleName={i.vehicle_name}
      plate={i.vehicle_plate}
      firstName={i.renter_first_name}
      done={i.photos}
    />
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
      <p className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold text-ink">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" /> R&S Auto Rentals
      </p>
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-3 text-ink/70">{children}</p>
    </div>
  );
}
