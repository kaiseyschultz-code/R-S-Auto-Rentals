"use client";

import { useActionState, type ReactNode } from "react";
import { initialActionState, type ActionState } from "@/lib/crm/form";

/**
 * Wraps a server action form: shows the action's error message and disables
 * the button while saving. Fields are passed as children (they can be
 * server-rendered).
 */
export default function CrmForm({
  action,
  submitLabel = "Save",
  children,
  footer,
  className = "space-y-6",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
