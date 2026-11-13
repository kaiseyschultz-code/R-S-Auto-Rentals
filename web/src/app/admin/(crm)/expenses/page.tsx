import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { day, dollars, label, today } from "@/lib/crm/format";
import { ButtonLink, Card, EmptyState, Notice, PageHeader, rowLink, Table, td } from "@/components/crm/ui";
import { rows } from "@/lib/crm/rows";

type Row = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  vehicle: { name: string } | null;
};

export default async function ExpensesPage({ searchParams }: PageProps<"/admin/expenses">) {
  await requireFinance();
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, category, description, amount, expense_date, vehicle:vehicles(name)")
    .order("expense_date", { ascending: false })
    .limit(300);
  const expenses = rows<Row>(data);

  const month = today().slice(0, 7);
  const thisMonth = expenses.filter((e) => e.expense_date.startsWith(month));
  const byCategory = new Map<string, number>();
  for (const e of thisMonth) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  const monthTotal = thisMonth.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Costs per vehicle feed the fleet ROI on the dashboard."
        action={<ButtonLink href="/admin/expenses/new">Add expense</ButtonLink>}
      />
      {saved && <Notice tone="success">Expense saved.</Notice>}

      <Card title={`This month · ${dollars(monthTotal)}`} className="mb-6">
        {byCategory.size === 0 ? (
          <p className="text-sm text-ink/50">No expenses recorded this month.</p>
        ) : (
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {[...byCategory.entries()].map(([cat, amt]) => (
              <p key={cat} className="text-sm">
                <span className="text-ink/50">{label(cat)}</span>{" "}
                <span className="font-semibold text-ink">{dollars(amt)}</span>
              </p>
            ))}
          </div>
        )}
      </Card>

      {expenses.length === 0 ? (
        <EmptyState>No expenses yet.</EmptyState>
      ) : (
        <Table head={["Date", "Category", "Description", "Vehicle", "Amount"]}>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className={td}>
                <Link href={`/admin/expenses/${e.id}`} className={rowLink}>
                  {day(e.expense_date)}
                </Link>
              </td>
              <td className={td}>{label(e.category)}</td>
              <td className={td}>{e.description ?? "—"}</td>
              <td className={td}>{e.vehicle?.name ?? "General"}</td>
              <td className={`${td} font-semibold`}>{dollars(e.amount)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
