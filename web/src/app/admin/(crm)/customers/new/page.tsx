import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { requireStaff } from "@/lib/crm/session";
import CustomerFields from "../CustomerFields";
import { saveCustomer } from "../actions";

export default async function NewCustomerPage() {
  await requireStaff();
  return (
    <>
      <PageHeader title="Add customer" />
      <Card>
        <CrmForm
          action={saveCustomer.bind(null, null)}
          submitLabel="Add customer"
          footer={<ButtonLink href="/admin/customers" variant="secondary">Cancel</ButtonLink>}
        >
          <CustomerFields />
        </CrmForm>
      </Card>
    </>
  );
}
