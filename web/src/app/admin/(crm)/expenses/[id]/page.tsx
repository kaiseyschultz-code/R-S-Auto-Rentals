import { notFound } from "next/navigation";
import CrmForm from "@/components/crm/CrmForm";
import { ButtonLink, Card, PageHeader } from "@/components/crm/ui";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { vehicleOptions } from "@/lib/crm/options";
import type { Expense } from "@/lib/crm/types";
import ExpenseFields from "../ExpenseFields";
import { saveExpense } from "../actions";

export default async function ExpensePage({ params }: PageProps<"/admin/expenses/[id]">) {
  await requireFinance();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, vehicles] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", id).maybeSingle<Expense>(),
    vehicleOptions(supabase, { includeInactive: true }),
  ]);
  if (!data) notFound();

  return (
    <>
      <PageHeader title="Edit expense" />
      <Card>
        <CrmForm
          action={saveExpense.bind(null, data.id)}
          submitLabel="Save changes"
          footer={<ButtonLink href="/admin/expenses" variant="secondary">Back</ButtonLink>}
        >
          <ExpenseFields expense={data} vehicles={vehicles} />
        </CrmForm>
      </Card>
    </>
  );
}
