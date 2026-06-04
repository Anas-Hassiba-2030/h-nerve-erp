import { Bell, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { prisma } from "@/lib/db/db";
import { ALERT_KINDS, type AlertKind } from "@/lib/alerts/alertEngine";
import { formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { toggleRule, seedRules, deleteRule, updateRule } from "./actions";
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
                  <div key={r.id}>
                    <div className="br-row" style={{ opacity: r.isActive ? 1 : 0.6 }}>
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
                    {/* ISO/audit fix — updateRule existed but was wired to no
                        UI, so threshold/severity/cooldown could never be
                        edited. Native <details> form, no client JS. */}
                    <details style={{ padding: "2px 14px 10px" }}>
                      <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-muted)" }}>
                        {ar ? "تعديل العتبة / الشدّة / التهدئة" : "Edit threshold / severity / cooldown"}
                      </summary>
                      <form action={updateRule} style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginTop: 8 }}>
                        <input type="hidden" name="id" value={r.id} />
                        <label style={{ display: "grid", gap: 2, fontSize: 11 }}>
                          {ar ? "العتبة" : "Threshold"}
                          <input name="threshold" type="number" step="0.01" defaultValue={r.threshold} className="input" style={{ width: 110 }} />
                        </label>
                        <label style={{ display: "grid", gap: 2, fontSize: 11 }}>
                          {ar ? "الشدّة" : "Severity"}
                          <select name="severity" defaultValue={r.severity} className="input" style={{ width: 140 }}>
                            <option value="INFO">INFO</option>
                            <option value="WARN">WARN</option>
                            <option value="CRITICAL">CRITICAL</option>
                            <option value="OPPORTUNITY">OPPORTUNITY</option>
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 2, fontSize: 11 }}>
                          {ar ? "تهدئة (ساعات)" : "Cooldown (h)"}
                          <input name="cooldownHours" type="number" min="0" defaultValue={r.cooldownHours} className="input" style={{ width: 110 }} />
                        </label>
                        <button type="submit" className="dl-btn dl-btn-primary">{ar ? "حفظ" : "Save"}</button>
                      </form>
                    </details>
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
