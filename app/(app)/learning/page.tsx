// /learning — the client/API-driven learning view (Phase 7).
//
// Under (app) for the inherited auth gate + chrome (a top-level
// app/learning/page.tsx would be unauthenticated — CLAUDE.md mandates
// authenticated pages under app/(app)/). Thin server shell: resolves
// locale + header, then the client LearningPatterns does the
// useEffect → /api/learning/patterns fetch (grouped counts + the recharts
// trend sparkline). Fetch-driven twin of the SSR /brain/learning page.

import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { LearningPatterns } from "@/components/brain/LearningPatterns";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export default function LearningPage() {
  const ar = getLocale() === "ar";
  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · منحنى التعلّم" : "Brain · Learning curve"}
        title={ar ? "ما يتعلّمه الدماغ، أسبوعاً بأسبوع" : "What the brain learns, week by week"}
        subtitle={
          ar
            ? "تُجمّع إشارات التغذية الراجعة من /api/learning/patterns حسب النوع والأسبوع — الإشارة الخام التي تُستخلص منها الأنماط في /brain/learning."
            : "Feedback signal from /api/learning/patterns, grouped by type and week — the raw signal the patterns in /brain/learning are learned from."
        }
      />
      <PageContainer>
        <LearningPatterns ar={ar} />
      </PageContainer>
    </>
  );
}
