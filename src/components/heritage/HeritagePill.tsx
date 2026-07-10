// HeritagePill — current-color dot pattern (§5.2 in docs/governance/DESIGN-SKILL.md).
// Use these instead of the rainbow `badge-*` classes when inside heritage
// modules.

import React from "react";

type Tone = "success" | "warn" | "critical" | "info" | "neutral";

export function HeritagePill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`heri-pill heri-pill-${tone} ${className ?? ""}`}>
      {children}
    </span>
  );
}
