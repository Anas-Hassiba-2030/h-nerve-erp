"use client";

import { useEffect, useRef, useState } from "react";

// Counts up smoothly on first paint. Format options must be SERIALIZABLE
// (no function props) so this component can be used safely from server
// components.
export function AnimatedNumber({
  value,
  durationMs = 900,
  decimals = 0,
  locale = "en-US",
  prefix,
  suffix,
  // Currency mode: pass currency code (e.g. "JOD") and the number is rendered
  // via Intl.NumberFormat currency style.
  currency,
  className,
}: {
  value: number;
  durationMs?: number;
  decimals?: number;
  locale?: string;
  prefix?: string;
  suffix?: string;
  currency?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const initial = 0;
    const target = value;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(initial + (target - initial) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const formatted = currency
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: decimals,
      }).format(display)
    : new Intl.NumberFormat(locale, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(display);

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
