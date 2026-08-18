"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Vehicle } from "@/lib/square/types";

const STEPS = ["Dates & Plan", "Your Info", "Agreement", "Review & Pay"] as const;

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(startISO: string, endISO: string) {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export default function BookingWizard({ vehicle }: { vehicle: Vehicle }) {
  const [step, setStep] = useState(0);
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [returnDate, setReturnDate] = useState(todayISO(1));
  const [planId, setPlanId] = useState(vehicle.plans[0]?.variationId ?? "");
  const [renterName, setRenterName] = useState("");
  const [renterEmail, setRenterEmail] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = vehicle.plans.find((p) => p.variationId === planId);
  const days = daysBetween(pickupDate, returnDate);
  const isWeekly = selectedPlan?.label.toLowerCase().includes("week") ?? false;
  const quantity = isWeekly ? Math.ceil(days / 7) : days;
  const totalCents = selectedPlan ? selectedPlan.priceCents * quantity : 0;

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(selectedPlan) && returnDate > pickupDate;
      case 1:
        return renterName.trim().length > 1 && /.+@.+\..+/.test(renterEmail) && renterPhone.trim().length > 6;
      case 2:
        return agreed && signature.trim().length > 1;
      default:
        return true;
    }
  }, [step, selectedPlan, pickupDate, returnDate, renterName, renterEmail, renterPhone, agreed, signature]);

  async function handleCheckout() {
    if (!selectedPlan) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationId: selectedPlan.variationId,
          quantity,
          vehicleName: vehicle.name,
          renterEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong starting checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <ol className="flex flex-wrap gap-2 text-xs font-medium text-ink/50">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`rounded-full px-3 py-1 ${
                i === step ? "bg-ink text-white" : i < step ? "bg-brand/20 text-brand-dark" : "bg-black/5"
              }`}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-black/10 p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-ink/50">Choose a plan</h2>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {vehicle.plans.map((plan) => (
                    <button
                      key={plan.variationId}
                      type="button"
                      onClick={() => setPlanId(plan.variationId)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        planId === plan.variationId
                          ? "border-brand-dark bg-brand/10"
                          : "border-black/10 hover:border-black/20"
                      }`}
                    >
                      <span className="block font-semibold text-ink">{plan.label}</span>
                      <span className="text-sm text-ink/60">
                        {formatMoney(plan.priceCents, plan.currency)}/{plan.label.toLowerCase()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink/50">Pickup date</span>
                  <input
                    type="date"
                    value={pickupDate}
                    min={todayISO()}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink/50">Return date</span>
                  <input
                    type="date"
                    value={returnDate}
                    min={pickupDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-ink/50">Full name</span>
                <input
                  value={renterName}
                  onChange={(e) => setRenterName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="Jordan Lee"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/50">Email</span>
                <input
                  type="email"
                  value={renterEmail}
                  onChange={(e) => setRenterEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="you@email.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink/50">Phone</span>
                <input
                  type="tel"
                  value={renterPhone}
                  onChange={(e) => setRenterPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="(772) 555-0100"
                />
              </label>
              <p className="rounded-lg bg-black/5 px-4 py-3 text-xs text-ink/60">
                After booking, you&apos;ll receive a secure link to complete ID verification before pickup.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="max-h-48 overflow-y-auto rounded-lg bg-black/5 p-4 text-sm text-ink/70">
                <p className="font-semibold text-ink">R&S Auto Rentals — Rental Agreement Summary</p>
                <p className="mt-2">
                  By signing, you agree to return the vehicle by the scheduled date in the condition
                  it was received, remain within any mileage limit for your plan, carry valid insurance
                  and a valid driver&apos;s license for the rental period, and accept responsibility for
                  tolls, tickets, and damage incurred during the rental.
                </p>
                {vehicle.specs["Mileage Limit"] && (
                  <p className="mt-2">Mileage limit for this vehicle: {vehicle.specs["Mileage Limit"]}.</p>
                )}
              </div>

              <label className="flex items-start gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                I have read and agree to the Rental Agreement.
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink/50">Type your full name to sign</span>
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 font-serif text-lg italic outline-none focus:border-brand"
                  placeholder="Your full name"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-sm">
              <SummaryRow label="Vehicle" value={vehicle.name} />
              <SummaryRow label="Plan" value={`${selectedPlan?.label} × ${quantity}`} />
              <SummaryRow label="Pickup" value={pickupDate} />
              <SummaryRow label="Return" value={returnDate} />
              <SummaryRow label="Renter" value={`${renterName} · ${renterEmail}`} />
              <SummaryRow label="Total" value={formatMoney(totalCents)} strong />
              <p className="rounded-lg bg-black/5 px-4 py-3 text-xs text-ink/60">
                You&apos;ll be redirected to a secure Square checkout page to complete payment.
              </p>
              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-ink/60 disabled:opacity-0"
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCheckout}
                className="rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {submitting ? "Redirecting…" : "Continue to Payment"}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-black/10 p-6">
        <h2 className="font-semibold text-ink">{vehicle.name}</h2>
        <p className="mt-1 text-sm text-ink/60">{vehicle.category}</p>
        <div className="mt-4 space-y-2 border-t border-black/5 pt-4 text-sm">
          <SummaryRow label="Plan" value={selectedPlan ? `${selectedPlan.label} × ${quantity}` : "—"} />
          <SummaryRow label="Total" value={formatMoney(totalCents)} strong />
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/50">{label}</span>
      <span className={strong ? "text-base font-bold text-ink" : "font-medium text-ink"}>{value}</span>
    </div>
  );
}
