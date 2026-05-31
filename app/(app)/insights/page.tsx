import Link from "next/link";
import { Sparkles, Plus, ArrowRight } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber, formatRelative } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteInsight } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const insights = await prisma.aIInsight.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { company: true },
    take: 50,
  });

  const bySeverity = {
    CRITICAL: insights.filter((i) => i.severity === "CRITICAL").length,
    WARNING: insights.filter((i) => i.severity === "WARNING").length,
    INFO: insights.filter((i) => i.severity === "INFO").length,
  };
  const actionable = insights.filter((i) => i.actionable).length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · ذكاء الأعمال" : "Brain · Business Intelligence"}
        title={ar ? "الإشارات والرؤى" : "Insights & Signals"}
        subtitle={ar ? "ما اكتشفه الدماغ من أنماط وفرص ومخاطر عبر المجموعة." : "Patterns, opportunities and risks the brain discovered across the group."}
        status={`${formatNumber(insights.length)} ${ar ? "إشارة نشطة" : "active signals"}`}
        actions={
          <>
            <Link href="/insights/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "إشارة جديدة" : "New signal"}</Link>
            <ExportMenu type="insights" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الإشارات" : "Total signals"} value={formatNumber(insights.length)} hint={ar ? "آخر ٥٠" : "last 50"} />
        <DaylightKpi label={ar ? "حرجة" : "Critical"} value={formatNumber(bySeverity.CRITICAL)} hint={ar ? "تحتاج إجراء" : "need action"} delta={bySeverity.CRITICAL > 0 ? { dir: "down", text: formatNumber(bySeverity.CRITICAL) } : undefined} />
        <DaylightKpi label={ar ? "تحذيرات" : "Warnings"} value={formatNumber(bySeverity.WARNING)} hint={ar ? "راقب" : "monitor"} />
        <DaylightKpi label={ar ? "قابلة للتنفيذ" : "Actionable"} value={formatNumber(actionable)} hint={ar ? "خطط متاحة" : "plans ready"} delta={actionable > 0 ? { dir: "up", text: formatNumber(actionable) } : undefined} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الإشارات" : "Signals"} aside={ar ? "مرتبة حسب الأحدث" : "Newest first"}>
        {insights.length === 0 ? (
          <EmptyState icon={Sparkles} title={ar ? "لا توجد إشارات بعد" : "No signals yet"} description={ar ? "سيكتشف الدماغ الأنماط تلقائياً." : "The brain will surface patterns automatically."} />
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const sevColor =
                insight.severity === "CRITICAL" ? "var(--brick)" :
                insight.severity === "WARNING" ? "var(--gold)" : "var(--emerald)";
              return (
                <div key={insight.id} className="prop-card" style={{ borderInlineStart: `3px solid ${sevColor}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={insight.severity} />
                        {insight.actionable ? <span className="tag ok">{ar ? "قابلة للتنفيذ" : "Actionable"}</span> : null}
                      </div>
                      <h3 className="mt-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{ar ? insight.title : (insight.titleEn ?? insight.title)}</h3>
                      <p className="mt-1" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-muted)" }}>{ar ? insight.body : (insight.bodyEn ?? insight.body)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                        {insight.company ? <span>{ar ? insight.company.name : insight.company.nameEn}</span> : null}
                        <span>{formatRelative(insight.createdAt, lc)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {insight.actionable ? (
                        <Link href={`/plans/new?insight=${insight.id}`} className="dl-btn dl-btn-secondary" style={{ padding: "6px 12px" }}>{ar ? "خطة" : "Plan"}<ArrowRight className="h-3 w-3 rtl:rotate-180" /></Link>
                      ) : null}
                      <DeleteInsightButton id={insight.id} ar={ar} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}

function DeleteInsightButton({ id, ar }: { id: string; ar: boolean }) {
  return (
    <form action={deleteInsight}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-muted)", padding: "4px 8px" }} title={ar ? "حذف" : "Delete"}>✕</button>
    </form>
  );
}
