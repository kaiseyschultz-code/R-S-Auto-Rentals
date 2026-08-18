import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--brand)_0%,_transparent_45%)] opacity-30" />

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          Port Saint Lucie, FL
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Wheels on your terms. Daily or weekly.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          A private fleet built for Uber, DoorDash, and Lyft drivers — plus anyone who
          needs flexible transportation without a long-term commitment.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/vehicles"
            className="rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Browse Vehicles
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            How It Works
          </Link>
        </div>
      </div>
    </section>
  );
}
