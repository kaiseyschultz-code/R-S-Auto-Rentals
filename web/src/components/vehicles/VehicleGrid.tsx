"use client";

import { useMemo, useState } from "react";
import VehicleCard from "./VehicleCard";
import type { Vehicle } from "@/lib/square/types";

const ALL = "All";

export default function VehicleGrid({ vehicles }: { vehicles: Vehicle[] }) {
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(vehicles.map((v) => v.category)))],
    [vehicles]
  );
  const platforms = useMemo(
    () => [ALL, ...Array.from(new Set(vehicles.flatMap((v) => v.platforms)))],
    [vehicles]
  );

  const [category, setCategory] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [sort, setSort] = useState<"price-asc" | "price-desc">("price-asc");

  const filtered = useMemo(() => {
    const minPrice = (v: Vehicle) =>
      v.plans.length > 0 ? Math.min(...v.plans.map((p) => p.priceCents)) : Infinity;

    return vehicles
      .filter((v) => category === ALL || v.category === category)
      .filter((v) => platform === ALL || v.platforms.includes(platform))
      .sort((a, b) => (sort === "price-asc" ? minPrice(a) - minPrice(b) : minPrice(b) - minPrice(a)));
  }, [vehicles, category, platform, sort]);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Select label="Type" value={category} onChange={setCategory} options={categories} />
        <Select label="Platform" value={platform} onChange={setPlatform} options={platforms} />
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          options={["price-asc", "price-desc"]}
          display={{ "price-asc": "Price: Low to High", "price-desc": "Price: High to Low" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-ink/60">No vehicles match those filters right now.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  display,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  display?: Record<string, string>;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
      <span className="text-ink/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-medium text-ink outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {display?.[opt] ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}
