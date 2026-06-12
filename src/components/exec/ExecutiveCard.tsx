// ExecutiveCard — premium card primitive with branded accent stripe + depth.
// Replaces flat .card on hero modules.

import React from "react";

export type ExecTone = "brand" | "emerald" | "amber" | "rose" | "blue" | "violet" | "slate";

export function ExecutiveCard({
  tone,
  glow = false,
  className = "",
  style,
  children,
  as: As = "div",
}: {
  tone?: ExecTone;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  as?: any;
}) {
  return (
    <As
      className={`exec-card ${className}`}
      data-tone={tone}
      data-glow={glow ? "true" : undefined}
      style={style}
    >
      {children}
    </As>
  );
}
