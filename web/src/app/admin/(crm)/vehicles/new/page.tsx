import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { requireStaff } from "@/lib/crm/session";
import VehicleFields from "../VehicleFields";
import { saveVehicle } from "../actions";

export default async function NewVehiclePage() {
  await requireStaff();
  return (
    <>
      <PageHeader title="Add vehicle" />
      <Card>
        <CrmForm
          action={saveVehicle.bind(null, null)}
          submitLabel="Add vehicle"
          footer={<ButtonLink href="/admin/vehicles" variant="secondary">Cancel</ButtonLink>}
        >
          <VehicleFields />
        </CrmForm>
      </Card>
    </>
  );
}
