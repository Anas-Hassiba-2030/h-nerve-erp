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
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { SectionBlock } from "@/components/exec/SectionBlock";
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
        <HeroPanel
          gradient="linear-gradient(135deg, #7c2d12 0%, #c2410c 35%, #ea580c 70%, #fdba74 110%)"
          accent="#ea580c"
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl ring-2 ring-white/40"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <Bell className="h-12 w-12 text-white hn-anim-bob" />
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <Zap className="h-3 w-3 hn-anim-pulse-soft" />
                  {ar ? "أتمتة ذكية" : "Smart automation"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "مركز التنبيهات" : "Alert Rules Center"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "8 قواعد جاهزة + إمكانية تخصيص العتبات. النظام يراقب ويُصدر إشارات قبل أن تطلب."
                    : "8 ready-made rules + custom thresholds. The system watches and signals before you ask."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  {rules.length === 0 ? (
                    <form action={seedRules}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                        style={{ background: "white", color: "#7c2d12" }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {ar ? "إنشاء القواعد الافتراضية" : "Seed default rules"}
                      </button>
                    </form>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold"
                      style={{ background: "white", color: "#7c2d12" }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {formatNumber(rules.length)} {ar ? "قاعدة جاهزة" : "rules ready"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <AlertHeroStat label={ar ? "قواعد" : "Rules"} value={formatNumber(rules.length)} icon={Bell} />
              <AlertHeroStat label={ar ? "نشطة" : "Active"} value={formatNumber(active)} icon={CheckCircle2} />
              <AlertHeroStat label={ar ? "انطلقت اليوم" : "Triggered today"} value={formatNumber(triggeredLast24h)} icon={Zap} />
              <AlertHeroStat label={ar ? "إجمالي مرات" : "Total fires"} value={formatNumber(totalTriggers)} icon={TrendingUp} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "قواعد نشطة" : "Active rules"}
            value={formatNumber(active)}
            icon={CheckCircle2}
            tone="emerald"
            hint={`${formatNumber(rules.length - active)} ${ar ? "موقوفة" : "paused"}`}
          />
          <MetricTile
            label={ar ? "إنطلاقات 24ساعة" : "Last 24h fires"}
            value={formatNumber(triggeredLast24h)}
            icon={Zap}
            tone={triggeredLast24h > 0 ? "amber" : "slate"}
            hint={ar ? "في يومنا" : "today"}
          />
          <MetricTile
            label={ar ? "إجمالي الانطلاقات" : "Total triggers"}
            value={formatNumber(totalTriggers)}
            icon={TrendingUp}
            tone="violet"
            hint={ar ? "كل العمر" : "all-time"}
          />
          <MetricTile
            label={ar ? "متوسط Cooldown" : "Avg cooldown"}
            value={
              rules.length > 0
                ? `${Math.round(rules.reduce((a, r) => a + r.cooldownHours, 0) / rules.length)}h`
                : "—"
            }
            icon={Clock}
            tone="blue"
            hint={ar ? "بين الانطلاقات" : "between fires"}
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
                <button type="submit" className="btn-primary hn-hover-shine">
                  <Plus className="h-4 w-4" />
                  {ar ? "إنشاء القواعد الافتراضية" : "Seed default rules"}
                </button>
              </form>
            }
          />
        ) : (
          <div className="grid gap-3 hn-stagger md:grid-cols-2">
            {rules.map((r) => {
              const def = ALERT_KINDS[r.kind as AlertKind];
              if (!def) return null;
              const Icon = ICON_MAP[def.icon] ?? Bell;
              const sevMeta = SEVERITY_LABEL[r.severity] ?? SEVERITY_LABEL.WARN;
              return (
                <article
                  key={r.id}
                  className={`exec-card hn-anim-rise hn-hover-lift ${r.isActive ? "" : "opacity-65"}`}
                  data-tone={def.tone}
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
                            className="text-[14px] font-black leading-tight"
                            style={{ color: "var(--text)" }}
                          >
                            {ar ? def.name_ar : def.name_en}
                          </h3>
                          <p
                            className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-relaxed"
                            style={{ color: "var(--text-muted)" }}
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
                              ? "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)"
                              : "var(--border)",
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
                            style={{ color: "var(--text-muted)" }}
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
                              style={{ color: "var(--text-muted)" }}
                            >
                              {def.thresholdSuffix}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider"
                            style={{ color: "var(--text-muted)" }}
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
                            style={{ color: "var(--text-muted)" }}
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
                          <span style={{ color: "var(--text-muted)" }}>
                            <span className="font-bold">
                              {ar ? "آخر إنطلاق:" : "Last fire:"}
                            </span>{" "}
                            {formatRel(r.lastTriggered, ar)}
                          </span>
                          <span
                            className="font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            · {formatNumber(r.triggerCount)} {ar ? "مرة" : "fires"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="submit" className="btn-secondary btn-sm">
                            <Settings className="h-3 w-3" />
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
          className="text-center text-[10.5px]"
          style={{ color: "var(--text-muted)" }}
        >
          💡 {ar
            ? "كل قاعدة نشطة تُقيَّم تلقائياً عند تشغيل محرك الذكاء من /insights."
            : "Each active rule is auto-evaluated when you run the AI engine from /insights."}
        </p>
      </PageContainer>
    </>
  );
}

function AlertHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}
