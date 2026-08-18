import Link from "next/link";
import { getVehicles } from "@/lib/square/catalog";
import VehicleCard from "@/components/vehicles/VehicleCard";

export default async function FeaturedVehicles() {
  const vehicles = (await getVehicles()).slice(0, 3);

  if (vehicles.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-ink">Available near you</h2>
          <p className="mt-2 text-ink/60">Ready for pickup this week.</p>
        </div>
        <Link href="/vehicles" className="hidden text-sm font-semibold text-brand-dark hover:underline md:block">
          View all vehicles →
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </section>
  );
}
