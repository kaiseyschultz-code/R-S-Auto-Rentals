import { SquareClient, SquareEnvironment } from "square";

let cachedClient: SquareClient | null = null;

export function isSquareConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

export function getSquareClient(): SquareClient {
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    throw new Error(
      "SQUARE_ACCESS_TOKEN is not set. Add it to .env.local (see .env.example)."
    );
  }
  if (cachedClient) return cachedClient;
  cachedClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
  return cachedClient;
}

export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error(
      "SQUARE_LOCATION_ID is not set. Add it to .env.local (see .env.example)."
    );
  }
  return locationId;
}
