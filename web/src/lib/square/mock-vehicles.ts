import type { Vehicle } from "./types";

/**
 * Placeholder inventory used only when SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID
 * are not set, so the site is browsable before the Square Catalog is populated.
 * Once Square is configured, getVehicles()/getVehicle() read from the real catalog instead.
 */
export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "mock-camry",
    name: "Toyota Camry",
    category: "Sedan",
    description:
      "Reliable, fuel-efficient sedan — a favorite for rideshare and delivery drivers.",
    images: ["/vehicles/placeholder-sedan.svg"],
    plans: [
      { variationId: "mock-camry-daily", label: "Daily", priceCents: 5900, currency: "USD" },
      { variationId: "mock-camry-weekly", label: "Weekly", priceCents: 19900, currency: "USD" },
    ],
    specs: { make: "Toyota", model: "Camry", year: "2022", "Mileage Limit": "200 mi/day", Seats: "5" },
    platforms: ["Uber", "Lyft"],
  },
  {
    id: "mock-fusion",
    name: "Ford Fusion",
    category: "Sedan",
    description: "Comfortable midsize sedan with great trunk space for deliveries.",
    images: ["/vehicles/placeholder-sedan.svg"],
    plans: [
      { variationId: "mock-fusion-daily", label: "Daily", priceCents: 5400, currency: "USD" },
      { variationId: "mock-fusion-weekly", label: "Weekly", priceCents: 17900, currency: "USD" },
    ],
    specs: { make: "Ford", model: "Fusion", year: "2021", "Mileage Limit": "200 mi/day", Seats: "5" },
    platforms: ["DoorDash", "Lyft"],
  },
  {
    id: "mock-pacifica",
    name: "Chrysler Pacifica",
    category: "Minivan",
    description: "Spacious minivan, ideal for large deliveries and family trips alike.",
    images: ["/vehicles/placeholder-suv.svg"],
    plans: [
      { variationId: "mock-pacifica-daily", label: "Daily", priceCents: 7900, currency: "USD" },
      { variationId: "mock-pacifica-weekly", label: "Weekly", priceCents: 27900, currency: "USD" },
    ],
    specs: { make: "Chrysler", model: "Pacifica", year: "2023", "Mileage Limit": "200 mi/day", Seats: "7" },
    platforms: ["Uber", "DoorDash", "Instacart"],
  },
];
