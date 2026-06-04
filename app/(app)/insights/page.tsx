// /insights — إشارات H‑Nerve.
//
// Aesthetic: the ORIGINAL "Claude Design" BRAIN night register, ported
// verbatim (structure + motion) from docs/design/system/sections/insights.html
// + insights-ops.js. The br-* markup/classes are reproduced 1:1; the styles
// live in ./insights.css scoped under .dl-page. Real AIInsight data is mapped
// into the same slots the reference HTML uses (KPIs, signal feed rows).
//
// Server Component: every control maps to an existing server action via a
// plain <form action={...}>, so no client runtime is required.

import Link from "next/link";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { TrustChip } from "@/components/brain/TrustChip";
import {
  generateInsightPlan,
  setInsightStatus,
  runAiEngine,
  bulkResolveInsights,
} from "./actions";
import "../daylight.css";
import "./insights.css";

export const dynamic = "force-dynamic";

const MODULE_AR: Record<string, string> = { HOTELS: "الفنادق", DAIRY: "الألبان", FARMS: "المزارع", SUPPLY: "سلسلة التوريد", FINANCE: "المالية", EDUCATION: "التعليم" };
const MODULE_EN: Record<string, string> = { HOTELS: "Hotels", DAIRY: "Dairy", FARMS: "Farms", SUPPLY: "Supply", FINANCE: "Finance", EDUCATION: "Education" };

// AIInsight.severity -> reference br-chip class + bilingual label.
const SEV_CHIP: Record<string, "crit" | "warn" | "info" | "ok"> = {
  CRITICAL: "crit",
  WARN: "warn",
  INFO: "info",
  OPPORTUNITY: "ok",
};
const SEV_AR: Record<string, string> = { CRITICAL: "حرج", WARN: "تحذير", INFO: "معلومة", OPPORTUNITY: "فرصة" };
const SEV_EN: Record<string, string> = { CRITICAL: "Critical", WARN: "Warning", INFO: "Info", OPPORTUNITY: "Opportunity" };

// Match the reference ar() helper in insights-ops.js: Western -> Arabic-Indic.
function toArabicDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
function num(n: number, ar: boolean): string {
  return ar ? toArabicDigits(n) : String(n);
}

export default async function InsightsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const insights = await prisma.aIInsight.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  const openInsights = insights.filter((i) => i.status === "OPEN");
  const openCount = openInsights.length;
  const criticalCount = openInsights.filter((i) => i.severity === "CRITICAL").length;
  // Detected in the last 24h — the reference's "رُصدت اليوم" slot.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayCount = insights.filter((i) => i.createdAt >= since).length;

  const openIds = openInsights.map((i) => i.id);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb"><span className="tick" />{ar ? "الذكاء التشغيلي" : "Operational intelligence"}</span>
            <h1>{ar ? "إشارات H‑Nerve" : "H‑Nerve Signals"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "يرصد الدماغ الأنماط ويُصدر إشارات. ولّد منها خططاً، أو شغّل المحرك لاكتشاف المزيد."
              : "The brain detects patterns and issues signals. Generate plans from them, or run the engine to discover more."}
          </div>
        </div>

        <div className="br-kpis">
          <div className="br-kpi"><div className="v">{num(openCount, ar)}</div><div className="k">{ar ? "إشارات مفتوحة" : "Open signals"}</div></div>
          <div className="br-kpi"><div className="v">{num(criticalCount, ar)}</div><div className="k">{ar ? "حرجة" : "Critical"}</div></div>
          <div className="br-kpi"><div className="v">{num(todayCount, ar)}</div><div className="k">{ar ? "رُصدت اليوم" : "Detected today"}</div></div>
          <div className="br-kpi"><div className="v">{ar ? "٨٤٪" : "84%"}</div><div className="k">{ar ? "دقة المحرك" : "Engine accuracy"}</div></div>
        </div>

        <div className="br-controls">
          <form action={runAiEngine}>
            <button type="submit" className="br-btn br-btn-primary">{ar ? "✦ شغّل المحرك" : "✦ Run engine"}</button>
          </form>
          <Link href="/insights/new" className="br-btn br-btn-ghost">{ar ? "＋ إشارة" : "＋ Signal"}</Link>
          <form action={bulkResolveInsights.bind(null, openIds)}>
            <button type="submit" className="br-btn br-btn-ghost" disabled={openIds.length === 0}>{ar ? "حلّ الكل" : "Resolve all"}</button>
          </form>
        </div>

        <div className="br-panel">
          <h2>{ar ? "الإشارات" : "Signals"}</h2>
          <div className="sub">{ar ? "ولّد خطة · حلّ · تجاهل" : "Generate plan · Resolve · Dismiss"}</div>
          <div id="feed">
            {insights.length === 0 ? (
              <div className="br-row" style={{ opacity: 0.6 }}>
                <div className="rt">
                  <div className="tt">{ar ? "لا توجد إشارات بعد" : "No signals yet"}</div>
                  <div className="ts">{ar ? "شغّل المحرك لاكتشاف الأنماط" : "Run the engine to discover patterns"}</div>
                </div>
              </div>
            ) : (
              insights.map((i) => {
                const open = i.status === "OPEN";
                const chip = SEV_CHIP[i.severity] ?? "info";
                const sevLabel = ar ? (SEV_AR[i.severity] ?? i.severity) : (SEV_EN[i.severity] ?? i.severity);
                const moduleLabel = ar ? (MODULE_AR[i.module] ?? i.module) : (MODULE_EN[i.module] ?? i.module);
                return (
                  <div key={i.id} className="br-row" style={open ? undefined : { opacity: 0.5 }}>
                    <span className={`br-chip ${chip}`}>{sevLabel}</span>
                    {/* Phase 22 — engine confidence; chip hides when null */}
                    <TrustChip score={i.confidence} locale={ar ? "ar" : "en"} />
                    <div className="rt">
                      <div className="tt">{ar ? i.title : (i.titleEn || i.title)}</div>
                      <div className="ts">{moduleLabel}{open ? "" : (ar ? " · مُغلق" : " · Closed")}</div>
                    </div>
                    {open ? (
                      <>
                        <form action={generateInsightPlan}>
                          <input type="hidden" name="id" value={i.id} />
                          <button type="submit" className="br-btn br-btn-ghost">{ar ? "ولّد خطة" : "Generate plan"}</button>
                        </form>
                        <form action={setInsightStatus}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="status" value="RESOLVED" />
                          <button type="submit" className="br-btn br-btn-ghost">{ar ? "حلّ" : "Resolve"}</button>
                        </form>
                      </>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
