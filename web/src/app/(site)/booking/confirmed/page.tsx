import Link from "next/link";

export default function BookingConfirmedPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/20 text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">You&apos;re booked!</h1>
      <p className="mt-3 text-ink/60">
        Check your email for your receipt and next steps, including how to complete ID
        verification before pickup.
      </p>
      <Link
        href="/vehicles"
        className="mt-8 inline-block rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Browse more vehicles
      </Link>
    </div>
  );
}
