"use client";

import type { Locale } from "@/lib/i18n/i18n";

// Vertical FAB rail — ports Claude Design's #al-fabs (app-layer.js lines 28-32).
// Three round buttons stacked at bottom-start: Ask the Brain, Quick Add, Time
// Machine. Each button dispatches a window CustomEvent that the existing
// Conversational / QuickAddFAB / TimeScrubber components listen for, so those
// components stay the single source of truth for their panel UI — we just give
// them a unified, designed-correctly trigger surface.
//
// Style: .hn-fab-rail (see app/(app)/living.css).
export function FabRail({ locale }: { locale: Locale }) {
  const ar = locale === "ar";

  function fire(name: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(name));
    }
  }

  return (
    <div className="hn-fab-rail" role="toolbar" aria-label={ar ? "أدوات سريعة" : "Quick tools"}>
      <button
        type="button"
        className="hn-fab hn-fab--brain"
        title={ar ? "اسأل الدماغ" : "Ask the Brain"}
        aria-label={ar ? "اسأل الدماغ" : "Ask the Brain"}
        onClick={() => fire("h-nerve:converse:open")}
      >
        <span aria-hidden className="hn-fab__glyph">✦</span>
        <span className="hn-fab__lbl">{ar ? "اسأل الدماغ" : "Ask the Brain"}</span>
      </button>
      <button
        type="button"
        className="hn-fab hn-fab--add"
        title={ar ? "إضافة سريعة" : "Quick Add"}
        aria-label={ar ? "إضافة سريعة" : "Quick Add"}
        onClick={() => fire("h-nerve:quickadd:open")}
      >
        <span aria-hidden className="hn-fab__glyph">＋</span>
        <span className="hn-fab__lbl">{ar ? "إضافة سريعة" : "Quick Add"}</span>
      </button>
      <button
        type="button"
        className="hn-fab hn-fab--time"
        title={ar ? "آلة الزمن" : "Time Machine"}
        aria-label={ar ? "آلة الزمن" : "Time Machine"}
        onClick={() => fire("h-nerve:timemachine:open")}
      >
        <span aria-hidden className="hn-fab__glyph">⏱</span>
        <span className="hn-fab__lbl">{ar ? "آلة الزمن" : "Time Machine"}</span>
      </button>
    </div>
  );
}
