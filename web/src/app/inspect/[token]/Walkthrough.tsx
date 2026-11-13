"use client";

import { useEffect, useRef, useState } from "react";
import AngleDiagram from "@/components/inspections/AngleDiagram";
import { ANGLES, FUEL_LEVELS, type AngleId } from "@/lib/inspections/angles";

type Step = "intro" | "shoot" | "details" | "done";
type Coords = { lat: number; lng: number } | null;

const btn =
  "w-full rounded-full px-5 py-3.5 text-base font-semibold transition disabled:opacity-50";
const primary = `${btn} bg-ink text-white active:bg-brand-dark`;
const secondary = `${btn} border border-black/15 bg-white text-ink`;

export default function Walkthrough({
  token,
  kind,
  vehicleName,
  plate,
  firstName,
  done: initiallyDone,
}: {
  token: string;
  kind: "pickup" | "return";
  vehicleName: string;
  plate: string | null;
  firstName: string;
  done: string[];
}) {
  const [step, setStep] = useState<Step>("intro");
  const [done, setDone] = useState<Set<string>>(() => new Set(initiallyDone));
  const firstOpen = ANGLES.findIndex((a) => !initiallyDone.includes(a.id));
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [shareLocation, setShareLocation] = useState(false);
  const allDone = done.size === ANGLES.length;

  return (
    <div className="mx-auto max-w-md px-5 pb-10 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> R&S Auto Rentals
        </span>
        {step === "shoot" && (
          <span className="text-sm font-semibold text-ink/60">
            {done.size}/{ANGLES.length} photos
          </span>
        )}
      </header>

      {step === "intro" && (
        <section>
          <h1 className="text-2xl font-semibold leading-tight text-ink">
            {firstName ? `Hi ${firstName}! ` : ""}Let&apos;s record the {vehicleName}&apos;s condition
          </h1>
          <p className="mt-2 text-ink/70">
            {kind === "pickup" ? "Before you drive off" : "Now that you're returning it"}, we&apos;ll walk you around
            the car for {ANGLES.length} quick photos. It takes about 5 minutes and protects you as much as us.
            {plate && <span className="block pt-1 text-sm text-ink/50">Plate {plate}</span>}
          </p>
          <ul className="mt-5 space-y-2 text-sm text-ink/70">
            <li>• Good light helps. If it&apos;s dark, turn on your camera&apos;s flash.</li>
            <li>• Fit the whole area in each photo, a few steps back.</li>
            <li>• Already-taken photos are saved, so you can pick up where you left off.</li>
          </ul>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-black/10 bg-white p-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={shareLocation}
              onChange={(e) => setShareLocation(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[var(--brand)]"
            />
            <span>
              Add my location to the photos <span className="text-ink/50">(optional, helps confirm where they were taken)</span>
            </span>
          </label>
          <button className={`${primary} mt-6`} onClick={() => setStep(allDone ? "details" : "shoot")}>
            {done.size > 0 ? "Continue" : "Start"}
          </button>
        </section>
      )}

      {step === "shoot" && (
        <ShotStep
          key={ANGLES[index].id}
          token={token}
          angleIndex={index}
          alreadyDone={done.has(ANGLES[index].id)}
          shareLocation={shareLocation}
          onUploaded={(id) => {
            const next = new Set(done).add(id);
            setDone(next);
            const after = ANGLES.findIndex((a, i) => i > index && !next.has(a.id));
            const anyOpen = ANGLES.findIndex((a) => !next.has(a.id));
            if (after !== -1) setIndex(after);
            else if (anyOpen !== -1) setIndex(anyOpen);
            else setStep("details");
          }}
          onSkipTo={(i) => setIndex(i)}
          done={done}
          onFinish={() => setStep("details")}
        />
      )}

      {step === "details" && (
        <DetailsStep
          token={token}
          kind={kind}
          onBack={() => {
            setIndex(0);
            setStep("shoot");
          }}
          onDone={() => setStep("done")}
        />
      )}

      {step === "done" && (
        <section className="pt-10 text-center">
          <p className="text-5xl">✓</p>
          <h1 className="mt-4 text-2xl font-semibold text-ink">Thanks, you&apos;re all set</h1>
          <p className="mt-2 text-ink/70">
            We&apos;ve saved your {kind} condition report. {kind === "pickup" ? "Drive safe!" : "Thanks for renting with R&S."}
          </p>
        </section>
      )}
    </div>
  );
}

function ShotStep({
  token,
  angleIndex,
  alreadyDone,
  shareLocation,
  onUploaded,
  onSkipTo,
  done,
  onFinish,
}: {
  token: string;
  angleIndex: number;
  alreadyDone: boolean;
  shareLocation: boolean;
  onUploaded: (id: AngleId) => void;
  onSkipTo: (i: number) => void;
  done: Set<string>;
  onFinish: () => void;
}) {
  const angle = ANGLES[angleIndex];
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; takenAt: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const allDone = done.size === ANGLES.length;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setStatus("processing");
    const takenAt = new Date().toISOString();
    const blob = await shrink(file);
    setPreview({ url: URL.createObjectURL(blob), blob, takenAt });
    setStatus("idle");
  }

  async function upload() {
    if (!preview) return;
    setStatus("uploading");
    setError(null);
    const coords = shareLocation ? await locate() : null;
    const body = new FormData();
    body.set("angle", angle.id);
    body.set("photo", preview.blob, `${angle.id}.jpg`);
    body.set("taken_at", preview.takenAt);
    if (coords) {
      body.set("lat", String(coords.lat));
      body.set("lng", String(coords.lng));
    }
    try {
      const res = await fetch(`/api/inspect/${encodeURIComponent(token)}/photo`, { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setStatus("idle");
      onUploaded(angle.id);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  return (
    <section>
      {/* progress dots: tap any to (re)take it */}
      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Shot list">
        {ANGLES.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSkipTo(i)}
            aria-label={`${a.label}${done.has(a.id) ? " (done)" : ""}`}
            className={`h-2.5 flex-1 rounded-full ${
              i === angleIndex ? "bg-ink" : done.has(a.id) ? "bg-brand" : "bg-black/10"
            }`}
          />
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        Photo {angleIndex + 1} of {ANGLES.length}
        {alreadyDone && " · already taken"}
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-ink">{angle.label}</h2>
      <p className="mt-1 text-ink/70">{angle.tip}</p>

      <div className="mt-4 flex justify-center rounded-2xl border border-black/5 bg-white py-4 text-ink">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={preview.url} alt={`${angle.label} preview`} className="max-h-72 rounded-xl object-contain" />
        ) : (
          <AngleDiagram angle={angle} size={180} />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-5 space-y-3">
        {preview ? (
          <>
            <button className={primary} onClick={upload} disabled={status === "uploading"}>
              {status === "uploading" ? "Saving…" : status === "error" ? "Try again" : "Use this photo"}
            </button>
            <button className={secondary} onClick={() => inputRef.current?.click()} disabled={status === "uploading"}>
              Retake
            </button>
          </>
        ) : (
          <button className={primary} onClick={() => inputRef.current?.click()} disabled={status === "processing"}>
            {status === "processing" ? "Preparing…" : alreadyDone ? "Retake photo" : "Take photo"}
          </button>
        )}
        {allDone && !preview && (
          <button className={secondary} onClick={onFinish}>
            All photos done, continue
          </button>
        )}
      </div>
    </section>
  );
}

function DetailsStep({
  token,
  kind,
  onBack,
  onDone,
}: {
  token: string;
  kind: "pickup" | "return";
  onBack: () => void;
  onDone: () => void;
}) {
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState<string>("");
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!odometer || !fuel || !agree || !name.trim()) {
      setError("Fill in the mileage and fuel level, tick the statement and type your name.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/inspect/${encodeURIComponent(token)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          odometer: Number(odometer.replace(/,/g, "")),
          fuel_level: fuel,
          confirm: agree,
          renter_name: name.trim(),
          signature,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Couldn't submit.");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit.");
      setSending(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Last step</h2>
        <p className="mt-1 text-ink/70">Read these off the dashboard, then sign.</p>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-ink">Odometer (miles)</span>
        <input
          inputMode="numeric"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value.replace(/[^\d,]/g, ""))}
          className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-lg text-ink outline-none focus:border-brand"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Fuel level</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {FUEL_LEVELS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFuel(f.id)}
              className={`rounded-xl border py-3 text-sm font-semibold ${
                fuel === f.id ? "border-ink bg-ink text-white" : "border-black/15 bg-white text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
        />
        <span>
          I confirm these photos and readings show the vehicle&apos;s condition at {kind}, and I haven&apos;t left out any
          damage I know about.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-ink">Type your full name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-lg text-ink outline-none focus:border-brand"
        />
      </label>

      <SignaturePad onChange={setSignature} />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <button className={primary} onClick={submit} disabled={sending}>
        {sending ? "Submitting…" : "Submit condition report"}
      </button>
      <button className={secondary} onClick={onBack} disabled={sending}>
        Back to photos
      </button>
    </section>
  );
}

/** Minimal finger/mouse signature pad. Reports a PNG data URL (or null when cleared) after each stroke. */
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0b1220";
    }
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Sign with your finger (optional)</span>
        <button
          type="button"
          onClick={() => {
            const c = canvasRef.current;
            c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
            onChange(null);
          }}
          className="text-sm font-semibold text-brand-dark"
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="mt-1 h-36 w-full touch-none rounded-xl border border-black/15 bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const p = point(e);
          const ctx = e.currentTarget.getContext("2d");
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = point(e);
          const ctx = e.currentTarget.getContext("2d");
          ctx?.lineTo(p.x, p.y);
          ctx?.stroke();
        }}
        onPointerUp={(e) => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
    </div>
  );
}

/** Downscale to ≤1920px JPEG so uploads are quick on mobile data. Falls back to the original file. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

function locate(): Promise<Coords> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  });
}
