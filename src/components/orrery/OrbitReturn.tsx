"use client";

import Link from "next/link";
import { LocaleSwitch } from "@/components/nav/LocaleSwitch";
import { TextScale } from "@/components/nav/TextScale";
import { UserMenu } from "@/components/nav/UserMenu";
import type { Locale } from "@/lib/i18n/i18n";
import { MiniOrrery } from "./MiniOrrery";

// Fixed control cluster shown on every (app) page — but it's the ONLY chrome on
// full-bleed daylight pages (where the sidebar is hidden). Pairs the "↺ Orbit"
// return-to-hub pill with the AR/EN language toggle, so language is always
// reachable. Styles in app/(app)/living.css (.orbit-return / .dl-topctl).
//
// UserMenu (profile / search / settings / trash / help / SIGN OUT) lives here
// too: it used to render only inside PageHeader, which the Daylight pages
// don't use — so the dashboard and ~60 operator pages had NO reachable
// logout at all. This cluster is on every (app) page, so the menu is now
// globally reachable.
export function OrbitReturn({ locale, userName }: { locale: Locale; userName?: string | null }) {
  const label = locale === "ar" ? "المدار" : "Orbit";
  const aria = locale === "ar" ? "العودة إلى المدار" : "Return to the Orrery";
  return (
    <div className="dl-topctl">
      <Link href="/orrery" className="orbit-return" aria-label={aria} title={aria}>
        <span className="orbit-return__glyph" aria-hidden="true">↺</span>
        <span className="orbit-return__label">{label}</span>
      </Link>
      <MiniOrrery locale={locale} />
      <TextScale locale={locale} />
      <div className="dl-langwrap">
        <LocaleSwitch current={locale} />
      </div>
      <UserMenu locale={locale} userName={userName ?? null} />
    </div>
  );
}
