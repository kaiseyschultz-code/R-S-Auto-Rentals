import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Vehicle } from "@/lib/square/types";

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const cheapest = [...vehicle.plans].sort((a, b) => a.priceCents - b.priceCents)[0];

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
        <Image
          src={vehicle.images[0]}
          alt={vehicle.name}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">
          {vehicle.category}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-ink">{vehicle.name}</h3>

        {vehicle.platforms.length > 0 && (
          <p className="mt-1 text-sm text-ink/60">{vehicle.platforms.join(" · ")}</p>
        )}

        <div className="mt-4 flex items-end justify-between">
          {cheapest ? (
            <p className="text-sm text-ink/70">
              from{" "}
              <span className="text-lg font-bold text-ink">
                {formatMoney(cheapest.priceCents, cheapest.currency)}
              </span>
              <span className="text-ink/50">/{cheapest.label.toLowerCase()}</span>
            </p>
          ) : (
            <p className="text-sm text-ink/50">Pricing coming soon</p>
          )}
          <span className="text-sm font-semibold text-brand-dark group-hover:underline">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
