const items = [
  { title: "Insured fleet", desc: "Every vehicle is maintained and insured before it's listed." },
  { title: "ID-verified renters", desc: "Every renter completes identity verification before pickup." },
  { title: "No long-term lock-in", desc: "Rent by the day or week — cancel or extend anytime." },
  { title: "Built for gig work", desc: "Mileage and terms designed for Uber, Lyft, and DoorDash drivers." },
];

export default function TrustIndicators() {
  return (
    <section className="bg-black/[0.02] py-20">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title}>
            <div className="h-1.5 w-10 rounded-full bg-brand" />
            <h3 className="mt-4 font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-sm text-ink/60">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
