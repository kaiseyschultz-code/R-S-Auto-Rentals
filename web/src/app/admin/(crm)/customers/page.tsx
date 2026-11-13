import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { day } from "@/lib/crm/format";
import type { Customer } from "@/lib/crm/types";
import { Badge, ButtonLink, EmptyState, inputClass, PageHeader, rowLink, Table, td } from "@/components/crm/ui";
import { rows } from "@/lib/crm/rows";

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireStaff();
  const { q } = await searchParams;
  // Strip characters that have meaning in PostgREST filter syntax.
  const search = typeof q === "string" ? q.replace(/[,()*%\\]/g, " ").trim() : "";

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone, is_gig_worker, gig_platforms, id_verified, is_flagged, created_at")
    .order("last_name")
    .order("first_name")
    .limit(200);
  if (search) {
    const like = `%${search}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
    );
  }
  const { data } = await query;
  const customers = rows<Customer>(data);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={search ? `${customers.length} matching "${search}"` : `${customers.length} customers`}
        action={<ButtonLink href="/admin/customers/new">Add customer</ButtonLink>}
      />
      <form className="mb-4 max-w-sm">
        <input name="q" defaultValue={search} placeholder="Search name, phone or email" className={inputClass} />
      </form>
      {customers.length === 0 ? (
        <EmptyState>{search ? "No customers match that search." : "No customers yet."}</EmptyState>
      ) : (
        <Table head={["Name", "Phone", "Email", "Driver", "ID", "Added"]}>
          {customers.map((c) => (
            <tr key={c.id}>
              <td className={td}>
                <Link href={`/admin/customers/${c.id}`} className={rowLink}>
                  {c.first_name} {c.last_name}
                </Link>
                {c.is_flagged && (
                  <span className="ml-2">
                    <Badge value="overdue">Flagged</Badge>
                  </span>
                )}
              </td>
              <td className={td}>{c.phone ?? "—"}</td>
              <td className={td}>{c.email ?? "—"}</td>
              <td className={td}>{c.is_gig_worker ? c.gig_platforms?.join(", ") || "Gig" : "Personal"}</td>
              <td className={td}>
                {c.id_verified ? <Badge value="paid">Verified</Badge> : <Badge value="pending">Not verified</Badge>}
              </td>
              <td className={td}>{day(c.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
