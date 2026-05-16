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
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { dismissSignal, acceptSignal } from "../actions";
import { prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber } from "@/lib/utils";

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
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { sector: true, name: true, nameEn: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";
  const modules = SECTOR_MODULES[company.sector] ?? [];
  const metrics = SECTOR_METRICS[company.sector] ?? [];

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
    <div className="ws-page">
      <section className="ws-stat-row">
        <St
          label={ar ? "إشارات مفتوحة" : "Open signals"}
          v={formatNumber(open.length)}
          icon={<BrainCircuit className="h-3.5 w-3.5" />}
        />
        <St
          label={ar ? "حرجة" : "Critical"}
          v={formatNumber(critical.length)}
          accent={critical.length > 0}
        />
        <St
          label={ar ? "خطط نشطة" : "Active plans"}
          v={formatNumber(plans.length)}
        />
        <St
          label={ar ? "متوسط الثقة" : "Avg confidence"}
          v={`${avgConf}%`}
        />
      </section>

      {/* Signal feed */}
      <HeritageSection
        eyebrow={
          ar
            ? `ما يراه الدماغ عن ${company.name}`
            : `What the brain sees about ${company.nameEn}`
        }
        title={ar ? "تغذية الإشارات" : "Signal feed"}
      >
        {ranked.length === 0 ? (
          <div className="ws-empty" data-ok="true">
            {ar ? "لا إشارات مفتوحة لهذه الوحدة. الدماغ هادئ." : "No open signals for this unit. The brain is quiet."}
          </div>
        ) : (
          <ul className="ws-signal-list">
            {ranked.slice(0, 16).map((i) => (
              <li key={i.id} className="ws-signal" data-sev={i.severity}>
                <span className="ws-signal-rail" aria-hidden />
                <div className="ws-signal-body">
                  <div className="ws-signal-top">
                    <HeritagePill tone={SEV_TONE[i.severity] ?? "neutral"}>
                      {i.severity}
                    </HeritagePill>
                    <span className="ws-signal-module ws-mono">{i.module}</span>
                    <span className="ws-signal-date ws-mono">
                      {new Intl.DateTimeFormat(
                        ar ? "ar-JO-u-nu-latn" : "en-US",
                        { day: "numeric", month: "short" },
                      ).format(new Date(i.createdAt))}
                    </span>
                  </div>
                  <div className="ws-signal-title">{i.title}</div>
                  <p className="ws-signal-text">
                    {i.body.length > 220 ? i.body.slice(0, 220) + "…" : i.body}
                  </p>
                  <div className="ws-signal-acts">
                    <form action={acceptSignal} className="ws-act-form">
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="ws-act">
                        {ar ? "اقبل وأنشئ خطة" : "Accept → plan"}
                        <span aria-hidden>{ar ? " ←" : " →"}</span>
                      </button>
                    </form>
                    <form action={dismissSignal} className="ws-act-form">
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="ws-act ws-act-ghost">
                        {ar ? "تجاهل" : "Dismiss"}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </HeritageSection>

      {/* Active plans with confidence */}
      <HeritageSection
        eyebrow={ar ? "خطط الدماغ المقترحة لهذه الوحدة" : "Brain-proposed plans for this unit"}
        title={ar ? "الخطط النشطة" : "Active plans"}
      >
        {plans.length === 0 ? (
          <div className="ws-empty">
            {ar
              ? "لا خطط نشطة تخص مقاييس هذه الوحدة الآن."
              : "No active plans touching this unit's metrics right now."}
          </div>
        ) : (
          <ul className="ws-list">
            {plans.map((p) => {
              const conf = Math.round((p.confidence ?? 0) * 100);
              const delta = Math.round((p.targetDelta ?? 0) * 100);
              return (
                <li key={p.id} className="ws-plan">
                  <span className="ws-plan-icon">
                    <Target className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </span>
                  <div className="ws-plan-main">
                    <div className="ws-list-title">
                      {ar ? p.goal : p.goalEn ?? p.goal}
                    </div>
                    <div className="ws-list-sub ws-mono">
                      {p.targetMetric} · {delta > 0 ? "+" : ""}
                      {delta}% {ar ? "هدف" : "target"} · {p.status}
                    </div>
                  </div>
                  <div className="ws-plan-conf">
                    <div className="ws-plan-conf-bar">
                      <span
                        className="ws-plan-conf-fill"
                        style={{ width: `${conf}%` }}
                      />
                    </div>
                    <span className="ws-plan-conf-num ws-mono">{conf}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </HeritageSection>

      <Link href="/brain/council" className="ws-intel-cta">
        <span>
          {ar
            ? "افتح المجلس الكامل لمناقشة قرار"
            : "Open the full council to debate a decision"}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />
      </Link>
    </div>
  );
}

function St({
  label, v, icon, accent,
}: {
  label: string;
  v: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="ws-stat">
      <div className="ws-stat-label">
        {icon ? <span className="ws-stat-icon">{icon}</span> : null}
        {label}
      </div>
      <div
        className="ws-stat-value"
        style={accent ? { color: "var(--heri-terracotta)" } : undefined}
      >
        {v}
      </div>
    </div>
  );
}
