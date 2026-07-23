// /workspace/intelligence — the company-scoped brain.
//
// AIInsight isn't companyId-scoped (it carries `module`), so we filter
// by a sector → modules map. Plans are surfaced by targetMetric
// relevance. This is the "what does the brain think about THIS
// company" surface — signals, plans, confidence.

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BrainCircuit, AlertOctagon, Lightbulb, Target, ArrowUpRight,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { dismissSignal, acceptSignal } from "../actions";
import { getUserIfRole } from "@/lib/auth/authz";
import { prismaUnscoped } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatNumber } from "@/lib/utils/utils";
import "../../daylight.css";

export const dynamic = "force-dynamic";

// Which brain modules speak for which sector.
const SECTOR_MODULES: Record<string, string[]> = {
  DAIRY: ["DAIRY", "SUPPLY"],
  HOSPITALITY: ["HOTELS", "SUPPLY"],
  AGRICULTURE: ["FARMS", "SUPPLY"],
  EDUCATION: ["EDUCATION"],
  INVESTMENT: ["FINANCE", "MARKETS"],
  TRADE: ["SUPPLY", "MARKETS"],
};
// Which targetMetrics a sector's plans tend to move.
const SECTOR_METRICS: Record<string, string[]> = {
  DAIRY: ["expiry_risk", "margin", "yield", "qc_pass"],
  HOSPITALITY: ["occupancy", "revenue", "adr", "revpar"],
  AGRICULTURE: ["yield", "moisture", "margin"],
  EDUCATION: ["engagement", "enrollment"],
  INVESTMENT: ["revenue", "margin", "fx_exposure"],
  TRADE: ["margin", "revenue"],
};

const SEV_TONE: Record<string, "critical" | "warn" | "success" | "info" | "neutral"> = {
  CRITICAL: "critical",
  ALERT: "critical",
  WARN: "warn",
  OPPORTUNITY: "success",
  INFO: "info",
};
const SEV_RANK: Record<string, number> = {
  CRITICAL: 0, ALERT: 1, WARN: 2, OPPORTUNITY: 3, INFO: 4,
};

export default async function WorkspaceIntelligencePage() {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { sector: true, name: true, nameEn: true },
  });
  if (!company) redirect("/companies");

  const locale = await getLocale();
  const ar = locale === "ar";
  const modules = SECTOR_MODULES[company.sector] ?? [];
  const metrics = SECTOR_METRICS[company.sector] ?? [];
  // W6 — STAFF read the feed; only MANAGER+ accept/dismiss signals.
  const canMutate = !!(await getUserIfRole("MANAGER"));

  const [insights, plans] = await Promise.all([
    prismaUnscoped.aIInsight.findMany({
      where: { deletedAt: null, module: { in: modules } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prismaUnscoped.plan.findMany({
      where: {
        status: { in: ["DRAFT", "ACTIVE"] },
        targetMetric: { in: metrics },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const open = insights.filter((i) => i.status === "OPEN");
  const critical = open.filter((i) =>
    ["CRITICAL", "ALERT"].includes(i.severity),
  );
  const ranked = open
    .slice()
    .sort(
      (a, b) =>
        (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9) ||
        +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  const avgConf = plans.length
    ? Math.round(
        (plans.reduce((a, p) => a + (p.confidence ?? 0), 0) / plans.length) * 100,
      )
    : 0;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الذكاء" : "Intelligence"}
        title={ar ? "تغذية الإشارات" : "Signal feed"}
        subtitle={
          ar
            ? `ما يراه الدماغ عن ${company.name}`
            : `What the brain sees about ${company.nameEn}`
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إشارات مفتوحة" : "Open signals"} value={formatNumber(open.length)} />
        <DaylightKpi label={ar ? "حرجة" : "Critical"} value={formatNumber(critical.length)} />
        <DaylightKpi label={ar ? "خطط نشطة" : "Active plans"} value={formatNumber(plans.length)} />
        <DaylightKpi label={ar ? "متوسط الثقة" : "Avg confidence"} value={`${avgConf}%`} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "تغذية الإشارات" : "Signal feed"}>
        {ranked.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
            {ar ? "لا إشارات مفتوحة لهذه الوحدة. الدماغ هادئ." : "No open signals for this unit. The brain is quiet."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ranked.slice(0, 16).map((i) => (
              <div key={i.id} style={{ background: "var(--ivory)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", position: "relative" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className={`tag ${SEV_TONE[i.severity] === "critical" ? "crit" : SEV_TONE[i.severity] === "warn" ? "gold" : "ok"}`} style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const }}>
                    {i.severity}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "monospace" }}>{i.module}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "monospace" }}>
                    {new Intl.DateTimeFormat(
                      ar ? "ar-JO-u-nu-latn" : "en-US",
                      { day: "numeric", month: "short" },
                    ).format(new Date(i.createdAt))}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{i.title}</div>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>
                  {i.body.length > 220 ? i.body.slice(0, 220) + "…" : i.body}
                </p>
                {canMutate ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <form action={acceptSignal}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="dl-btn dl-btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>
                        {ar ? "اقبل وأنشئ خطة" : "Accept → plan"}
                      </button>
                    </form>
                    <form action={dismissSignal}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="dl-btn dl-btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>
                        {ar ? "تجاهل" : "Dismiss"}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DaylightPanel>

      <DaylightPanel
        title={ar ? "الخطط النشطة" : "Active plans"}
        aside={ar ? "خطط الدماغ المقترحة لهذه الوحدة" : "Brain-proposed plans for this unit"}
      >
        {plans.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
            {ar
              ? "لا خطط نشطة تخص مقاييس هذه الوحدة الآن."
              : "No active plans touching this unit's metrics right now."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plans.map((p) => {
              const conf = Math.round((p.confidence ?? 0) * 100);
              const delta = Math.round((p.targetDelta ?? 0) * 100);
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <Target className="h-3.5 w-3.5" style={{ color: "var(--emerald)", flexShrink: 0 }} strokeWidth={1.7} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                      {ar ? p.goal : p.goalEn ?? p.goal}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "monospace", marginTop: 2 }}>
                      {p.targetMetric} · {delta > 0 ? "+" : ""}
                      {delta}% {ar ? "هدف" : "target"} · {p.status}
                    </div>
                  </div>
                  <div style={{ textAlign: "end", flexShrink: 0 }}>
                    <div className="dl-bar" style={{ width: 80, marginBottom: 4 }}><i style={{ width: `${conf}%` }} /></div>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--ink-muted)" }}>{conf}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>

      <div className="panel reveal" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
          {ar ? "افتح المجلس الكامل لمناقشة قرار" : "Open the full council to debate a decision"}
        </p>
        <Link href="/brain/council" className="dl-btn dl-btn-primary">
          {ar ? "مجلس الخبراء" : "Expert council"}
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />
        </Link>
      </div>
    </DaylightShell>
  );
}
