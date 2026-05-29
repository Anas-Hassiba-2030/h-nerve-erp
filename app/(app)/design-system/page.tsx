export const dynamic = "force-dynamic";

// /design-system — مكتبة مكونات التصميم
// A full visual gallery of every UI primitive in the H-Nerve design system:
// colors, typography, buttons, cards, badges, animations, backgrounds,
// effects, progress, skeletons, and the theme registries. This is the
// living reference Claude Design reads from (lib/design/tokens.ts) and the
// human reference designers eyeball before shipping a new surface.
//
// Heritage Modern, RTL. Lives under (app) so it inherits the operator chrome
// (auth + PageHeader + sidebar). The body is intentionally raw primitives —
// no decorative wrapping — so each component is shown as it truly renders.

import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { getLocale } from "@/lib/i18n.server";
import { DesignSystemShowcase } from "./DesignSystemShowcase";

export default function DesignSystemPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  return (
    <>
      <PageHeader
        eyebrow={ar ? "نظام التصميم" : "Design system"}
        title={ar ? "مكتبة مكونات التصميم" : "Design component library"}
        subtitle={
          ar
            ? "معرض حيّ لكل عنصر بصري في H-Nerve — الألوان، الخطوط، الأزرار، البطاقات، الحركات، والسمات. المصدر الموثوق لتوليد أي تصميم جديد."
            : "A live gallery of every visual primitive in H-Nerve — colors, type, buttons, cards, animations, themes. The source of truth Claude Design generates from."
        }
        metrics={[
          { label: ar ? "متغيّرات" : "Tokens", value: "29", tone: "emerald" },
          { label: ar ? "حركات" : "Animations", value: "30", tone: "amber" },
          { label: ar ? "سمات" : "Themes", value: "10 + 9", tone: "violet" },
        ]}
      />
      <PageContainer width="wide">
        <DesignSystemShowcase ar={ar} />
      </PageContainer>
    </>
  );
}
