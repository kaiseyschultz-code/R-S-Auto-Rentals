import type { Metadata } from "next";
import Sidebar from "@/components/crm/Sidebar";
import { canSeeFinance, requireStaff } from "@/lib/crm/session";
import { signOut } from "../auth-actions";

export const metadata: Metadata = {
  title: "R&S Ops",
  robots: { index: false, follow: false },
};

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/rentals", label: "Rentals" },
    { href: "/admin/vehicles", label: "Vehicles" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/leads", label: "Leads" },
    ...(canSeeFinance(staff)
      ? [
          { href: "/admin/invoices", label: "Invoices" },
          { href: "/admin/expenses", label: "Expenses" },
        ]
      : []),
    ...(staff.role === "owner" ? [{ href: "/admin/team", label: "Team" }] : []),
  ];

  return (
    <div className="min-h-screen bg-black/[0.02] lg:flex">
      <Sidebar
        items={items}
        user={{ name: staff.full_name ?? staff.email, role: staff.role }}
        signOut={signOut}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
