// /learning — the client/API-driven learning view (Phase 7).
//
// Under (app) for the inherited auth gate + chrome (a top-level
// app/learning/page.tsx would be unauthenticated — CLAUDE.md mandates
// authenticated pages under app/(app)/). Thin server shell: resolves
// locale + header, then the client LearningPatterns does the
// useEffect → /api/learning/patterns fetch (grouped counts + the recharts
// trend sparkline). Fetch-driven twin of the SSR /brain/learning page.

import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { LearningPatterns } from "@/components/brain/LearningPatterns";
import { getLocale } from "@/lib/i18n/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const ar = (await getLocale()) === "ar";
  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · منحنى التعلّم" : "Brain · Learning curve"}
        title={ar ? "ما يتعلّمه الدماغ، أسبوعاً بأسبوع" : "What the brain learns, week by week"}
        subtitle={
          ar
            ? "تُجمّع إشارات التغذية الراجعة من /api/learning/patterns حسب النوع والأسبوع — الإشارة الخام التي تُستخلص منها الأنماط في /brain/learning."
            : "Feedback signal from /api/learning/patterns, grouped by type and week — the raw signal the patterns in /brain/learning are learned from."
        }
      />
      <LearningPatterns ar={ar} />
    </DaylightShell>
  );
}
