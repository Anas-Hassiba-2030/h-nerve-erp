// SectorPill — Heritage Modern variant. Uses the current-color dot pattern
// from `.heri-pill` so each sector gets a single chromatic accent drawn from
// the Heritage palette (no pastel rainbow). See docs/DESIGN-SKILL.md §5.2.
//
// BILINGUAL: flips AR/EN via loc(); locale from the optional `locale` prop or
// the h_nerve_locale cookie (server component). Previously rendered Arabic only.

import { loc, SECTORS_AR, SECTORS_EN } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";

const TONE: Record<string, string> = {
  HOSPITALITY: "var(--heri-ochre)",      // gold — hospitality
  DAIRY:       "var(--heri-copper)",     // copper — dairy
  AGRICULTURE: "var(--heri-teal)",       // teal — agriculture
  EDUCATION:   "var(--heri-ink)",        // ink — institutional
  INVESTMENT:  "var(--heri-ink-3)",      // muted ink
  TRADE:       "var(--heri-rose)",       // rose
};

export async function SectorPill({ sector, locale }: { sector: string; locale?: "ar" | "en" }) {
  const lc = locale ?? (await getLocale());
  const color = TONE[sector] ?? TONE.INVESTMENT;
  return (
    <span className="heri-pill" style={{ color }}>
      {loc(SECTORS_AR, SECTORS_EN, lc, sector)}
    </span>
  );
}
