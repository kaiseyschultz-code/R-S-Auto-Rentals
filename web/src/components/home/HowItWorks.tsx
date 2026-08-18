const steps = [
  { step: "01", title: "Pick a vehicle", desc: "Browse the fleet and choose daily or weekly pricing." },
  { step: "02", title: "Verify & sign", desc: "Confirm your ID and e-sign the rental agreement in minutes." },
  { step: "03", title: "Pick up & go", desc: "Grab your keys and hit the road — or start your shift." },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-3xl font-bold tracking-tight text-ink">How it works</h2>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.step} className="rounded-2xl border border-black/5 p-6">
            <span className="text-sm font-bold text-brand-dark">{s.step}</span>
            <h3 className="mt-3 text-lg font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm text-ink/60">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
