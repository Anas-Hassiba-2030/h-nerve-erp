"use client";

// Minimal count-up animation for the Brain hero numerals — the only piece of
// the brain.html reference that needs client JS (the orb's halo spin is pure
// CSS in brain-section.css). Counts from 0 to `value` once on mount, then holds.
// Respects prefers-reduced-motion by rendering the final value immediately.

import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  /** Locale used for digit rendering (ar → Arabic-Indic numerals). */
  locale = "en",
  suffix = "",
  durationMs = 1100,
  className,
}: {
  value: number;
  locale?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value <= 0) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const text = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(display);
  return (
    <span className={className} suppressHydrationWarning>
      {text}
      {suffix}
    </span>
  );
}
