"use client";

import Link from "next/link";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import type { Locale } from "@/lib/i18n";
import { MiniOrrery } from "./MiniOrrery";

// Fixed control cluster shown on every (app) page — but it's the ONLY chrome on
// full-bleed daylight pages (where the sidebar is hidden). Pairs the "↺ Orbit"
// return-to-hub pill with the AR/EN language toggle, so language is always
// reachable. Styles in app/(app)/living.css (.orbit-return / .dl-topctl).
export function OrbitReturn({ locale }: { locale: Locale }) {
  const label = locale === "ar" ? "المدار" : "Orbit";
  const aria = locale === "ar" ? "العودة إلى المدار" : "Return to the Orrery";
  return (
    <div className="dl-topctl">
      <Link href="/orrery" className="orbit-return" aria-label={aria} title={aria}>
        <span className="orbit-return__glyph" aria-hidden="true">↺</span>
        <span className="orbit-return__label">{label}</span>
      </Link>
      <MiniOrrery locale={locale} />
      <div className="dl-langwrap">
        <LocaleSwitch current={locale} />
      </div>
    </div>
  );
}
