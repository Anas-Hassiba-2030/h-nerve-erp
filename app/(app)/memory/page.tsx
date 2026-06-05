// /memory — the client/API-driven Memory Lake recall surface (Phase 6).
//
// Lives under (app) so it inherits the auth gate + operator chrome from
// the route-group layout (a top-level app/memory/page.tsx would render
// unauthenticated and chrome-less — CLAUDE.md mandates authenticated
// pages live under app/(app)/). The page itself is a thin server shell:
// it resolves locale + renders the Topbar/header, then hands off to the
// client MemoryLakeBrowser, which does the useEffect → /api/memory fetch,
// filtering, and the forget action.
//
// This is the fetch-driven twin of the SSR /brain/memory editorial page.

import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { MemoryLakeBrowser } from "@/components/brain/MemoryLakeBrowser";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const ar = getLocale() === "ar";
  // forgetMemory requires MANAGER+; only show the "forget" control to those
  // roles so a STAFF user isn't handed a button that silently rejects.
  const user = await getCurrentUser();
  const canForget = !!user && ["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role);
  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · استرجاع الذاكرة" : "Brain · Memory recall"}
        title={ar ? "بحيرة الذاكرة" : "The memory lake"}
        subtitle={
          ar
            ? "تُحمّل الذكريات مباشرةً من واجهة /api/memory. صفِّ حسب الوحدة، أو انسَ ما لم يعد مفيداً."
            : "Loaded live from the /api/memory endpoint. Filter by unit, or forget what no longer serves."
        }
      />
      <MemoryLakeBrowser ar={ar} canForget={canForget} />
    </DaylightShell>
  );
}
