import { notFound } from "next/navigation";
import { getVehicle } from "@/lib/square/catalog";
import BookingWizard from "@/components/booking/BookingWizard";

export default async function BookVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getVehicle(id);
  if (!vehicle || vehicle.plans.length === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Book {vehicle.name}</h1>
      <p className="mt-2 text-ink/60">Reserve your rental in a few quick steps.</p>

      <div className="mt-10">
        <BookingWizard vehicle={vehicle} />
      </div>
    </div>
  );
}
