import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact — R&S Auto Rentals",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-ink">Contact &amp; Support</h1>
        <p className="mt-4 text-ink/60">
          Questions about a booking, an active rental, or your vehicle? Reach out — we usually
          respond within a few hours.
        </p>

        <dl className="mt-8 space-y-3 text-sm">
          <div>
            <dt className="text-ink/40">Phone</dt>
            <dd className="font-medium text-ink">(772) 555-0100</dd>
          </div>
          <div>
            <dt className="text-ink/40">Email</dt>
            <dd className="font-medium text-ink">admin@rsautorentals.com</dd>
          </div>
          <div>
            <dt className="text-ink/40">Location</dt>
            <dd className="font-medium text-ink">Port Saint Lucie, FL 34953</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-black/10 p-6">
        <ContactForm />
      </div>
    </div>
  );
}
