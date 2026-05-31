import Link from "next/link";
import { Sparkles, Plus, Wand2 } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber, formatRelative } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteInsight, generateInsightPlan } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const MODULE_AR: Record<string, string> = { HOTELS: "الفنادق", DAIRY: "الألبان", FARMS: "المزارع", SUPPLY: "سلسلة التوريد", FINANCE: "المالية", EDUCATION: "التعليم" };
const MODULE_EN: Record<string, string> = { HOTELS: "Hotels", DAIRY: "Dairy", FARMS: "Farms", SUPPLY: "Supply", FINANCE: "Finance", EDUCATION: "Education" };
const SEV_AR: Record<string, string> = { INFO: "معلومة", WARN: "تحذير", CRITICAL: "حرجة", OPPORTUNITY: "فرصة" };

export default async function InsightsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const insights = await prisma.aIInsight.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  const open = insights.filter((i) => i.status === "OPEN").length;
  const critical = insights.filter((i) => i.severity === "CRITICAL").length;
  const opportunities = insights.filter((i) => i.severity === "OPPORTUNITY").length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · ذكاء الأعمال" : "Brain · Business Intelligence"}
        title={ar ? "الإشارات والرؤى" : "Insights & Signals"}
        subtitle={ar ? "ما يكتشفه النظام تلقائياً من أنماط وفرص ومخاطر عبر المجموعة." : "Patterns, opportunities and risks the system discovers across the group."}
        status={`${formatNumber(insights.length)} ${ar ? "إشارة" : "signals"}`}
        actions={
          <>
            <Link href="/insights/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "إشارة جديدة" : "New signal"}</Link>
            <ExportMenu type="finance" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي" : "Total"} value={formatNumber(insights.length)} hint={ar ? "آخر ٥٠" : "last 50"} />
        <DaylightKpi label={ar ? "مفتوحة" : "Open"} value={formatNumber(open)} hint={ar ? "تحتاج متابعة" : "need follow-up"} />
        <DaylightKpi label={ar ? "فرص" : "Opportunities"} value={formatNumber(opportunities)} hint={ar ? "للنمو" : "to grow"} delta={opportunities > 0 ? { dir: "up", text: formatNumber(opportunities) } : undefined} />
        <DaylightKpi label={ar ? "حرجة" : "Critical"} value={formatNumber(critical)} hint={ar ? "عاجلة" : "urgent"} delta={critical > 0 ? { dir: "down", text: formatNumber(critical) } : undefined} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الإشارات" : "Signals"} aside={ar ? "مرتبة حسب الأحدث" : "Newest first"}>
        {insights.length === 0 ? (
          <EmptyState icon={Sparkles} title={ar ? "لا توجد إشارات بعد" : "No signals yet"} description={ar ? "سيكتشف النظام الأنماط تلقائياً." : "The system will surface patterns automatically."} />
        ) : (
          <div className="space-y-3">
            {insights.map((i) => {
              const sevColor = i.severity === "CRITICAL" ? "var(--brick)" : i.severity === "WARN" ? "var(--gold)" : i.severity === "OPPORTUNITY" ? "var(--emerald)" : "var(--sage)";
              return (
                <div key={i.id} className="prop-card" style={{ borderInlineStart: `3px solid ${sevColor}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tag" style={{ color: sevColor, background: "color-mix(in srgb, " + sevColor + " 14%, transparent)" }}>{ar ? (SEV_AR[i.severity] ?? i.severity) : i.severity}</span>
                        <span className="tag gold">{ar ? (MODULE_AR[i.module] ?? i.module) : (MODULE_EN[i.module] ?? i.module)}</span>
                        <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatRelative(i.createdAt, lc)}</span>
                      </div>
                      <h3 className="mt-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{i.title}</h3>
                      <p className="mt-1 whitespace-pre-line" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-muted)" }}>{i.body}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <form action={generateInsightPlan}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="dl-btn dl-btn-secondary" style={{ padding: "6px 12px" }}><Wand2 className="h-3 w-3" />{ar ? "خطة" : "Plan"}</button>
                      </form>
                      <DeleteButton softDelete action={deleteInsight} payload={{ id: i.id }} label={ar ? "حذف الإشارة" : "Delete insight"} />
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
