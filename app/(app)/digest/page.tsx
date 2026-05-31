import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const [insights, alerts, tasks, transactions] = await Promise.all([
    prisma.aIInsight.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { company: true } }),
    prisma.alert.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 5, include: { company: true } }),
    prisma.task.findMany({ where: { status: { not: "DONE" } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.transaction.findMany({ orderBy: { occurredAt: "desc" }, take: 8, include: { company: true } }),
  ]);

  const today = new Date();

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق · الموجز اليومي" : "Team · Daily Digest"}
        title={ar ? "موجز اليوم" : "Today's Briefing"}
        subtitle={ar ? `${formatShortDate(today, lc)} · ملخص ذكي لما يهم` : `${formatShortDate(today, lc)} · AI summary of what matters`}
        status={ar ? "محدّث الآن" : "Updated now"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إشارات جديدة" : "New signals"} value={formatNumber(insights.length)} hint={ar ? "اليوم" : "today"} />
        <DaylightKpi label={ar ? "تنبيهات نشطة" : "Active alerts"} value={formatNumber(alerts.length)} hint={ar ? "تحتاج انتباه" : "need attention"} delta={alerts.length > 0 ? { dir: "down", text: formatNumber(alerts.length) } : undefined} />
        <DaylightKpi label={ar ? "مهام معلقة" : "Pending tasks"} value={formatNumber(tasks.length)} hint={ar ? "غير منجزة" : "incomplete"} />
        <DaylightKpi label={ar ? "حركات مالية" : "Transactions"} value={formatNumber(transactions.length)} hint={ar ? "اليوم" : "today"} />
      </DaylightKpiGrid>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <DaylightPanel title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: "var(--gold)" }} />{ar ? "أحدث الإشارات" : "Latest signals"}</span>}>
          <div className="space-y-2">
            {insights.map((i) => (
              <Link key={i.id} href="/insights" className="block" style={{ borderRadius: 10, padding: 8, fontSize: 13, color: "var(--ink)" }}>{ar ? i.title : (i.titleEn ?? i.title)}</Link>
            ))}
            {insights.length === 0 ? <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>{ar ? "لا جديد" : "Nothing new"}</p> : null}
          </div>
        </DaylightPanel>

        <DaylightPanel title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" style={{ color: "var(--brick)" }} />{ar ? "تنبيهات تحتاج إجراء" : "Alerts needing action"}</span>}>
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link key={a.id} href="/alerts" className="block" style={{ borderRadius: 10, padding: 8, fontSize: 13, color: "var(--ink)" }}>{ar ? a.message : (a.messageEn ?? a.message)}</Link>
            ))}
            {alerts.length === 0 ? <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>{ar ? "كل شيء هادئ" : "All quiet"}</p> : null}
          </div>
        </DaylightPanel>
      </div>
    </DaylightShell>
  );
}
