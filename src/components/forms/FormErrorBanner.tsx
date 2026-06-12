"use client";

import { AlertTriangle } from "lucide-react";

// Top-of-form banner for errors that aren't tied to a specific field.
export function FormErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="form-error-banner" role="alert">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
