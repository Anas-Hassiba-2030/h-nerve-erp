import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db/db";
import { formatNumber, pickLocale } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { commit, abandon, markStepDone, markStepBlocked } from "./actions";
import { TrustChip } from "@/components/brain/TrustChip";
import "../daylight.css";
import "./plans.css";

export const dynamic = "force-dynamic";

// Status → night chip class + bilingual label (from plans.html / plans-ops.js).
const STATUS: Record<string, { chip: string; ar: string; en: string }> = {
  DRAFT: { chip: "info", ar: "مسوّدة", en: "Draft" },
  ACTIVE: { chip: "warn", ar: "قيد التنفيذ", en: "Active" },
  DONE: { chip: "ok", ar: "مكتمل", en: "Done" },
  ABANDONED: { chip: "crit", ar: "مُلغى", en: "Abandoned" },
  ROLLED_BACK: { chip: "crit", ar: "تراجع", en: "Rolled back" },
};

export default async function PlansPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const plans = await prisma.plan.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { steps: { orderBy: { orderIndex: "asc" } } },
    take: 40,
  });

  const active = plans.filter((p) => p.status === "ACTIVE").length;
  const done = plans.filter((p) => p.status === "DONE").length;
  const totalSteps = plans.reduce((a, p) => a + p.steps.length, 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb"><span className="tick" />{ar ? "الذكاء التشغيلي" : "Operational intelligence"}</span>
            <h1>{ar ? "الخطط" : "Plans"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "الخطط التي يولّدها الدماغ من المجلس أو الإشارات. تابع الخطوات، اعتمد أو تخلَّ."
              : "Plans the brain generates from the council or signals. Track the steps, commit or abandon."}
          </div>
        </div>

        <div className="br-kpis">
          <div className="br-kpi"><div className="v">{formatNumber(plans.length)}</div><div className="k">{ar ? "إجمالي الخطط" : "Total plans"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(active)}</div><div className="k">{ar ? "نشطة" : "Active"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(done)}</div><div className="k">{ar ? "مكتملة" : "Completed"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(totalSteps)}</div><div className="k">{ar ? "خطوات" : "Steps"}</div></div>
        </div>

        <div id="plans">
          {plans.length === 0 ? (
            <div className="br-panel">
              <EmptyState
                icon={ClipboardList}
                title={ar ? "لا توجد خطط بعد" : "No plans yet"}
                description={ar ? "ولّد خطة من إشارة أو من جلسة المجلس." : "Generate a plan from a signal or council session."}
              />
            </div>
          ) : (
            plans.map((plan) => {
              const doneSteps = plan.steps.filter((s) => s.status === "DONE").length;
              const st = STATUS[plan.status] ?? STATUS.DRAFT;
              const committed = plan.status !== "DRAFT";
              return (
                <div className="br-panel" key={plan.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{pickLocale(ar, plan.goal, plan.goalEn)}</h2>
                      <div className="sub" style={{ margin: "2px 0 0" }}>
                        {ar
                          ? `${st.ar} · ${formatNumber(doneSteps)}/${formatNumber(plan.steps.length)} مكتمل`
                          : `${st.en} · ${doneSteps}/${plan.steps.length} done`}
                        {committed ? (ar ? " · مُعتمدة" : " · committed") : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {/* Phase 22 — projected-impact trust at a glance */}
                      <TrustChip score={plan.confidence} locale={ar ? "ar" : "en"} />
                      {committed ? (
                        <span className={`br-chip ${st.chip}`}>{ar ? st.ar : st.en}</span>
                      ) : (
                        <>
                          <form action={commit}>
                            <input type="hidden" name="id" value={plan.id} />
                            <button type="submit" className="br-btn br-btn-primary">{ar ? "اعتمد" : "Commit"}</button>
                          </form>
                          <form action={abandon}>
                            <input type="hidden" name="id" value={plan.id} />
                            <button type="submit" className="br-btn danger">{ar ? "تخلَّ" : "Abandon"}</button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {plan.steps.map((step, i) => {
                      const cls = step.status === "DONE" ? "done" : step.status === "BLOCKED" ? "blocked" : "";
                      const num = step.status === "DONE" ? "✓" : step.status === "BLOCKED" ? "!" : formatNumber(i + 1);
                      return (
                        <div className={`plan-step ${cls}`} key={step.id}>
                          <span className="pnum">{num}</span>
                          <span className="pt">{pickLocale(ar, step.action, step.actionEn)}</span>
                          {/* Step controls only make sense on an ACTIVE
                              (committed) plan; a DRAFT can't have steps marked
                              done/blocked. Per-step: hide Done once DONE, hide
                              Block unless still PENDING. */}
                          {plan.status === "ACTIVE" ? (
                            <div className="pacts">
                              {step.status !== "DONE" ? (
                                <form action={markStepDone}>
                                  <input type="hidden" name="stepId" value={step.id} />
                                  <input type="hidden" name="planId" value={plan.id} />
                                  <button type="submit" className="pa done">{ar ? "تمّ" : "Done"}</button>
                                </form>
                              ) : null}
                              {step.status === "PENDING" ? (
                                <form action={markStepBlocked}>
                                  <input type="hidden" name="stepId" value={step.id} />
                                  <input type="hidden" name="planId" value={plan.id} />
                                  <button type="submit" className="pa block">{ar ? "عُلّق" : "Block"}</button>
                                </form>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
