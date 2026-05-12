// SectorPill — Heritage Modern variant. Uses the current-color dot pattern
// from `.heri-pill` so each sector gets a single chromatic accent drawn from
// the Heritage palette (no pastel rainbow). See docs/DESIGN-SKILL.md §5.2.

import { ar, SECTORS_AR } from "@/lib/utils";

const TONE: Record<string, string> = {
  HOSPITALITY: "var(--heri-ochre)",      // gold — hospitality
  DAIRY:       "var(--heri-copper)",     // copper — dairy
  AGRICULTURE: "var(--heri-teal)",       // teal — agriculture
  EDUCATION:   "var(--heri-ink)",        // ink — institutional
  INVESTMENT:  "var(--heri-ink-3)",      // muted ink
  TRADE:       "var(--heri-rose)",       // rose
};

export function SectorPill({ sector }: { sector: string }) {
  const color = TONE[sector] ?? TONE.INVESTMENT;
  return (
    <span className="heri-pill" style={{ color }}>
      {ar(SECTORS_AR, sector)}
    </span>
  );
}
