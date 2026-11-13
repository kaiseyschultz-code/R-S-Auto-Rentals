import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { vehicleOptions } from "@/lib/crm/options";
import ExpenseFields from "../ExpenseFields";
import { saveExpense } from "../actions";

export default async function NewExpensePage({ searchParams }: PageProps<"/admin/expenses/new">) {
  await requireFinance();
  const { vehicle } = await searchParams;
  const supabase = await createClient();
  const vehicles = await vehicleOptions(supabase, { includeInactive: true });

  return (
    <>
      <PageHeader title="Add expense" />
      <Card>
        <CrmForm
          action={saveExpense.bind(null, null)}
          submitLabel="Add expense"
          footer={<ButtonLink href="/admin/expenses" variant="secondary">Cancel</ButtonLink>}
        >
          <ExpenseFields vehicles={vehicles} defaultVehicleId={typeof vehicle === "string" ? vehicle : undefined} />
        </CrmForm>
      </Card>
    </>
  );
}
