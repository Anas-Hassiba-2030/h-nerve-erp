"use client";

// ConveneSubmit — a submit button that reflects the enclosing <form action>'s
// in-flight state. The council "Convene" and "Debate with sub-agents" buttons
// used to be plain <button type="submit">s with no pending feedback: the user
// clicked, nothing visibly changed for the whole (stub-mode) wait, so they
// clicked again and again — each re-running the action. A spinner + auto-disable
// kills that "feels broken / frozen" perception and prevents double-convene.
//
// MUST be rendered INSIDE the <form> — useFormStatus reads the nearest parent
// form's pending state, so it cannot live in the same component that renders
// the <form> tag.

import type { CSSProperties, ComponentType } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function ConveneSubmit({
  label,
  pendingLabel,
  icon: Icon,
  className,
  style,
  disabled = false,
}: {
  label: string;
  pendingLabel: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
  style?: CSSProperties;
  /** Extra disable condition (e.g. topic too short). Pending always disables. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const blocked = pending || disabled;

  const mergedStyle: CSSProperties | undefined = style
    ? {
        ...style,
        ...(pending
          ? { cursor: "wait", opacity: 0.8 }
          : disabled
          ? { cursor: "not-allowed", opacity: 0.5 }
          : null),
      }
    : undefined;

  return (
    <button
      type="submit"
      disabled={blocked}
      aria-busy={pending || undefined}
      className={className}
      style={mergedStyle}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
      ) : Icon ? (
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      ) : null}
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
