import type { Metadata } from "next";
import { getVehicles } from "@/lib/square/catalog";
import VehicleGrid from "@/components/vehicles/VehicleGrid";

export const metadata: Metadata = {
  title: "Browse Vehicles — R&S Auto Rentals",
};

export default async function VehiclesPage() {
  const vehicles = await getVehicles();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-ink">Browse Vehicles</h1>
      <p className="mt-3 max-w-xl text-ink/60">
        Daily and weekly rentals, ready for pickup. Filter by type or platform to find the
        right fit.
      </p>

      <div className="mt-10">
        <VehicleGrid vehicles={vehicles} />
      </div>
    </div>
  );
}
