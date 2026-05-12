"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

// Wraps a single form control with label, helper text, error display, and
// proper aria-invalid / aria-describedby wiring. Pass the bare <input> /
// <select> / <textarea> as children — Field injects id + aria attrs onto it
// via cloneElement so consumers don't have to thread them manually.
export function Field({
  name,
  label,
  htmlFor,
  error,
  help,
  required,
  children,
  className,
}: {
  name: string;
  label: string;
  htmlFor?: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
  // Optional extra class on the field wrapper (e.g. "sm:col-span-2")
  className?: string;
}) {
  const id = htmlFor ?? name;
  const errId = `${id}-error`;
  const helpId = `${id}-help`;
  const hasError = !!error;
  const describedBy =
    [hasError ? errId : null, !hasError && help ? helpId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const augmented = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        id,
        name: (children.props as any).name ?? name,
        "aria-invalid": hasError || undefined,
        "aria-describedby": describedBy,
        "data-error": hasError ? "true" : undefined,
        required: required ?? (children.props as any).required,
      })
    : children;

  return (
    <div className={`form-field${className ? ` ${className}` : ""}`}>
      <label className="label" htmlFor={id}>
        {label}
        {required ? (
          <span className="form-field-required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="form-field-input">
        {augmented}
        {hasError ? (
          <span className="form-field-icon" aria-hidden>
            <AlertCircle className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      {hasError ? (
        <span id={errId} className="form-field-error" role="alert">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
          {error}
        </span>
      ) : help ? (
        <span id={helpId} className="help">
          {help}
        </span>
      ) : null}
    </div>
  );
}
