import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicle } from "@/lib/square/catalog";
import { formatMoney } from "@/lib/format";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/vehicles" className="text-sm font-medium text-ink/60 hover:text-ink">
        ← Back to vehicles
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
          <Image
            src={vehicle.images[0]}
            alt={vehicle.name}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </div>

        <div>
          <span className="rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold text-brand-dark">
            {vehicle.category}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{vehicle.name}</h1>
          {vehicle.description && (
            <p className="mt-4 text-ink/70">{vehicle.description}</p>
          )}

          {vehicle.platforms.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink/50">Great for</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {vehicle.platforms.map((p) => (
                  <span key={p} className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(vehicle.specs).length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-black/5 pt-6">
              {Object.entries(vehicle.specs).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-ink/40">{key}</dt>
                  <dd className="mt-1 font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-8 space-y-3 border-t border-black/5 pt-6">
            <h2 className="text-sm font-semibold text-ink/50">Pricing</h2>
            {vehicle.plans.length === 0 ? (
              <p className="text-sm text-ink/60">Pricing coming soon — contact us for a quote.</p>
            ) : (
              vehicle.plans.map((plan) => (
                <div
                  key={plan.variationId}
                  className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3"
                >
                  <span className="font-medium text-ink">{plan.label}</span>
                  <span className="font-bold text-ink">{formatMoney(plan.priceCents, plan.currency)}</span>
                </div>
              ))
            )}
          </div>

          {vehicle.plans.length > 0 && (
            <Link
              href={`/vehicles/${vehicle.id}/book`}
              className="mt-8 block rounded-full bg-ink px-7 py-4 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Book This Vehicle
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
