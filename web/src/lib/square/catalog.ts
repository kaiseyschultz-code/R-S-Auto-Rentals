import { cache } from "react";
import type { CatalogObject } from "square";
import { getSquareClient, isSquareConfigured } from "./client";
import { MOCK_VEHICLES } from "./mock-vehicles";
import type { RentalPlan, Vehicle } from "./types";

const SPEC_ATTRIBUTE_NAMES = ["Make", "Model", "Year", "Mileage Limit", "Seats", "Platforms"];

function toVehicle(
  item: Extract<CatalogObject, { type: "ITEM" }>,
  imagesById: Map<string, string>,
  categoriesById: Map<string, string>
): Vehicle | null {
  const itemData = item.itemData;
  if (!itemData?.name) return null;

  const plans: RentalPlan[] = (itemData.variations ?? [])
    .filter((v): v is Extract<CatalogObject, { type: "ITEM_VARIATION" }> => v.type === "ITEM_VARIATION")
    .map((v) => {
      const data = v.itemVariationData;
      const price = data?.priceMoney;
      if (!data?.name || price?.amount == null) return null;
      const plan: RentalPlan = {
        variationId: v.id,
        label: data.name,
        priceCents: Number(price.amount),
        currency: String(price.currency ?? "USD"),
      };
      return plan;
    })
    .filter((p): p is RentalPlan => p !== null);

  const images = (itemData.imageIds ?? [])
    .map((id) => imagesById.get(id))
    .filter((url): url is string => Boolean(url));

  const category = itemData.categories?.[0]?.id
    ? categoriesById.get(itemData.categories[0].id) ?? "Vehicle"
    : "Vehicle";

  const specs: Record<string, string> = {};
  const platforms: string[] = [];
  for (const attr of Object.values(item.customAttributeValues ?? {})) {
    if (!attr.name || !SPEC_ATTRIBUTE_NAMES.includes(attr.name)) continue;
    const value = attr.stringValue ?? attr.numberValue ?? attr.selectionUidValues?.join(", ");
    if (!value) continue;
    if (attr.name === "Platforms") {
      platforms.push(...value.split(",").map((p) => p.trim()).filter(Boolean));
    } else {
      specs[attr.name] = value;
    }
  }

  return {
    id: item.id,
    name: itemData.name,
    category,
    description: itemData.descriptionPlaintext ?? itemData.description ?? "",
    images: images.length > 0 ? images : ["/vehicles/placeholder-sedan.svg"],
    plans,
    specs,
    platforms,
  };
}

/**
 * Fetches all vehicles from the Square Catalog (items of type ITEM).
 * Falls back to placeholder inventory until Square credentials are configured,
 * so the site is browsable during development. See .env.example.
 */
export const getVehicles = cache(async (): Promise<Vehicle[]> => {
  if (!isSquareConfigured()) return MOCK_VEHICLES;

  const client = getSquareClient();
  const imagesById = new Map<string, string>();
  const categoriesById = new Map<string, string>();
  const items: Extract<CatalogObject, { type: "ITEM" }>[] = [];

  const page = await client.catalog.list({ types: "ITEM,IMAGE,CATEGORY" });
  for await (const obj of page) {
    if (obj.type === "IMAGE" && obj.imageData?.url) {
      imagesById.set(obj.id, obj.imageData.url);
    } else if (obj.type === "CATEGORY" && obj.id && obj.categoryData?.name) {
      categoriesById.set(obj.id, obj.categoryData.name);
    } else if (obj.type === "ITEM") {
      items.push(obj);
    }
  }

  return items
    .map((item) => toVehicle(item, imagesById, categoriesById))
    .filter((v): v is Vehicle => v !== null);
});

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  const vehicles = await getVehicles();
  return vehicles.find((v) => v.id === id);
}
