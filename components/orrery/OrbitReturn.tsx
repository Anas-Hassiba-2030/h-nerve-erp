import Link from "next/link";
import type { Locale } from "@/lib/i18n";

// Continuity with the Orrery hub: a calm gold pill that returns the user to the
// cosmic navigation (mirrors the design's "↺ العودة إلى المدار" affordance on every
// section). Fixed, RTL-aware, big + forgiving tap target. Styles in app/(app)/living.css.
export function OrbitReturn({ locale }: { locale: Locale }) {
  const label = locale === "ar" ? "المدار" : "Orbit";
  const aria = locale === "ar" ? "العودة إلى المدار" : "Return to the Orrery";
  return (
    <Link href="/orrery" className="orbit-return" aria-label={aria} title={aria}>
      <span className="orbit-return__glyph" aria-hidden="true">↺</span>
      <span className="orbit-return__label">{label}</span>
    </Link>
  );
}
