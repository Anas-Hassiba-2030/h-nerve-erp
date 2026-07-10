// /brain/iq — Brain IQ — the capstone screen.
//
// Ported to its Claude Design reference (docs/design/system/sections/
// brainiq.html + brainiq-ops.js). Night register, scoped under .dl-page via
// ./brainiq.css. Prisma queries + server actions are unchanged; only the
// presentation now follows the reference .br-* structure.
//
// Phase 10 of docs/governance/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import "../../daylight.css";
import "./brainiq.css";
import { IQTrend } from "@/components/brain/IQTrend";
import { prisma } from "@/lib/db/db";
import { computeIQ } from "@/lib/brain/meta.reflector";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatNumber, formatDate } from "@/lib/utils/utils";
import { seedHistory, approveReport, rejectReport } from "./actions";
import { ReflectButton } from "./ReflectButton";
import { ConfirmResetForm } from "./ConfirmResetForm";

export default async function BrainIQPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const [iq, history, drafts, applied, latestDraft] = await Promise.all([
    computeIQ("default"),
    prisma.brainIQHistory.findMany({
      where: { scope: "default" },
      orderBy: { snappedAt: "asc" },
      take: 60,
    }),
    prisma.selfTuningReport.count({ where: { scope: "default", status: "DRAFT" } }),
    prisma.selfTuningReport.count({ where: { scope: "default", status: "APPROVED" } }),
    prisma.selfTuningReport.findFirst({
      where: { scope: "default", status: "DRAFT" },
      orderBy: { ranAt: "desc" },
    }),
  ]);

  // Use the seeded trajectory if it exists; otherwise show the live computation.
  const liveScore = iq.score;
  const headlineScore = history.length > 0 ? history[history.length - 1].iq : liveScore;

  const accuracyPct = Math.round(iq.components.accuracy * 100);
  const trustPct = Math.round(iq.components.userTrust * 100);

  // The reference self-report editorial; fall back to the latest draft's prose.
  const editorial = latestDraft
    ? ar
      ? latestDraft.editorialAr ?? latestDraft.editorialEn
      : latestDraft.editorialEn ?? latestDraft.editorialAr
    : null;

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        {/* ── slim ribbon ───────────────────────────────────────────── */}
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick"></span>
              {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
            </span>
            <h1>{ar ? "ذكاء الدماغ" : "Brain IQ"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "يتأمّل الدماغ في قراراته السابقة ويقيس دقّته. راجِع التقرير الذاتي واعتمده."
              : "The brain reflects on its past decisions and measures its own accuracy. Review the self-report and approve it."}
          </div>
        </div>

        {/* ── KPI rail ──────────────────────────────────────────────── */}
        <div className="br-kpis">
          <div className="br-kpi">
            <div className="v">{formatNumber(headlineScore)}</div>
            <div className="k">{ar ? "مؤشّر الذكاء" : "IQ score"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{formatNumber(accuracyPct)}{ar ? "٪" : "%"}</div>
            <div className="k">{ar ? "الدقّة" : "Accuracy"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{formatNumber(trustPct)}{ar ? "٪" : "%"}</div>
            <div className="k">{ar ? "الثقة" : "Confidence"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{formatNumber(drafts)}</div>
            <div className="k">{ar ? "بانتظار المراجعة" : "Pending review"}</div>
          </div>
        </div>

        {/* ── reflect control (thinking indicator) ──────────────────── */}
        <ReflectButton ar={ar} />

        {history.length === 0 ? (
          /* ── empty state ─────────────────────────────────────────── */
          <div className="br-panel">
            <h2>{ar ? "لا مسار بعد." : "No trajectory yet."}</h2>
            <div className="sub">
              {ar
                ? "ازرع ٨ أسابيع من المسار التجريبي لرؤية الدماغ يصعد، أو شغّل تأمّلاً جديداً ليبدأ القياس من الآن."
                : "Seed 8 weeks of demo trajectory to watch the brain climb, or trigger a reflection to start measuring from now."}
            </div>
            <div className="br-controls" style={{ marginTop: 16 }}>
              <form action={seedHistory}>
                <button type="submit" className="br-btn br-btn-primary">
                  {ar ? "ازرع ٨ أسابيع" : "Seed 8 weeks"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* ── trend line ────────────────────────────────────────── */}
            <div className="br-panel">
              <h2>
                {ar
                  ? `${formatNumber(history.length)} نقطة بيانات أسبوعية`
                  : `${formatNumber(history.length)} weekly data points`}
              </h2>
              <div className="sub">
                {ar
                  ? "النقطة الأخيرة هي اللحظة الحاضرة. ابتدأنا من ١٠٢ ووصلنا إلى ما تراه."
                  : "The rightmost dot is the current moment. We started at 102 and climbed from there."}
              </div>
              <IQTrend history={history.map((h) => ({ snappedAt: h.snappedAt, iq: h.iq }))} />
            </div>

            {/* ── self-report (approve / reject the latest draft) ───── */}
            {latestDraft ? (
              <div className="br-panel" id="metaCard">
                <h2>{ar ? "التقرير الذاتي الأخير" : "Latest self-report"}</h2>
                <div className="sub">{formatDate(latestDraft.ranAt, ar ? "ar" : "en")}</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--mist)" }}>
                  {editorial ??
                    (ar
                      ? `راجع الدماغ أداءه في آخر ${formatNumber(latestDraft.windowDays)} يوماً. مؤشّر الذكاء ${formatNumber(latestDraft.iqBefore)}، ويرتفع إلى ${formatNumber(latestDraft.iqAfterIfApplied)} عند اعتماد هذا التعديل.`
                      : `The brain reviewed its performance over the last ${formatNumber(latestDraft.windowDays)} days. IQ stands at ${formatNumber(latestDraft.iqBefore)}, rising to ${formatNumber(latestDraft.iqAfterIfApplied)} if this adjustment is approved.`)}
                </div>
                <div className="br-controls" style={{ marginTop: 16 }}>
                  <form action={approveReport}>
                    <input type="hidden" name="id" value={latestDraft.id} />
                    <button type="submit" className="br-btn br-btn-primary">
                      {ar ? "اعتمد" : "Approve"}
                    </button>
                  </form>
                  <form action={rejectReport}>
                    <input type="hidden" name="id" value={latestDraft.id} />
                    <button type="submit" className="br-btn danger">
                      {ar ? "ارفض" : "Reject"}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {/* ── reflection rail ───────────────────────────────────── */}
            <div className="br-controls">
              <Link href="/brain/self-tuning" className="br-btn br-btn-primary">
                {ar ? "كل التقارير" : "All reports"}
              </Link>
              {drafts > 0 ? (
                <span className="br-thinking" style={{ color: "var(--mist)" }}>
                  {formatNumber(drafts)} {ar ? "قيد المراجعة" : "pending review"}
                </span>
              ) : null}
              {applied > 0 ? (
                <span className="br-thinking" style={{ color: "var(--mist)" }}>
                  {formatNumber(applied)} {ar ? "مُطبَّقة" : "applied"}
                </span>
              ) : null}
              <ConfirmResetForm ar={ar} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
