import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/crm/session";
import { day, dollars, fullName, label } from "@/lib/crm/format";
import { INVOICE_STATUSES } from "@/lib/crm/types";
import { Badge, ButtonLink, EmptyState, FilterTabs, PageHeader, rowLink, Table, td } from "@/components/crm/ui";
import { rows } from "@/lib/crm/rows";

type Row = {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string;
  due_date: string | null;
  paid_date: string | null;
  customer: { first_name: string; last_name: string } | null;
};

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireFinance();
  const { status } = await searchParams;
  const filter = typeof status === "string" && (INVOICE_STATUSES as readonly string[]).includes(status) ? status : null;

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, issued_date, due_date, paid_date, customer:customers(first_name,last_name)")
    .order("issued_date", { ascending: false })
    .order("invoice_number", { ascending: false })
    .limit(300);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const invoices = rows<Row>(data);
  const total = invoices.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} ${filter ? label(filter).toLowerCase() : ""} · ${dollars(total)}`}
        action={<ButtonLink href="/admin/invoices/new">New invoice</ButtonLink>}
      />
      <FilterTabs base="/admin/invoices" options={INVOICE_STATUSES} current={filter} />
      {invoices.length === 0 ? (
        <EmptyState>No invoices here.</EmptyState>
      ) : (
        <Table head={["Invoice", "Customer", "Amount", "Status", "Issued", "Due", "Paid"]}>
          {invoices.map((i) => (
            <tr key={i.id}>
              <td className={td}>
                <Link href={`/admin/invoices/${i.id}`} className={rowLink}>
                  {i.invoice_number}
                </Link>
              </td>
              <td className={td}>{fullName(i.customer)}</td>
              <td className={`${td} font-semibold`}>{dollars(i.amount)}</td>
              <td className={td}>
                <Badge value={i.status} />
              </td>
              <td className={td}>{day(i.issued_date)}</td>
              <td className={td}>{day(i.due_date)}</td>
              <td className={td}>{day(i.paid_date)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
