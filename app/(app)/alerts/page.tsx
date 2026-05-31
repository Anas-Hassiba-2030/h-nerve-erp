import { Bell, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatRelative, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { resolveAlert } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const alerts = await prisma.alert.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { company: true },
    take: 60,
  });

  const unresolved = alerts.filter((a) => !a.resolved);
  const critical = unresolved.filter((a) => a.level === "CRITICAL");
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · مركز التنبيهات" : "Brain · Alert Center"}
        title={ar ? "التنبيهات" : "Alerts"}
        subtitle={ar ? "تنبيهات النظام الحية عبر كل الشركات والقطاعات." : "Live system alerts across all companies and sectors."}
        status={`${formatNumber(unresolved.length)} ${ar ? "نشطة" : "active"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "غير محلولة" : "Unresolved"} value={formatNumber(unresolved.length)} hint={ar ? "تحتاج انتباه" : "need attention"} delta={unresolved.length > 0 ? { dir: "down", text: formatNumber(unresolved.length) } : undefined} />
        <DaylightKpi label={ar ? "حرجة" : "Critical"} value={formatNumber(critical.length)} hint={ar ? "عاجلة" : "urgent"} delta={critical.length > 0 ? { dir: "down", text: formatNumber(critical.length) } : undefined} />
        <DaylightKpi label={ar ? "محلولة" : "Resolved"} value={formatNumber(resolved.length)} hint={ar ? "هذا الشهر" : "this month"} delta={resolved.length > 0 ? { dir: "up", text: formatNumber(resolved.length) } : undefined} />
        <DaylightKpi label={ar ? "الإجمالي" : "Total"} value={formatNumber(alerts.length)} hint={ar ? "آخر ٦٠" : "last 60"} />
      </DaylightKpiGrid>

      {alerts.length === 0 ? (
        <DaylightPanel title={ar ? "التنبيهات" : "Alerts"}>
          <EmptyState icon={Bell} title={ar ? "لا توجد تنبيهات" : "No alerts"} description={ar ? "كل شيء يعمل بسلاسة." : "Everything is running smoothly."} />
        </DaylightPanel>
      ) : (
        <>
          {unresolved.length > 0 ? (
            <DaylightPanel title={ar ? "نشطة" : "Active"} aside={`${formatNumber(unresolved.length)} ${ar ? "تنبيه" : "alerts"}`}>
              <div className="space-y-3">
                {unresolved.map((alert) => <AlertRow key={alert.id} alert={alert} ar={ar} lc={lc} />)}
              </div>
            </DaylightPanel>
          ) : null}
          {resolved.length > 0 ? (
            <DaylightPanel title={ar ? "محلولة" : "Resolved"} aside={`${formatNumber(resolved.length)} ${ar ? "محلولة" : "resolved"}`}>
              <div className="space-y-3" style={{ opacity: 0.72 }}>
                {resolved.slice(0, 10).map((alert) => <AlertRow key={alert.id} alert={alert} ar={ar} lc={lc} />)}
              </div>
            </DaylightPanel>
          ) : null}
        </>
      )}
    </DaylightShell>
  );
}

function AlertRow({ alert, ar, lc }: { alert: any; ar: boolean; lc: "ar" | "en" }) {
  const levelColor =
    alert.level === "CRITICAL" ? "var(--brick)" :
    alert.level === "WARNING" ? "var(--gold)" : "var(--emerald)";
  return (
    <div className="prop-card" style={{ borderInlineStart: `3px solid ${levelColor}`, opacity: alert.resolved ? 0.7 : 1 }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={alert.level} />
            {alert.resolved ? <StatusBadge status="OK" /> : null}
          </div>
          <p className="mt-2" style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{ar ? alert.message : (alert.messageEn ?? alert.message)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
            {alert.company ? <span>{ar ? alert.company.name : alert.company.nameEn}</span> : null}
            <span>{formatRelative(alert.createdAt, lc)}</span>
          </div>
        </div>
        {!alert.resolved ? (
          <form action={resolveAlert}>
            <input type="hidden" name="id" value={alert.id} />
            <button type="submit" className="dl-btn dl-btn-secondary" style={{ padding: "6px 12px" }}><CheckCircle2 className="h-3.5 w-3.5" />{ar ? "حل" : "Resolve"}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
