import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { customerOptions, vehicleOptions } from "@/lib/crm/options";
import { today } from "@/lib/crm/format";
import RentalFields from "../RentalFields";
import { saveRental } from "../actions";

export default async function NewRentalPage({ searchParams }: PageProps<"/admin/rentals/new">) {
  await requireStaff();
  const { customer, vehicle, lead } = await searchParams;
  const supabase = await createClient();
  const [customers, vehicles] = await Promise.all([customerOptions(supabase), vehicleOptions(supabase)]);

  return (
    <>
      <PageHeader title="New rental" subtitle="Double bookings are blocked automatically." />
      <Card>
        <CrmForm
          action={saveRental.bind(null, null)}
          submitLabel="Create rental"
          footer={<ButtonLink href="/admin/rentals" variant="secondary">Cancel</ButtonLink>}
        >
          <RentalFields
            customers={customers}
            vehicles={vehicles}
            defaults={{
              customer_id: typeof customer === "string" ? customer : undefined,
              vehicle_id: typeof vehicle === "string" ? vehicle : undefined,
              pickup_date: today(),
              lead_id: typeof lead === "string" ? lead : undefined,
            }}
          />
        </CrmForm>
      </Card>
    </>
  );
}
