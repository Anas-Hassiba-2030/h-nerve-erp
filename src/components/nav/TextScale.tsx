"use client";

import { useEffect, useState } from "react";

// In-app text/zoom control. The owner browses at reduced browser zoom and
// wants everything bigger without me guessing a single global font size that
// then breaks other viewports. This hands him the dial: A− / A+ scale the
// WHOLE app uniformly via CSS `zoom` on <html> (same effect as browser zoom,
// so no layout breakage), persisted in localStorage so it sticks across pages
// and sessions. Default 100% — opt-in, never forced on anyone else.
const KEY = "h_nerve_textscale";
const STEPS = [1, 1.15, 1.3, 1.5, 1.75] as const;

export function TextScale({ locale }: { locale: "ar" | "en" }) {
  const [idx, setIdx] = useState(0);

  // Restore saved scale on mount (client-only; SSR renders at 100%).
  useEffect(() => {
    const saved = Number(localStorage.getItem(KEY));
    const found = STEPS.findIndex((s) => s === saved);
    if (found >= 0) setIdx(found);
  }, []);

  // Apply + persist whenever the step changes.
  useEffect(() => {
    // `zoom` isn't in the typed CSSStyleDeclaration everywhere but Chrome/Edge
    // (the owner's browsers) support it; scales layout uniformly.
    (document.documentElement.style as unknown as Record<string, string>).zoom = String(STEPS[idx]);
    localStorage.setItem(KEY, String(STEPS[idx]));
  }, [idx]);

  const dec = () => setIdx((v) => Math.max(0, v - 1));
  const inc = () => setIdx((v) => Math.min(STEPS.length - 1, v + 1));
  const pct = Math.round(STEPS[idx] * 100);

  return (
    <div
      className="dl-textscale"
      role="group"
      aria-label={locale === "ar" ? "حجم النص" : "Text size"}
    >
      <button
        type="button"
        className="dl-ts-btn"
        onClick={dec}
        disabled={idx === 0}
        aria-label={locale === "ar" ? "نص أصغر" : "Smaller text"}
        title={locale === "ar" ? "نص أصغر" : "Smaller text"}
      >
        A<span className="dl-ts-sign">−</span>
      </button>
      <span className="dl-ts-val" aria-live="polite">{pct}%</span>
      <button
        type="button"
        className="dl-ts-btn"
        onClick={inc}
        disabled={idx === STEPS.length - 1}
        aria-label={locale === "ar" ? "نص أكبر" : "Larger text"}
        title={locale === "ar" ? "نص أكبر" : "Larger text"}
      >
        A<span className="dl-ts-sign">+</span>
      </button>
    </div>
  );
}
