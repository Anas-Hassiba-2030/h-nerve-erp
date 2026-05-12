"use client";

import type { ComponentType } from "react";
import { useFormStatus } from "react-dom";
import { Save, Loader2 } from "lucide-react";

// Submit button that auto-disables and shows a spinner while the parent form
// is in flight. Reads pending state from the closest <form action={...}>.
export function SubmitButton({
  label,
  pendingLabel,
  icon: Icon = Save,
  variant = "primary",
}: {
  label: string;
  pendingLabel?: string;
  icon?: ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "danger"
      ? "btn-danger"
      : variant === "secondary"
      ? "btn-secondary"
      : "btn-primary";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cls}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{pending ? pendingLabel ?? label : label}</span>
    </button>
  );
}
