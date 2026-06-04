"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils/utils";

// Smooth count-up for a single numeric KPI. Formats every frame with the
// SAME lib/utils formatter the server uses, so the final frame is byte-identical
// to a static server render (no flicker on hydration settle).
//
// Two deliberate timing choices:
//  - `startDelayMs` lets the caller begin the count-up AFTER the tile's
//    entrance animation (heri-rise) finishes, so the eye reads one motion at a
//    time instead of a number racing while its tile is still sliding in.
//  - prefers-reduced-motion short-circuits straight to the final value.
type Kind = "money" | "percent" | "number";

export function CountUpValue({
  raw,
  kind,
  decimals = 0,
  durationMs = 650,
  startDelayMs = 0,
  className,
  style,
}: {
  raw: number;
  kind: Kind;
  decimals?: number;
  durationMs?: number;
  startDelayMs?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(raw);
      return;
    }
    let rafId = 0;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      if (elapsed < startDelayMs) {
        rafId = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(1, (elapsed - startDelayMs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(raw * eased);
      if (t < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [raw, durationMs, startDelayMs]);

  const text =
    kind === "money"
      ? formatMoney(display)
      : kind === "percent"
        ? formatPercent(display, decimals)
        : formatNumber(display, decimals);

  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}
