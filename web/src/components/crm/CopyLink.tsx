"use client";

import { useState } from "react";

/** Read-only link with a copy button (until SMS/email sending is wired up). */
export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1.5 text-xs text-ink"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked: the field is selectable */
          }
        }}
        className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
