
export const dynamic = "force-dynamic";
// /insights — Heritage Modern intelligence layer.
//
// Cream plinth + ochre rail hero, hairline KPI tiles, anomaly section as a
// HeritageSection, insights as flat cream cards with single inline-start
// rail per severity (terracotta = critical, ochre = warn, teal = opportunity,
// copper = info). No purple, no neon, no gradient mesh.
//
// See docs/DESIGN-SKILL.md §1.D and §5.

import Link from "next/link";
import {
  Sparkles, Plus, Eye, CheckCircle2, AlertTriangle,
  Lightbulb, Info, Brain, Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { ExportMenu } from "@/components/ExportMenu";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { AnomalyPanel } from "@/components/AnomalyPanel";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { MemoryRecall } from "@/components/brain/MemoryRecall";
import { buildAnomaliesFromSeries } from "@/lib/anomaly";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { formatNumber, formatRelative } from "@/lib/utils";
import { deleteInsight, setInsightStatus, runAiEngine, generateInsightPlan } from "./actions";

const MODULE_AR: Record<string, string> = {
  HOTELS: "الفنادق",
  DAIRY: "الألبان",
  FARMS: "المزارع",
  SUPPLY: "سلسلة التوريد",
  FINANCE: "المالية",
  EDUCATION: "التعليم",
};
const MODULE_EN: Record<string, string> = {
  HOTELS: "Hotels",
  DAIRY: "Dairy",
  FARMS: "Farms",
  SUPPLY: "Supply chain",
  FINANCE: "Finance",
  EDUCATION: "Education",
};

const SEV_ICON: Record<string, typeof Info> = {
  INFO: Info,
  WARN: AlertTriangle,
  CRITICAL: AlertTriangle,
  OPPORTUNITY: Lightbulb,
};
// Heritage palette per severity — single inline-start rail color
const SEV_COLOR: Record<string, string> = {
  INFO:        "var(--heri-copper)",
  WARN:        "var(--heri-ochre-2)",
  CRITICAL:    "var(--heri-terracotta)",
  OPPORTUNITY: "var(--heri-teal)",
};
const SEV_PILL: Record<string, "info" | "warn" | "critical" | "success"> = {
  INFO: "info",
  WARN: "warn",
  CRITICAL: "critical",
  OPPORTUNITY: "success",
};

export default async function InsightsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const [insights, transactions, recentBookings] = await Promise.all([
    prisma.aIInsight.findMany({
      where: { deletedAt: null },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { author: true },
    }),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      include: { company: true },
    }),
    prisma.booking.findMany({
      where: { checkIn: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      orderBy: { checkIn: "asc" },
      include: { hotel: true },
    }),
  ]);

  // Phase V3-NEW-1 — the KPI tiles must reflect what the user sees
  // on the page. Originally counted ONLY AIInsight rows; the auto-
  // detected anomalies below are computed on-the-fly so they were
  // invisible to the count. Now: tiles aggregate both. Anomalies are
  // always treated as OPEN since they're computed live.
  const openFromInsights = insights.filter((i) => i.status === "OPEN").length;
  const oppFromInsights = insights.filter((i) => i.severity === "OPPORTUNITY").length;
  const critFromInsights = insights.filter((i) => i.severity === "CRITICAL").length;

  // === Auto-detected anomalies ===
  const now = new Date();
  const dailyRevenue: Array<{ label: string; value: number }> = [];
  const monthLabelFmt = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { day: "numeric", month: "short" });
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const next = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const sum = transactions.filter((t) => t.kind === "REVENUE" && t.occurredAt >= day && t.occurredAt < next).reduce((a, t) => a + t.amount, 0);
    dailyRevenue.push({ label: monthLabelFmt.format(day), value: sum });
  }
  const revenueAnomalies = buildAnomaliesFromSeries(
    { ar: "الإيرادات اليومية", en: "Daily revenue" },
    { ar: "المجموعة", en: "Group" },
    dailyRevenue,
    " د.أ",
    "/finance",
  );

  const dailyBookings: Array<{ label: string; value: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const next = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const count = recentBookings.filter((b) => b.checkIn >= day && b.checkIn < next).length;
    dailyBookings.push({ label: monthLabelFmt.format(day), value: count });
  }
  const bookingAnomalies = buildAnomaliesFromSeries(
    { ar: "الحجوزات اليومية", en: "Daily bookings" },
    { ar: "أرينا سبيس", en: "Arena Space" },
    dailyBookings,
    "",
    "/hotels",
  );

  const allAnomalies = [...revenueAnomalies, ...bookingAnomalies].slice(0, 8);

  // Phase V3-NEW-1 — combined KPI counts. SPIKE / DIP / TREND_REVERSAL
  // anomalies are "opportunities" or "critical" depending on direction
  // + severity. Conservative mapping:
  //   - CRITICAL severity → critical tile
  //   - SPIKE → opportunity
  const critAnomaly = allAnomalies.filter((a) => a.severity === "CRITICAL").length;
  const oppAnomaly = allAnomalies.filter((a) => a.kind === "SPIKE").length;
  const totalCount = insights.length + allAnomalies.length;
  const open = openFromInsights + allAnomalies.length;
  const opportunities = oppFromInsights + oppAnomaly;
  const critical = critFromInsights + critAnomaly;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={ar ? "إشارات H-Nerve" : "H-Nerve insights"}
        subtitle={
          ar
            ? "تنبيهات وفرص يلتقطها النظام تلقائياً عبر شركات المجموعة."
            : "Alerts and opportunities the system discovers automatically across the group."
        }
      />

      <PageContainer>
        {/* === Heritage hero plinth ============================================ */}
        <section className="heri-hero">
          <div
            className="px-6 py-8 md:px-9 md:py-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end"
            style={{ borderBottom: "1px solid var(--heri-rule-strong)" }}
          >
            <div className="min-w-0">
              <div className="heri-eyebrow inline-flex items-center gap-2">
                <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                {ar ? "طبقة الذكاء التشغيلي" : "AI INTELLIGENCE LAYER"}
              </div>
              <h2
                className={ar ? "mt-3" : "font-display-latin mt-3"}
                style={{
                  fontSize: "clamp(28px, 3.4vw, 46px)",
                  lineHeight: 1.05,
                  letterSpacing: ar ? "-0.005em" : "-0.022em",
                  fontWeight: ar ? 600 : 500,
                  color: "var(--heri-ink)",
                  textWrap: "balance" as any,
                }}
              >
                {ar
                  ? "الأنماط، قبل أن تطلبها."
                  : "The patterns, before you ask."}
              </h2>
              <p
                className="measure mt-3"
                style={{
                  fontSize: "clamp(13px, 1vw, 14.5px)",
                  lineHeight: 1.55,
                  color: "var(--heri-ink-2)",
                }}
              >
                {ar
                  ? "النظام يلتقط الأنماط عبر الإيرادات والحجوزات والمزارع والإنتاج — تحذيرات وفرص مرتبة حسب الأهمية."
                  : "The engine spots patterns across revenue, bookings, farms, and production — alerts and opportunities ranked by impact."}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <form action={runAiEngine}>
                  <button type="submit" className="heri-btn heri-btn-primary">
                    <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {ar ? "تشغيل محرك الذكاء" : "Run AI engine"}
                  </button>
                </form>
                <Link href="/insights/new" className="heri-btn heri-btn-secondary">
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {ar ? "إشارة جديدة" : "New insight"}
                </Link>
                <ExportMenu type="finance" locale={lc} />
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4">
            <HeroStat
              label={ar ? "إجمالي" : "Total"}
              value={formatNumber(totalCount)}
              icon={Sparkles}
            />
            <HeroStat
              label={ar ? "مفتوحة" : "Open"}
              value={formatNumber(open)}
              icon={Eye}
              divider
              accent="copper"
            />
            <HeroStat
              label={ar ? "فرص" : "Opportunities"}
              value={formatNumber(opportunities)}
              icon={Lightbulb}
              divider
              accent="teal"
            />
            <HeroStat
              label={ar ? "حرجة" : "Critical"}
              value={formatNumber(critical)}
              icon={AlertTriangle}
              divider
              accent={critical > 0 ? "terracotta" : "ink"}
            />
          </div>
        </section>

        {/* === Auto-detected Anomalies ========================================== */}
        <HeritageSection
          eyebrow={ar ? "كشف الشذوذ" : "Anomaly detection"}
          title={ar ? "كشف الشذوذ التلقائي" : "Auto-detected anomalies"}
          aside={
            ar
              ? "النظام يحلل الإيرادات اليومية والحجوزات لاكتشاف القفزات والهبوطات وانعكاسات الاتجاه."
              : "Engine analyzes daily revenue and bookings for spikes, dips, and trend reversals."
          }
        >
          <div className="mb-3 flex items-center justify-end">
            <HeritagePill tone={allAnomalies.length > 0 ? "warn" : "success"}>
              {formatNumber(allAnomalies.length)} {ar ? "اكتُشفت" : "found"}
            </HeritagePill>
          </div>
          <AnomalyPanel
            anomalies={allAnomalies}
            locale={lc}
            emptyMessage={{ ar: "كل المؤشرات ضمن النطاق الطبيعي", en: "All metrics within normal range" }}
          />
        </HeritageSection>

        {/* === Insight feed ===================================================== */}
        {insights.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={ar ? "لا توجد إشارات بعد" : "No insights yet"}
            description={
              ar
                ? "سجّل إشارة يدوياً أو شغّل المحرك التنبؤي ليولّد إشارات تلقائياً."
                : "Register manually or run the predictive engine to auto-generate."
            }
            action={
              <Link href="/insights/new" className="heri-btn heri-btn-primary">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                {ar ? "إشارة جديدة" : "New insight"}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 heri-stagger lg:grid-cols-2">
            {insights.map((i) => {
              const Icon = SEV_ICON[i.severity] ?? Info;
              const accent = SEV_COLOR[i.severity] ?? "var(--heri-rule-strong)";
              const pillTone = SEV_PILL[i.severity] ?? "neutral";
              return (
                <article
                  key={i.id}
                  className="relative"
                  style={{
                    background: "var(--heri-cream)",
                    border: "1px solid var(--heri-rule)",
                    overflow: "hidden",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute top-0 bottom-0"
                    style={{ insetInlineStart: 0, width: 3, background: accent }}
                  />
                  <div className="ms-2 flex items-start gap-3 p-5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center"
                      style={{
                        color: accent,
                        border: "1px solid var(--heri-rule)",
                        background: "var(--heri-cream-2)",
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <HeritagePill tone={pillTone as any}>
                          {ar ? severityArLabel(i.severity) : i.severity}
                        </HeritagePill>
                        <HeritagePill tone="neutral">
                          {ar ? (MODULE_AR[i.module] ?? i.module) : (MODULE_EN[i.module] ?? i.module)}
                        </HeritagePill>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                            fontSize: 9.5,
                            letterSpacing: "0.08em",
                            color: "var(--heri-ink-3)",
                            textTransform: "uppercase",
                          }}
                        >
                          {formatRelative(i.createdAt, lc as any)}
                        </span>
                      </div>
                      <h3
                        className={ar ? "mt-2.5" : "font-display-latin mt-2.5"}
                        style={{
                          fontSize: 15.5,
                          lineHeight: 1.25,
                          letterSpacing: ar ? 0 : "-0.012em",
                          fontWeight: ar ? 600 : 500,
                          color: "var(--heri-ink)",
                        }}
                      >
                        {i.title}
                      </h3>
                      <p
                        className="measure mt-1.5 whitespace-pre-line"
                        style={{
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: "var(--heri-ink-2)",
                        }}
                      >
                        {i.body}
                      </p>

                      {/* Phase 6 — Memory Lake recall: surface analogous past events */}
                      <div className="mt-5">
                        <MemoryRecall
                          situation={`${i.title}\n${i.body}`}
                          topK={2}
                          filterTags={tagsForModule(i.module)}
                          ar={ar}
                        />
                      </div>

                      <div
                        className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3"
                        style={{ borderTop: "1px solid var(--heri-rule)" }}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const).map((s) =>
                            s === i.status ? null : (
                              <form key={s} action={setInsightStatus}>
                                <input type="hidden" name="id" value={i.id} />
                                <input type="hidden" name="status" value={s} />
                                <button type="submit" className="heri-btn heri-btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
                                  {s === "ACKNOWLEDGED" ? (
                                    <>
                                      <Eye className="h-3 w-3" strokeWidth={1.5} /> {ar ? "اطّلعت" : "Read"}
                                    </>
                                  ) : s === "RESOLVED" ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} style={{ color: "var(--heri-teal)" }} />
                                      {ar ? "حلّت" : "Resolved"}
                                    </>
                                  ) : (
                                    ar ? "إعادة فتح" : "Reopen"
                                  )}
                                </button>
                              </form>
                            )
                          )}
                          <form action={generateInsightPlan}>
                            <input type="hidden" name="id" value={i.id} />
                            <button
                              type="submit"
                              className="heri-btn heri-btn-ghost"
                              style={{ padding: "6px 12px", fontSize: 11, color: "var(--heri-teal)" }}
                              title={ar ? "توليد خطة عمل من هذه الإشارة" : "Generate action plan from this insight"}
                            >
                              <Wand2 className="h-3 w-3" strokeWidth={1.5} />
                              {ar ? "خطة" : "Plan"}
                            </button>
                          </form>
                          <span
                            className="heri-eyebrow heri-eyebrow-ink"
                            style={{ fontSize: 9.5 }}
                          >
                            {ar ? "الحالة:" : "Status:"}{" "}
                            {i.status === "OPEN"
                              ? ar ? "مفتوحة" : "Open"
                              : i.status === "ACKNOWLEDGED"
                              ? ar ? "مقروءة" : "Read"
                              : ar ? "محلولة" : "Resolved"}
                          </span>
                        </div>
                        <DeleteButton
                          softDelete
                          action={deleteInsight}
                          payload={{ id: i.id }}
                          label={ar ? "حذف الإشارة" : "Delete insight"}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageContainer>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function HeroStat({
  label,
  value,
  icon: Icon,
  divider = false,
  accent = "ochre",
}: {
  label: string;
  value: string;
  icon: any;
  divider?: boolean;
  accent?: "ochre" | "copper" | "teal" | "terracotta" | "ink";
}) {
  const accentColor: Record<string, string> = {
    ochre: "var(--heri-ochre)",
    copper: "var(--heri-copper)",
    teal: "var(--heri-teal)",
    terracotta: "var(--heri-terracotta)",
    ink: "var(--heri-ink-3)",
  };
  return (
    <div
      className="px-6 py-6 md:px-8 md:py-7"
      style={{
        borderInlineStart: divider ? "1px solid var(--heri-rule)" : undefined,
      }}
    >
      <div className="flex items-center gap-2 heri-eyebrow" style={{ color: accentColor[accent] }}>
        <Icon className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </div>
      <div
        className="heri-number mt-3"
        style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 500, color: "var(--heri-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function severityArLabel(s: string) {
  const m: Record<string, string> = {
    CRITICAL: "حرجة",
    WARN: "تحذير",
    INFO: "معلومة",
    OPPORTUNITY: "فرصة",
  };
  return m[s] ?? s;
}

/** Module → memory-tag map for the recall filter. Boosts relevance, doesn't gate it. */
function tagsForModule(module: string): string[] {
  switch (module) {
    case "HOTELS":     return ["hospitality"];
    case "DAIRY":      return ["dairy"];
    case "FARMS":      return ["agriculture"];
    case "EDUCATION":  return ["education"];
    case "FINANCE":    return ["finance"];
    case "SUPPLY":     return ["supply", "demand"];
    default:           return [];
  }
}
