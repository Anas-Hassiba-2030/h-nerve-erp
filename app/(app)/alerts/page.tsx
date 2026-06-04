import { Bell, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { prisma } from "@/lib/db/db";
import { ALERT_KINDS, type AlertKind } from "@/lib/alerts/alertEngine";
import { formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { toggleRule, seedRules, deleteRule } from "./actions";
import "../daylight.css";
import "./alerts.css";

export const dynamic = "force-dynamic";

// Severity → night chip class + bilingual label (from alerts.html / alerts-ops.js).
const SEV: Record<string, { chip: string; ar: string; en: string }> = {
  CRITICAL: { chip: "crit", ar: "حرج", en: "Critical" },
  WARN: { chip: "warn", ar: "تحذير", en: "Warning" },
  OPPORTUNITY: { chip: "ok", ar: "فرصة", en: "Opportunity" },
  INFO: { chip: "info", ar: "معلومة", en: "Info" },
};

export default async function AlertsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const rules = await prisma.alertRule.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: { scopeCompany: true, createdBy: true },
  });

  const active = rules.filter((r) => r.isActive).length;
  const triggeredLast24h = rules.filter((r) => r.lastTriggered && Date.now() - r.lastTriggered.getTime() < 24 * 60 * 60 * 1000).length;
  const critical = rules.filter((r) => r.severity === "CRITICAL").length;

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb"><span className="tick" />{ar ? "الذكاء التشغيلي" : "Operational intelligence"}</span>
            <h1>{ar ? "التنبيهات" : "Alerts"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "قواعد التنبيه التي يراقبها الدماغ على مدار الساعة. فعّلها أو أوقفها حسب الحاجة."
              : "Alert rules the brain watches around the clock. Activate or pause them as needed."}
          </div>
        </div>

        <div className="br-kpis">
          <div className="br-kpi"><div className="v">{formatNumber(active)}</div><div className="k">{ar ? "قواعد فعّالة" : "Active rules"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(triggeredLast24h)}</div><div className="k">{ar ? "إطلاقات اليوم" : "Fires today"}</div></div>
          <div className="br-kpi"><div className="v">{formatNumber(critical)}</div><div className="k">{ar ? "حرجة" : "Critical"}</div></div>
        </div>

        <div className="br-controls">
          <form action={seedRules}>
            <button type="submit" className="br-btn br-btn-primary">{ar ? "استعد القواعد الافتراضية" : "Seed default rules"}</button>
          </form>
        </div>

        <div className="br-panel">
          <h2>{ar ? "قواعد التنبيه" : "Alert rules"}</h2>
          <div className="sub">{ar ? "انقر المفتاح للتفعيل" : "Tap the switch to toggle"}</div>
          <div id="rules">
            {rules.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={ar ? "لا قواعد بعد" : "No rules yet"}
                description={ar ? "ابدأ بقواعد افتراضية تغطي كل الوحدات." : "Start with default rules covering every module."}
                action={
                  <form action={seedRules}>
                    <button type="submit" className="br-btn br-btn-primary"><Plus className="h-4 w-4" />{ar ? "إنشاء القواعد" : "Seed rules"}</button>
                  </form>
                }
              />
            ) : (
              rules.map((r) => {
                const def = ALERT_KINDS[r.kind as AlertKind];
                const sev = SEV[r.severity] ?? SEV.INFO;
                const name = def ? (ar ? def.name_ar : def.name_en) : (ar ? r.name : (r.nameEn ?? r.name));
                return (
                  <div className="br-row" key={r.id} style={{ opacity: r.isActive ? 1 : 0.6 }}>
                    <span className={`br-chip ${sev.chip}`}>{ar ? sev.ar : sev.en}</span>
                    <div className="rt">
                      <div className="tt">{name}</div>
                      <div className="ts">{ar ? `أُطلقت ${formatNumber(r.triggerCount)} مرّة` : `Fired ${formatNumber(r.triggerCount)} times`}</div>
                    </div>
                    <form action={toggleRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className={`br-switch ${r.isActive ? "on" : ""}`}
                        title={r.isActive ? (ar ? "إيقاف" : "Pause") : (ar ? "تفعيل" : "Activate")}
                        aria-label={r.isActive ? (ar ? "إيقاف القاعدة" : "Pause rule") : (ar ? "تفعيل القاعدة" : "Activate rule")}
                      />
                    </form>
                    <DeleteButton action={deleteRule} payload={{ id: r.id }} label={ar ? `حذف قاعدة "${r.name}"؟` : `Delete rule "${r.nameEn ?? r.name}"?`} />
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
