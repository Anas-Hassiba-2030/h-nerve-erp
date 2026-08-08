// /console — the Console shell's home.
//
// The Orbit shell has the Orrery. Until now the Console shell had no home at
// all: switching to it left you wherever you stood, with every section hidden
// behind a hover menu. This is its front door — everything on one screen.
//
// Server component; the only client part is the filter (ConsoleHome). It reads
// ORRERY_GROUPS, the shared navigation source, so it needs no data of its own.

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { ConsoleHome } from "@/components/orrery/ConsoleHome";
import { ORRERY_GROUPS } from "@/lib/orrery/groups";
import "../daylight.css";
import "./console-home.css";

export const metadata: Metadata = {
  title: "H-Nerve · لوحة التحكم",
};

export default async function ConsoleHomePage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  const sections = ORRERY_GROUPS.reduce((s, g) => s + g.children.length, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"} wide>
      <DaylightHeader
        eyebrow={L("لوحة التحكم", "Console")}
        title={L("كل شيء، في مكان واحد", "Everything, in one place")}
        subtitle={L(
          `${ORRERY_GROUPS.length} مجموعات · ${sections} قسماً. لا قوائم منسدلة ولا استعارات — اكتب للتصفية، أو انقر.`,
          `${ORRERY_GROUPS.length} groups · ${sections} sections. No dropdowns, no metaphor — type to filter, or click.`,
        )}
        actions={
          <Link href="/orrery" className="ch-orbit-link">
            {L("افتح المدار", "Open the Orbit")}
          </Link>
        }
      />
      <ConsoleHome locale={locale} />
    </DaylightShell>
  );
}
