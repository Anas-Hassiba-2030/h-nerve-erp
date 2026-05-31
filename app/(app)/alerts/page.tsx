import { Bell, Plus, Settings, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { ALERT_KINDS, type AlertKind } from "@/lib/alertEngine";
import { formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { toggleRule, updateRule, seedRules, deleteRule } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const SEV_AR: Record<string, string> = { INFO: "معلومة", WARN: "تحذير", CRITICAL: "حرج", OPPORTUNITY: "فرصة" };

export default async function AlertsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const rules = await prisma.alertRule.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: { scopeCompany: true, createdBy: true },
  });

  const active = rules.filter((r) => r.isActive).length;
  const triggeredLast24h = rules.filter((r) => r.lastTriggered && Date.now() - r.lastTriggered.getTime() < 24 * 60 * 60 * 1000).length;
  const totalTriggers = rules.reduce((a, r) => a + r.triggerCount, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · مركز التنبيهات" : "Brain · Alert Center"}
        title={ar ? "التنبيهات الذكية" : "Smart Alerts"}
        subtitle={ar ? "قواعد قابلة للتخصيص تراقب البيانات على مدار الساعة وتصدر إشارات تلقائية." : "Customizable rules that watch your data 24/7 and auto-generate signals."}
        status={`${formatNumber(active)} ${ar ? "نشطة" : "active"}`}
        actions={rules.length === 0 ? (
          <form action={seedRules}><button type="submit" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "إنشاء القواعد الافتراضية" : "Seed default rules"}</button></form>
        ) : undefined}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "قواعد نشطة" : "Active rules"} value={formatNumber(active)} hint={`${formatNumber(rules.length - active)} ${ar ? "موقوفة" : "paused"}`} />
        <DaylightKpi label={ar ? "إنطلاقات ٢٤ ساعة" : "Last 24h fires"} value={formatNumber(triggeredLast24h)} hint={ar ? "اليوم" : "today"} delta={triggeredLast24h > 0 ? { dir: "down", text: formatNumber(triggeredLast24h) } : undefined} />
        <DaylightKpi label={ar ? "إجمالي الانطلاقات" : "Total triggers"} value={formatNumber(totalTriggers)} hint={ar ? "كل العمر" : "all-time"} />
        <DaylightKpi label={ar ? "إجمالي القواعد" : "Total rules"} value={formatNumber(rules.length)} hint={ar ? "مُعرّفة" : "defined"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "القواعد" : "Rules"} aside={ar ? "النشطة أولاً" : "Active first"}>
        {rules.length === 0 ? (
          <EmptyState icon={Bell} title={ar ? "لا قواعد بعد" : "No rules yet"} description={ar ? "ابدأ بقواعد افتراضية تغطي كل الوحدات." : "Start with default rules covering every module."} action={<form action={seedRules}><button type="submit" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" />{ar ? "إنشاء القواعد" : "Seed rules"}</button></form>} />
        ) : (
          <div className="prop-grid">
            {rules.map((r) => {
              const def = ALERT_KINDS[r.kind as AlertKind];
              if (!def) return null;
              const sevColor = r.severity === "CRITICAL" ? "var(--brick)" : r.severity === "WARN" ? "var(--gold)" : r.severity === "OPPORTUNITY" ? "var(--emerald)" : "var(--sage)";
              return (
                <div key={r.id} className="prop-card" style={{ borderInlineStart: `3px solid ${sevColor}`, opacity: r.isActive ? 1 : 0.6 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{ar ? def.name_ar : def.name_en}</h3>
                      <p className="mt-0.5" style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.5 }}>{ar ? def.description_ar : def.description_en}</p>
                    </div>
                    <form action={toggleRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="relative inline-flex h-6 w-11 items-center rounded-full" style={{ background: r.isActive ? "var(--gold)" : "var(--line)" }} title={r.isActive ? (ar ? "إيقاف" : "Pause") : (ar ? "تفعيل" : "Activate")}>
                        <span className="inline-block h-5 w-5 rounded-full bg-white shadow-sm" style={{ transform: r.isActive ? "translateX(22px)" : "translateX(2px)" }} />
                      </button>
                    </form>
                  </div>
                  <form action={updateRule} className="mt-3 space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <div className="grid grid-cols-2 gap-2">
                      <label style={{ fontSize: 10, color: "var(--ink-muted)" }}>{ar ? def.thresholdLabel_ar : def.thresholdLabel_en}
                        <input type="number" name="threshold" defaultValue={r.threshold} min={def.thresholdMin} max={def.thresholdMax} step={def.thresholdStep} style={{ width: "100%", marginTop: 2, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontFamily: "monospace" }} />
                      </label>
                      <label style={{ fontSize: 10, color: "var(--ink-muted)" }}>{ar ? "هدنة (ساعة)" : "Cooldown (h)"}
                        <input type="number" name="cooldownHours" defaultValue={r.cooldownHours} min={1} max={168} style={{ width: "100%", marginTop: 2, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontFamily: "monospace" }} />
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "monospace" }}>{formatNumber(r.triggerCount)} {ar ? "مرة" : "fires"}</span>
                      <div className="flex items-center gap-1">
                        <button type="submit" className="dl-btn dl-btn-secondary" style={{ padding: "5px 10px" }}><Settings className="h-3 w-3" />{ar ? "حفظ" : "Save"}</button>
                        <DeleteButton action={deleteRule} payload={{ id: r.id }} label={ar ? `حذف قاعدة "${r.name}"؟` : `Delete rule "${r.nameEn ?? r.name}"?`} />
                      </div>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
