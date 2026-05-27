// /alerts — Alert Rule Center. Threshold-based monitors that auto-create
// AIInsights when conditions are met. Each rule has a toggle, severity,
// threshold slider, cooldown, and last-triggered stamp.

import {
  Bell, BellOff, Plus, Settings, Trash2, Hotel, Milk, Sprout, Brain,
  TrendingDown, TrendingUp, AlertTriangle, Clock, Leaf, ShieldCheck,
  Zap, CheckCircle2, XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { ALERT_KINDS, type AlertKind } from "@/lib/alertEngine";
import { formatNumber } from "@/lib/utils";
import { toggleRule, updateRule, seedRules, deleteRule } from "./actions";

const ICON_MAP: Record<string, any> = {
  TrendingDown, TrendingUp, AlertTriangle, Clock, Leaf, ShieldCheck,
  Hotel, Milk, Sprout, Brain, Bell,
};

const SEVERITY_LABEL: Record<string, { ar: string; en: string; tone: string }> = {
  INFO:        { ar: "معلومة", en: "Info",        tone: "blue" },
  WARN:        { ar: "تحذير",  en: "Warning",     tone: "amber" },
  CRITICAL:    { ar: "حرج",    en: "Critical",    tone: "rose" },
  OPPORTUNITY: { ar: "فرصة",   en: "Opportunity", tone: "emerald" },
};

const TONE_BG: Record<string, string> = {
  rose:    "bg-rose-50 text-rose-700 ring-rose-200",
  amber:   "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue:    "bg-blue-50 text-blue-700 ring-blue-200",
  violet:  "bg-violet-50 text-violet-700 ring-violet-200",
};

function formatRel(d: Date | null, ar: boolean): string {
  if (!d) return ar ? "لم تنطلق بعد" : "never";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return ar ? "قبل قليل" : "just now";
  if (diff < 3600) return ar ? `منذ ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return ar ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h ago`;
  return ar ? `منذ ${Math.floor(diff / 86400)} ي` : `${Math.floor(diff / 86400)}d ago`;
}

export default async function AlertsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const rules = await prisma.alertRule.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: { scopeCompany: true, createdBy: true },
  });

  const active = rules.filter((r) => r.isActive).length;
  const triggeredLast24h = rules.filter(
    (r) => r.lastTriggered && Date.now() - r.lastTriggered.getTime() < 24 * 60 * 60 * 1000,
  ).length;
  const totalTriggers = rules.reduce((a, r) => a + r.triggerCount, 0);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={ar ? "مركز التنبيهات الذكية" : "Smart alerts center"}
        subtitle={
          ar
            ? "قواعد قابلة للتخصيص تراقب البيانات على مدار الساعة وتصدر إشارات تلقائية."
            : "Customizable rules that watch your data 24/7 and auto-generate insights."
        }
      />

      <PageContainer>
        {/* Action rail */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
          </div>
          <div className="flex items-center gap-2">
            {rules.length === 0 ? (
              <form action={seedRules}>
                <button type="submit" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "إنشاء القواعد الافتراضية" : "Seed default rules"}
                </button>
              </form>
            ) : (
              <span className="heri-eyebrow heri-eyebrow-ink">
                <CheckCircle2 className="inline h-3.5 w-3.5 me-1" style={{ color: "var(--heri-teal, #1f4e4a)" }} />
                {formatNumber(rules.length)} {ar ? "قاعدة جاهزة" : "rules ready"}
              </span>
            )}
          </div>
        </div>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "قواعد نشطة" : "Active rules"}
            raw={active}
            kind="number"
            hint={`${formatNumber(rules.length - active)} ${ar ? "موقوفة" : "paused"}`}
          />
          <HeriKpi
            label={ar ? "إنطلاقات 24 ساعة" : "Last 24h fires"}
            raw={triggeredLast24h}
            kind="number"
            accent={triggeredLast24h > 0 ? "var(--heri-terracotta, #b85c38)" : undefined}
            hint={ar ? "في يومنا" : "today"}
          />
          <HeriKpi
            label={ar ? "إجمالي الانطلاقات" : "Total triggers"}
            raw={totalTriggers}
            kind="number"
            hint={ar ? "كل العمر" : "all-time"}
          />
          <HeriKpi
            label={ar ? "متوسط الهدنة" : "Avg cooldown"}
            raw={rules.length > 0 ? Math.round(rules.reduce((a, r) => a + r.cooldownHours, 0) / rules.length) : 0}
            kind="number"
            hint={ar ? "ساعة بين الانطلاقات" : "hours between fires"}
          />
        </section>

        {rules.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={ar ? "لا قواعد بعد" : "No rules yet"}
            description={
              ar
                ? "ابدأ بـ 8 قواعد افتراضية مدروسة تغطي كل الوحدات — يمكنك تعديل العتبات لاحقاً."
                : "Start with 8 thoughtfully-tuned default rules covering every module — adjust thresholds later."
            }
            action={
              <form action={seedRules}>
                <button type="submit" className="heri-btn heri-btn-primary">
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "إنشاء القواعد الافتراضية" : "Seed default rules"}
                </button>
              </form>
            }
          />
        ) : (
          <div className="grid gap-3 heri-stagger md:grid-cols-2">
            {rules.map((r) => {
              const def = ALERT_KINDS[r.kind as AlertKind];
              if (!def) return null;
              const Icon = ICON_MAP[def.icon] ?? Bell;
              const sevMeta = SEVERITY_LABEL[r.severity] ?? SEVERITY_LABEL.WARN;
              return (
                <article
                  key={r.id}
                  className={r.isActive ? "" : "opacity-60"}
                  style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}
                >
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${TONE_BG[def.tone]}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h3
                            className="text-[14px] font-semibold leading-tight"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {ar ? def.name_ar : def.name_en}
                          </h3>
                          <p
                            className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-relaxed"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {ar ? def.description_ar : def.description_en}
                          </p>
                        </div>
                      </div>

                      {/* Active toggle */}
                      <form action={toggleRule} className="shrink-0">
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition"
                          style={{
                            background: r.isActive
                              ? "var(--heri-ochre)"
                              : "var(--heri-rule-strong)",
                          }}
                          title={r.isActive ? (ar ? "إيقاف" : "Pause") : (ar ? "تفعيل" : "Activate")}
                        >
                          <span
                            className="inline-block h-5 w-5 transform rounded-full bg-white transition shadow-sm"
                            style={{
                              transform: r.isActive
                                ? "translateX(22px)"
                                : "translateX(2px)",
                            }}
                          />
                        </button>
                      </form>
                    </div>

                    {/* Configurable settings */}
                    <form action={updateRule} className="space-y-2.5">
                      <input type="hidden" name="id" value={r.id} />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {ar ? def.thresholdLabel_ar : def.thresholdLabel_en}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              name="threshold"
                              defaultValue={r.threshold}
                              min={def.thresholdMin}
                              max={def.thresholdMax}
                              step={def.thresholdStep}
                              className="input flex-1 font-mono text-sm font-extrabold tabular-nums"
                              style={{ height: 32 }}
                            />
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: "var(--heri-ink-3)" }}
                            >
                              {def.thresholdSuffix}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {ar ? "الخطورة" : "Severity"}
                          </label>
                          <select
                            name="severity"
                            defaultValue={r.severity}
                            className="select w-full text-xs"
                            style={{ height: 32 }}
                          >
                            {Object.entries(SEVERITY_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>
                                {ar ? v.ar : v.en}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {ar ? "هدنة (ساعات)" : "Cooldown (h)"}
                          </label>
                          <input
                            type="number"
                            name="cooldownHours"
                            defaultValue={r.cooldownHours}
                            min={1}
                            max={168}
                            className="input w-full font-mono text-sm font-extrabold tabular-nums"
                            style={{ height: 32 }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 text-[10.5px] font-bold">
                          <span
                            className={`rounded-full px-2 py-0.5 ring-1 ${TONE_BG[sevMeta.tone]}`}
                          >
                            {ar ? sevMeta.ar : sevMeta.en}
                          </span>
                          <span style={{ color: "var(--heri-ink-3)" }}>
                            <span className="font-bold">
                              {ar ? "آخر إنطلاق:" : "Last fire:"}
                            </span>{" "}
                            {formatRel(r.lastTriggered, ar)}
                          </span>
                          <span
                            className="font-mono"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            · {formatNumber(r.triggerCount)} {ar ? "مرة" : "fires"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="submit" className="heri-btn heri-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                            <Settings className="h-3 w-3" strokeWidth={1.5} />
                            {ar ? "حفظ" : "Save"}
                          </button>
                          <DeleteButton
                            action={deleteRule}
                            payload={{ id: r.id }}
                            label={
                              ar
                                ? `حذف قاعدة "${r.name}"؟`
                                : `Delete rule "${r.nameEn ?? r.name}"?`
                            }
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p
          className="heri-eyebrow text-center"
          style={{ color: "var(--heri-ink-3)" }}
        >
          {ar
            ? "كل قاعدة نشطة تُقيَّم تلقائياً عند تشغيل محرك الذكاء من /insights."
            : "Each active rule is auto-evaluated when you run the AI engine from /insights."}
        </p>
      </PageContainer>
    </>
  );
}

