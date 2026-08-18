import type { Metadata } from "next";
import Link from "next/link";
import HowItWorks from "@/components/home/HowItWorks";
import TrustIndicators from "@/components/home/TrustIndicators";

export const metadata: Metadata = {
  title: "About & How It Works — R&S Auto Rentals",
};

export default function AboutPage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-ink">About R&S Auto Rentals</h1>
        <p className="mt-4 max-w-2xl text-ink/70">
          We&apos;re a private fleet based in Port Saint Lucie, FL, built for one simple problem:
          gig drivers and local renters need a car without dealership hassle or a long-term
          lease. Every vehicle in our fleet is maintained, insured, and ready to go — rent it
          for a day, a week, or however long you need it.
        </p>
        <Link
          href="/vehicles"
          className="mt-8 inline-block rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Browse Vehicles
        </Link>
      </div>

      <HowItWorks />
      <TrustIndicators />
    </div>
  );
}
