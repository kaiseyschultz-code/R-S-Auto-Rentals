export type RentalPlan = {
  /** Square catalog ITEM_VARIATION id — used as the line item when creating a checkout link. */
  variationId: string;
  /** e.g. "Daily", "Weekly" — taken from the variation name in Square. */
  label: string;
  priceCents: number;
  currency: string;
};

export type Vehicle = {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  plans: RentalPlan[];
  /** Free-form spec sheet, populated from Square custom attributes if configured (make, model, year, mileage limit, seats, etc). */
  specs: Record<string, string>;
  platforms: string[];
};
