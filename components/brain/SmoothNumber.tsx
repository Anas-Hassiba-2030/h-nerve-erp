"use client";

// SmoothNumber — animated tabular number that eases from old → new value
// whenever `value` changes. Uses ease-out-quart over 350ms (DESIGN-SKILL §4.1).
//
// Always renders with tabular figures so the digits never jitter.
// When the value changes, the wrapper flashes a faint ochre background for 220ms
// (a discreet "this just changed" cue — see DESIGN-SKILL §4.4 number ticker).

import { useEffect, useRef, useState, useMemo } from "react";

export function SmoothNumber({
  value,
  format = "integer",
  unit,
  durationMs = 380,
  flash = true,
  className,
  style,
}: {
  value: number;
  format?: "integer" | "decimal2" | "compact" | "percent";
  unit?: string;
  durationMs?: number;
  flash?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  const valueRef = useRef(value);
  const [flashOn, setFlashOn] = useState(false);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (Math.abs(valueRef.current - value) < 0.0001) return;
    fromRef.current = display;
    valueRef.current = value;
    startRef.current = performance.now();

    if (flash) {
      setFlashOn(true);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlashOn(false), 240);
    }

    let raf = 0;
    const tick = () => {
      const t = (performance.now() - startRef.current) / durationMs;
      if (t >= 1) {
        setDisplay(valueRef.current);
        return;
      }
      const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart
      const next =
        fromRef.current + (valueRef.current - fromRef.current) * eased;
      setDisplay(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // We deliberately don't include `display` in deps — we re-anchor on every value change above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, flash]);

  const formatted = useMemo(() => formatValue(display, format), [display, format]);

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum" 1, "ss01" 1',
        transition: "background-color 220ms cubic-bezier(0.25,1,0.5,1)",
        backgroundColor: flashOn
          ? "color-mix(in srgb, var(--heri-ochre) 22%, transparent)"
          : "transparent",
        padding: "0 0.15em",
        display: "inline-block",
        ...style,
      }}
    >
      {formatted}
      {unit ? (
        <span
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: "0.7em",
            opacity: 0.65,
            marginInlineStart: "0.35em",
            letterSpacing: "0.05em",
          }}
        >
          {unit}
        </span>
      ) : null}
    </span>
  );
}

function formatValue(v: number, format: "integer" | "decimal2" | "compact" | "percent"): string {
  if (!Number.isFinite(v)) return "—";
  switch (format) {
    case "integer":
      return Math.round(v).toLocaleString("en-US");
    case "decimal2":
      return v.toFixed(2);
    case "compact":
      return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
    case "percent":
      return (v * 100).toFixed(1) + "%";
  }
}
