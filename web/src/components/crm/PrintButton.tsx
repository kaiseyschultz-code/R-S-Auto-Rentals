"use client";

export default function PrintButton({ label = "Print report" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      {label}
    </button>
  );
}
