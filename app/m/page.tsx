// app/m — Mobile today screen.
//
// Three sections: Know / Decide / Approve. Each holds at most three cards.
// Pull-to-refresh re-runs the server query and re-staggers.

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { buildTodayPayload } from "@/lib/mobile/today";
import { MobileTopbar } from "@/components/mobile/MobileTopbar";
import { OpsSection } from "@/components/mobile/OpsSection";
import { MobileNav } from "@/components/mobile/MobileNav";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { NarratorTicker } from "@/components/mobile/NarratorTicker";

export const dynamic = "force-dynamic";

export default async function MobileTodayPage() {
  const session = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  const userName = dbUser?.name?.split(" ")[0] ?? "صديقي";

  const locale = getLocale();
  const ar = locale === "ar";
  const now = new Date();
  const payload = await buildTodayPayload({ userName, hour: now.getHours() });

  // Date line — bilingual, no year (we're showing "today").
  const dateline = new Intl.DateTimeFormat(
    ar ? "ar-JO-u-nu-latn" : "en-US",
    { weekday: "long", day: "numeric", month: "long" },
  ).format(now);

  return (
    <div className="m-screen">
      <PullToRefresh
        syncedAr={`متّزن. ${
          payload.know.length + payload.decide.length + payload.approve.length
        } بنود اليوم.`}
        syncedEn={`Synced. ${
          payload.know.length + payload.decide.length + payload.approve.length
        } new things.`}
        ar={ar}
      />

      <MobileTopbar
        greeting={ar ? payload.greetingAr : payload.greetingEn}
        dateline={dateline}
        ar={ar}
      />

      <NarratorTicker
        text={ar ? payload.narratorAr : payload.narratorEn}
        variant="default"
      />

      <main className="m-main">
        <OpsSection
          label="ثلاثة لتعرف"
          labelEn="Three to know"
          hint="ما تغيّر من تلقاء نفسه."
          hintEn="What changed on its own."
          cards={payload.know}
          ar={ar}
          index={0}
        />
        <OpsSection
          label="ثلاثة لتقرّر"
          labelEn="Three to decide"
          hint="ينتظرون قرارك."
          hintEn="Waiting on your call."
          cards={payload.decide}
          ar={ar}
          index={1}
        />
        <OpsSection
          label="ثلاثة لتقرّ"
          labelEn="Three to approve"
          hint="بضغطة واحدة."
          hintEn="One tap each."
          cards={payload.approve}
          ar={ar}
          index={2}
        />

        {/* Calm footer — no logo, no copyright. Just a soft signature. */}
        <p className="m-foot">
          {ar
            ? "هذا كل شيء. ارجع إذا احتجت."
            : "That's all. Come back when you need to."}
        </p>
      </main>

      <MobileNav ar={ar} />
    </div>
  );
}
