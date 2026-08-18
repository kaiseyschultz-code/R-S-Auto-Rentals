const testimonials = [
  {
    quote: "I picked up a car same-day and was driving for Uber within the hour. No dealership runaround.",
    name: "Marcus T.",
    context: "Uber driver",
  },
  {
    quote: "Weekly rate beat every rental counter near me, and swapping vehicles when mine needed service was painless.",
    name: "Janelle R.",
    context: "DoorDash driver",
  },
  {
    quote: "Needed a car for two weeks between trading in mine and buying a new one. Simple and fast.",
    name: "Priya S.",
    context: "Local renter",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-ink py-20 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight">What renters say</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl bg-white/5 p-6">
              <blockquote className="text-white/80">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-brand">
                {t.name} <span className="font-normal text-white/50">— {t.context}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
