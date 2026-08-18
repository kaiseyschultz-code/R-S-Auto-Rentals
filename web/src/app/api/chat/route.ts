import { NextResponse } from "next/server";

type ChatRequest = {
  message?: string;
};

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["price", "cost", "rate", "how much"],
    answer:
      "Our vehicles rent daily or weekly — pricing is shown on each vehicle's page and updates as you pick a plan. Weekly plans work out cheaper per day and are popular with gig drivers.",
  },
  {
    keywords: ["mileage", "miles"],
    answer:
      "Each vehicle lists its mileage limit on its detail page. Extra miles beyond the limit are billed at checkout.",
  },
  {
    keywords: ["insurance"],
    answer:
      "You'll need to provide proof of insurance during booking, or ask us about add-on coverage options for your rental.",
  },
  {
    keywords: ["id", "license", "verify", "verification"],
    answer:
      "We verify every renter's ID before pickup. You'll get a secure link to complete verification as part of the booking flow.",
  },
  {
    keywords: ["book", "booking", "reserve", "rent"],
    answer:
      "Pick a vehicle from our Browse page, choose daily or weekly, and follow the booking flow — it walks you through your dates, ID verification, and the rental agreement before payment.",
  },
];

function answerFor(message: string): string {
  const lower = message.toLowerCase();
  const match = FAQ.find((faq) => faq.keywords.some((k) => lower.includes(k)));
  if (match) return match.answer;
  return "I can help with pricing, mileage limits, insurance, ID verification, or booking a vehicle. What would you like to know?";
}

/**
 * Stubbed assistant — swap this for a real call to the Claude or OpenAI API
 * (pass `message` plus recent history) once a provider/key is chosen.
 */
export async function POST(request: Request) {
  const { message } = (await request.json()) as ChatRequest;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  return NextResponse.json({ reply: answerFor(message) });
}
