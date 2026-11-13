// The fixed shot list for condition reports. Keep the ids in sync with the
// CHECK constraint on inspection_photos.angle (supabase migration 5).

export type AngleId =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "front_left"
  | "front_right"
  | "rear_left"
  | "rear_right"
  | "wheels"
  | "windshield"
  | "interior"
  | "odometer"
  | "fuel_gauge";

export type Angle = {
  id: AngleId;
  label: string;
  /** What the renter should do, in one short sentence. */
  tip: string;
  /** Where to stand, as a point on the top-down car diagram (0–100 box), or null for close-ups. */
  stand: { x: number; y: number } | null;
  /** Close-up subject, for shots that aren't a walk-around position. */
  closeUp?: "wheel" | "glass" | "seat" | "dial" | "fuel";
};

// Order follows one loop around the car, then the inside.
export const ANGLES: Angle[] = [
  { id: "front", label: "Front", tip: "Stand a few steps back so the whole front bumper and both headlights fit.", stand: { x: 50, y: 4 } },
  { id: "front_right", label: "Front right corner", tip: "Step to the corner so the bumper and the front of the right side are both in frame.", stand: { x: 88, y: 12 } },
  { id: "right", label: "Right side", tip: "Back up until both right-side wheels are in the photo.", stand: { x: 96, y: 50 } },
  { id: "rear_right", label: "Rear right corner", tip: "Get the rear bumper and the back of the right side together.", stand: { x: 88, y: 88 } },
  { id: "rear", label: "Rear", tip: "Whole rear bumper, both taillights and the plate.", stand: { x: 50, y: 96 } },
  { id: "rear_left", label: "Rear left corner", tip: "Rear bumper and the back of the left side together.", stand: { x: 12, y: 88 } },
  { id: "left", label: "Left side", tip: "Back up until both left-side wheels are in the photo.", stand: { x: 4, y: 50 } },
  { id: "front_left", label: "Front left corner", tip: "Bumper and the front of the left side together.", stand: { x: 12, y: 12 } },
  { id: "wheels", label: "Wheels and tires", tip: "Crouch down and photograph the wheel with the most wear or any curb rash.", stand: null, closeUp: "wheel" },
  { id: "windshield", label: "Windshield", tip: "From outside, capture the whole windshield. Look for chips or cracks.", stand: null, closeUp: "glass" },
  { id: "interior", label: "Interior", tip: "From the open driver door, show the seats, dash and floor.", stand: null, closeUp: "seat" },
  { id: "odometer", label: "Odometer", tip: "Turn the car on and photograph the mileage so the numbers are readable.", stand: null, closeUp: "dial" },
  { id: "fuel_gauge", label: "Fuel gauge", tip: "Photograph the fuel gauge with the car on.", stand: null, closeUp: "fuel" },
];

export const ANGLE_IDS = ANGLES.map((a) => a.id);

export function isAngle(value: unknown): value is AngleId {
  return typeof value === "string" && (ANGLE_IDS as string[]).includes(value);
}

export const FUEL_LEVELS = [
  { id: "empty", label: "Empty" },
  { id: "quarter", label: "1/4" },
  { id: "half", label: "1/2" },
  { id: "three_quarters", label: "3/4" },
  { id: "full", label: "Full" },
] as const;

export type FuelLevel = (typeof FUEL_LEVELS)[number]["id"];

export function fuelLabel(id: string | null | undefined): string {
  return FUEL_LEVELS.find((f) => f.id === id)?.label ?? "—";
}
