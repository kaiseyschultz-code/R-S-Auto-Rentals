import { NextResponse } from "next/server";

type ContactRequest = {
  name?: string;
  email?: string;
  message?: string;
};

/**
 * Stub — logs the submission for now. Wire this up to an email/notification
 * service (Resend, SendGrid, etc.) or write it into the CRM's `leads` table
 * once the backend is connected.
 */
export async function POST(request: Request) {
  const { name, email, message } = (await request.json()) as ContactRequest;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "name, email, and message are required" }, { status: 400 });
  }

  console.log("[contact] new inquiry", { name, email, message });

  return NextResponse.json({ ok: true });
}
