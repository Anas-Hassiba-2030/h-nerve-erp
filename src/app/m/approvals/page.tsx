// app/m/approvals — Mobile approvals inbox.
//
// The "Approvals" bottom-nav tab. Everything that needs an explicit
// yes/no, in one place, each with a one-tap action inline (no detour to
// the desktop). Reuses the same server actions the Today screen wires:
// approveWorkflowRetry / reconnectIntegration. Draft plans link out to
// the full review screen because committing a plan is a deliberate act.

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { MobileTopbar } from "@/components/mobile/MobileTopbar";
import { MobileNav } from "@/components/mobile/MobileNav";
import { approveWorkflowRetry, reconnectIntegration } from "../actions";

export const dynamic = "force-dynamic";

export default async function MobileApprovalsPage() {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [failedRuns, brokenIntegrations, draftPlans] = await Promise.all([
    prisma.workflowRun.findMany({
      where: { status: "FAILED" },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { workflow: { select: { name: true } } },
    }) as any as Promise<any[]>,
    prisma.integration.findMany({
      where: { status: { in: ["ERROR", "EXPIRED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }) as any as Promise<any[]>,
    prisma.plan.findMany({
      where: { status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }) as any as Promise<any[]>,
  ]);

  const total = failedRuns.length + brokenIntegrations.length + draftPlans.length;

  return (
    <div className="m-screen">
      <MobileTopbar
        greeting={ar ? "الإقرارات" : "Approvals"}
        dateline={ar ? "ينتظرون قرارك" : "Waiting on your call"}
        ar={ar}
      />

      <main className="m-main">
        <section className="m-section">
          <div className="m-section-head">
            <div className="m-section-title-row">
              <h2 className="m-section-title">{ar ? "بانتظار الإقرار" : "Pending approval"}</h2>
              <span className="m-section-count">{total}</span>
            </div>
            <p className="m-section-hint">
              {ar ? "بضغطة واحدة لكل بند." : "One tap each."}
            </p>
          </div>

          {total === 0 ? (
            <div className="m-card m-card-empty" data-tone="ink">
              <span aria-hidden className="m-card-band" />
              <div className="m-card-body">
                <h3 className="m-card-title m-card-title-empty">
                  {ar ? "لا شيء بانتظارك." : "Nothing waiting on you."}
                </h3>
                <p className="m-card-text">
                  {ar ? "كل القرارات محسومة. سنُنبّهك." : "Everything's decided. We'll page you."}
                </p>
              </div>
            </div>
          ) : (
            <div className="m-cards">
              {/* Failed workflow runs — approve a retry inline. */}
              {failedRuns.map((r) => (
                <div key={`run:${r.id}`} className="m-card" data-tone="blush" data-urgent="true">
                  <span aria-hidden className="m-card-band" />
                  <div className="m-card-body">
                    <div className="m-card-eyebrow-row">
                      <span className="m-card-eyebrow">{ar ? "خرائط الأتمتة" : "Automation"}</span>
                      <span className="m-card-dot" aria-label={ar ? "عاجل" : "Urgent"} />
                    </div>
                    <h3 className="m-card-title">{r.workflow?.name ?? (ar ? "تشغيل" : "Run")}</h3>
                    <p className="m-card-text">
                      {ar ? "فشل التنفيذ. هل نُعيد المحاولة؟" : "Run failed. Retry now?"}
                    </p>
                    <form action={approveWorkflowRetry} className="m-act-row">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="m-act-btn">
                        {ar ? "أقرّ الإعادة" : "Approve retry"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {/* Broken integrations — reconnect inline. */}
              {brokenIntegrations.map((i) => (
                <div key={`int:${i.id}`} className="m-card" data-tone="ochre">
                  <span aria-hidden className="m-card-band" />
                  <div className="m-card-body">
                    <div className="m-card-eyebrow-row">
                      <span className="m-card-eyebrow">{ar ? "موصلات" : "Integration"}</span>
                    </div>
                    <h3 className="m-card-title">{i.providerKey}</h3>
                    <p className="m-card-text">
                      {i.status === "EXPIRED"
                        ? ar ? "انتهت صلاحية الاتصال." : "Connection expired."
                        : ar ? `سُجّلت ${i.errorCount} أخطاء.` : `${i.errorCount} errors logged.`}
                    </p>
                    <form action={reconnectIntegration} className="m-act-row">
                      <input type="hidden" name="providerKey" value={i.providerKey} />
                      <button type="submit" className="m-act-btn">
                        {ar ? "أعد الربط" : "Reconnect"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {/* Draft plans — review & commit on the full screen. */}
              {draftPlans.map((p) => (
                <Link
                  key={`plan:${p.id}`}
                  href={`/plans/${p.id}`}
                  className="m-card"
                  data-tone="sage"
                >
                  <span aria-hidden className="m-card-band" />
                  <div className="m-card-body">
                    <div className="m-card-eyebrow-row">
                      <span className="m-card-eyebrow">{ar ? "خطة جديدة" : "Plan ready"}</span>
                    </div>
                    <h3 className="m-card-title">{p.goal}</h3>
                    <p className="m-card-text">
                      {ar ? "راجع الخطة قبل إقرارها." : "Review the plan before committing."}
                    </p>
                    <div className="m-card-cta-row">
                      <span className="m-card-cta">{ar ? "راجع وأقرّ" : "Review & commit"}</span>
                      <Arrow className="h-3.5 w-3.5 m-card-arrow" strokeWidth={1.5} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <p className="m-foot">
          {ar ? "نُحدّث القائمة بعد كل إقرار." : "The list refreshes after each approval."}
        </p>
      </main>

      <MobileNav ar={ar} />
    </div>
  );
}
