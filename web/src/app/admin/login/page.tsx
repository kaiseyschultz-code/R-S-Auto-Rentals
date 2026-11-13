import type { Metadata } from "next";
import Link from "next/link";
import CrmForm from "@/components/crm/CrmForm";
import { Field, inputClass, Notice } from "@/components/crm/ui";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signIn, signOut } from "../auth-actions";

export const metadata: Metadata = {
  title: "Staff login · R&S Auto Rentals",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/[0.02] px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="text-lg font-semibold tracking-tight text-ink">R&S Auto Rentals</span>
        </Link>
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-ink">Staff login</h1>
          <p className="mb-5 mt-1 text-sm text-ink/60">For R&S team members only.</p>

          {!isSupabaseConfigured() ? (
            <Notice tone="error">
              The CRM database isn&apos;t connected yet. Set the Supabase variables in
              <code> .env.local</code> (see <code>.env.example</code>).
            </Notice>
          ) : (
            <>
              {error === "no-access" && (
                <Notice tone="error">
                  You&apos;re signed in, but this login isn&apos;t set up as an active staff member.
                  Ask the owner to add you.
                  <form action={signOut} className="mt-2">
                    <button className="font-semibold underline">Sign out</button>
                  </form>
                </Notice>
              )}
              <CrmForm action={signIn} submitLabel="Sign in" className="space-y-4">
                <Field label="Email">
                  <input name="email" type="email" autoComplete="email" required className={inputClass} />
                </Field>
                <Field label="Password">
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={inputClass}
                  />
                </Field>
              </CrmForm>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
