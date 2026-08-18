import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSquareClient, getSquareLocationId, isSquareConfigured } from "@/lib/square/client";

type CheckoutRequest = {
  variationId?: string;
  quantity?: number;
  vehicleName?: string;
  renterEmail?: string;
};

export async function POST(request: Request) {
  const { variationId, quantity = 1, vehicleName, renterEmail } =
    (await request.json()) as CheckoutRequest;

  if (!variationId) {
    return NextResponse.json({ error: "variationId is required" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "quantity must be a positive integer" }, { status: 400 });
  }

  if (!isSquareConfigured()) {
    return NextResponse.json(
      {
        error:
          "Square is not connected yet. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in .env.local to enable checkout (see .env.example).",
      },
      { status: 501 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const client = getSquareClient();

  const { paymentLink } = await client.checkout.paymentLinks.create({
    idempotencyKey: randomUUID(),
    order: {
      locationId: getSquareLocationId(),
      lineItems: [{ catalogObjectId: variationId, quantity: String(quantity) }],
    },
    checkoutOptions: {
      redirectUrl: `${siteUrl}/booking/confirmed`,
    },
    prePopulatedData: renterEmail ? { buyerEmail: renterEmail } : undefined,
    paymentNote: vehicleName ? `R&S Rentals — ${vehicleName}` : undefined,
  });

  if (!paymentLink?.url) {
    return NextResponse.json({ error: "Square did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ url: paymentLink.url });
}
