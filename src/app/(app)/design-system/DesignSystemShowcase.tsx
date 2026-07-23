"use client";

// The interactive gallery body for /design-system. Every primitive is shown
// exactly as it renders. Class names print beside each demo (click to copy).
// "Replay" remounts the entrance/attention rows so one-shot animations fire
// again. Driven by lib/design/tokens.ts so it can never drift from the system.

import { useState } from "react";
import {
  TrendingUp, Hotel, Sparkles, RefreshCw, Copy, Check,
} from "lucide-react";
import {
  CORE_VARS, HERITAGE_VARS, DEPTH_VARS, ANIMATIONS, EXEC_CARD_TONES,
} from "@/lib/design/tokens";
import { THEME_LIST } from "@/lib/theme/theme";
import { THEME_PRESETS } from "@/lib/brand/themes";

/* The three presets shipped by this design infrastructure — highlighted. */
const NEW_THEMES = new Set(["midnight-nerve", "desert-gold", "obsidian"]);

export function DesignSystemShowcase({ ar }: { ar: boolean }) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="space-y-10" style={{ color: "var(--ink)" }}>
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{
          background: "var(--ivory)",
          border: "1px solid var(--line)",
        }}
      >
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--ink-muted)" }}>
          {ar
            ? "كل اسم صنف قابل للنسخ بالنقر. الحركات تُعرض حيّة — اضغط «إعادة» لتشغيل حركات الدخول مرة أخرى."
            : "Every class name is click-to-copy. Animations play live — hit Replay to re-fire entrance motion."}
        </p>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="btn btn-gold btn-sm focus-visible:[outline:2px_solid_var(--gold)] focus-visible:[outline-offset:2px]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {ar ? "إعادة تشغيل الحركات" : "Replay animations"}
        </button>
      </div>

      {/* ── 1 · Colors ───────────────────────────────────────────── */}
      <Section n={1} titleAr="لوحة الألوان" titleEn="Color palette" ar={ar}
        descAr="متغيّرات CSS مع قيمها الافتراضية. السمات تعيد تعريف هذه عند جذر المجموعة."
        descEn="CSS variables with default values. Themes override these at the route-group root.">
        <Sub label={ar ? "الرموز الأساسية (واجهة المشغّل)" : "Core tokens (operator chrome)"} ar={ar} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(CORE_VARS).map(([name, val]) => (
            <Swatch key={name} name={name} value={val} ar={ar} />
          ))}
        </div>
        <Sub label={ar ? "لوحة التراث (السطح التحريري)" : "Heritage palette (editorial surface)"} ar={ar} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(HERITAGE_VARS).map(([name, val]) => (
            <Swatch key={name} name={name} value={val} ar={ar} />
          ))}
        </div>
        <Sub label={ar ? "العمق والحدّ المتدرّج" : "Depth & gradient stroke"} ar={ar} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(DEPTH_VARS).map(([name, val]) => (
            <ExprChip key={name} name={name} value={val} />
          ))}
        </div>
      </Section>

      {/* ── 2 · Typography ───────────────────────────────────────── */}
      <Section n={2} titleAr="الطباعة" titleEn="Typography" ar={ar}
        descAr="كل صنف طباعي. النصوص العربية بخط Reem Kufi العرضي عند العرض الكبير."
        descEn="Every type class. Display sizes shrink-to-fit; mono is JetBrains Mono.">
        <div className="space-y-3">
          {[
            { cls: "h-display-xl", sample: ar ? "نبض المجموعة" : "Group Pulse" },
            { cls: "h-display-lg", sample: ar ? "نبض المجموعة" : "Group Pulse" },
            { cls: "h-display-md", sample: ar ? "نبض المجموعة" : "Group Pulse" },
            { cls: "h-display-sm", sample: ar ? "نبض المجموعة" : "Group Pulse" },
            { cls: "exec-display", sample: ar ? "قرار تنفيذي" : "Executive Decision" },
            { cls: "exec-title", sample: ar ? "عنوان تنفيذي" : "Executive Title" },
            { cls: "eyebrow", sample: ar ? "تصنيف فرعي" : "Eyebrow Label" },
            { cls: "font-display", sample: ar ? "خط العرض" : "Display Face" },
            { cls: "font-mono-tech", sample: "MONO-TECH 1234.56" },
          ].map((t) => (
            <div
              key={t.cls}
              className="flex flex-wrap items-baseline justify-between gap-3 pb-3"
              style={{ borderBottom: "1px dashed var(--line)" }}
            >
              <span className={t.cls} style={{ color: "var(--ink)" }}>{t.sample}</span>
              <CopyChip text={t.cls} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3 · Buttons ──────────────────────────────────────────── */}
      <Section n={3} titleAr="الأزرار" titleEn="Buttons" ar={ar}
        descAr="كل زرّ يُبنى بـ btn الأساسي + متغيّر. الأحجام تُضاف كصنف ثالث."
        descEn="Every button = base btn + variant. Sizes stack as a third class.">
        <div className="flex flex-wrap items-center gap-3">
          {[
            ["btn btn-primary", ar ? "أساسي" : "Primary"],
            ["btn btn-secondary", ar ? "ثانوي" : "Secondary"],
            ["btn btn-gold", ar ? "ذهبي" : "Gold"],
            ["btn btn-danger", ar ? "خطر" : "Danger"],
            ["btn btn-ghost", ar ? "شبحي" : "Ghost"],
            ["btn btn-primary btn-sm", ar ? "صغير" : "Small"],
            ["btn btn-primary btn-lg", ar ? "كبير" : "Large"],
          ].map(([cls, label]) => (
            <div key={cls} className="flex flex-col items-center gap-1.5">
              <button className={cls}>{label}</button>
              <CopyChip text={cls} />
            </div>
          ))}
          <div className="flex flex-col items-center gap-1.5">
            <button className="btn-icon"><Sparkles className="h-4 w-4" /></button>
            <CopyChip text="btn-icon" />
          </div>
        </div>
      </Section>

      {/* ── 4 · Cards ────────────────────────────────────────────── */}
      <Section n={4} titleAr="البطاقات" titleEn="Cards" ar={ar}
        descAr="البطاقة الأساسية، البطاقة التنفيذية بكل درجاتها، الزجاجية، KPI، بلاطة المقياس، وغلاف الشركة."
        descEn="Base card, exec-card (all tones), glass, KPI, metric tile, company cover.">
        <Sub label="card · exec-glass" ar={ar} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-4">
            <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {ar ? "بطاقة أساسية" : "Base card"}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {ar ? "السطح القياسي لكل محتوى." : "The standard surface for any content."}
            </p>
            <div className="mt-2"><CopyChip text="card" /></div>
          </div>
          <div className="exec-glass p-4">
            <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {ar ? "بطاقة زجاجية" : "Glass card"}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {ar ? "ضبابية خلفية + شفافية." : "Backdrop blur + translucency."}
            </p>
            <div className="mt-2"><CopyChip text="exec-glass" /></div>
          </div>
        </div>

        <Sub label="exec-card · data-tone" ar={ar} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {EXEC_CARD_TONES.map((tone) => (
            <div key={tone} className="exec-card p-4" data-tone={tone}>
              <div className="text-sm font-bold capitalize" style={{ color: "var(--text)" }}>
                {tone}
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {ar ? "حدّ جانبي ملوّن." : "Colored left stroke."}
              </p>
              <div className="mt-2"><CopyChip text={`exec-card · data-tone="${tone}"`} /></div>
            </div>
          ))}
        </div>

        <Sub label="kpi · metric-tile · company-cover" ar={ar} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="kpi">
            <div className="kpi-label">{ar ? "الإيراد" : "Revenue"}</div>
            <div className="kpi-value tabular-nums">1.24 {ar ? "م" : "M"}</div>
            <div className="kpi-delta-up">▲ 12.4%</div>
            <div className="mt-2"><CopyChip text="kpi" /></div>
          </div>

          <div className="metric-tile">
            <div className="metric-tile-label">
              <span className="metric-tile-icon"><TrendingUp className="h-4 w-4" /></span>
              <span className="metric-tile-name">{ar ? "الإشغال" : "Occupancy"}</span>
            </div>
            <div className="metric-tile-value">87.3%</div>
            <div className="metric-tile-delta" data-positive="true">▲ 4.1%</div>
            <div className="mt-2"><CopyChip text="metric-tile" /></div>
          </div>

          <div className="company-cover" style={{ minHeight: 120 }}>
            <div className="flex h-full flex-col justify-between p-4">
              <Hotel className="h-5 w-5 text-white/90" />
              <div>
                <div className="text-sm font-extrabold text-white">
                  {ar ? "فنادق الحوراني" : "Hourani Hotels"}
                </div>
                <div className="mt-1"><CopyChip text="company-cover" light /></div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 5 · Badges ───────────────────────────────────────────── */}
      <Section n={5} titleAr="الشارات" titleEn="Badges" ar={ar}
        descAr="badge الأساسي + متغيّر لوني. تُستخدم للحالات والوسوم."
        descEn="Base badge + a color variant. Used for statuses and tags.">
        <div className="flex flex-wrap items-center gap-2.5">
          {["emerald", "blue", "amber", "red", "slate", "violet", "gold", "sky", "indigo"].map((c) => (
            <div key={c} className="flex flex-col items-center gap-1.5">
              <span className={`badge badge-${c}`}>{c}</span>
              <CopyChip text={`badge badge-${c}`} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 6 · Animations ───────────────────────────────────────── */}
      <Section n={6} titleAr="الحركات" titleEn="Animations" ar={ar}
        descAr="عروض حيّة لكل صنف hn-anim-*. الدخول لمرّة واحدة، المستمرّة بلا نهاية. اضغط «إعادة»."
        descEn="Live demos of every hn-anim-* class. Entrance plays once; continuous loops forever. Hit Replay.">
        <div key={replayKey} className="space-y-5">
          <Sub label={ar ? "حركات الدخول (لمرّة)" : "Entrance (one-shot)"} ar={ar} />
          <AnimGrid classes={ANIMATIONS.entrance} />

          <Sub label={ar ? "حركات الانتباه (لمرّة)" : "Attention (one-shot)"} ar={ar} />
          <AnimGrid classes={ANIMATIONS.attention} />

          <Sub label={ar ? "حركات مستمرّة (بلا نهاية)" : "Continuous (infinite)"} ar={ar} />
          <AnimGrid classes={ANIMATIONS.continuous} />

          <Sub label={ar ? "تتابع الأبناء" : "Staggered children (hn-stagger)"} ar={ar} />
          <div className="hn-stagger flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="hn-anim-rise flex h-10 w-10 items-center justify-center text-xs font-bold"
                style={{
                  background: "var(--ivory)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <CopyChip text="hn-stagger" />
        </div>
      </Section>

      {/* ── 7 · Backgrounds ──────────────────────────────────────── */}
      <Section n={7} titleAr="الخلفيات" titleEn="Backgrounds" ar={ar}
        descAr="أسطح النظام العصبي وكتلة التوهّج."
        descEn="Nerve surfaces and the glow blob.">
        <div className="grid gap-3 sm:grid-cols-3">
          <BgTile cls="nerve-bg" />
          <BgTile cls="nerve-bg-mesh" />
          <div
            className="relative flex items-end overflow-hidden p-3"
            style={{ height: 140, background: "var(--ivory)", border: "1px solid var(--line)" }}
          >
            <span
              className="glow-blob"
              style={{ width: 120, height: 120, top: -20, insetInlineStart: -20, position: "absolute" }}
              aria-hidden
            />
            <CopyChip text="glow-blob" />
          </div>
        </div>
      </Section>

      {/* ── 8 · Effects ──────────────────────────────────────────── */}
      <Section n={8} titleAr="التأثيرات" titleEn="Effects" ar={ar}
        descAr="زجاج، لمعان، وتفاعلات التحويم. مرّر المؤشر فوق بطاقات التحويم."
        descEn="Glass, sheen, and hover micro-interactions. Hover the hover cards.">
        <div
          className="relative overflow-hidden p-5"
          style={{
            background:
              "linear-gradient(135deg, var(--brick) 0%, var(--gold) 55%, var(--emerald) 110%)",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <EffectCard cls="glass" ar={ar} />
            <EffectCard cls="sheen" ar={ar} />
            <EffectCard cls="hn-hover-lift" ar={ar} hover />
            <EffectCard cls="hn-hover-tilt" ar={ar} hover />
            <EffectCard cls="hn-hover-glow" ar={ar} hover />
            <EffectCard cls="hn-hover-shine" ar={ar} hover />
          </div>
        </div>
      </Section>

      {/* ── 9 · Progress bars ────────────────────────────────────── */}
      <Section n={9} titleAr="أشرطة التقدّم" titleEn="Progress bars" ar={ar}
        descAr="bar كمسار + bar-fill كتعبئة متدرّجة من العلامة إلى اللكنة."
        descEn="bar as track + bar-fill as a brand→accent gradient fill.">
        <div className="space-y-3">
          {[25, 50, 80, 100].map((w) => (
            <div key={w} className="flex items-center gap-3">
              <div className="bar flex-1">
                <div className="bar-fill" style={{ width: `${w}%` }} />
              </div>
              <span className="w-10 text-end font-mono-tech text-xs" style={{ color: "var(--ink-muted)" }}>
                {w}%
              </span>
            </div>
          ))}
          <div className="flex gap-2"><CopyChip text="bar" /><CopyChip text="bar-fill" /></div>
        </div>
      </Section>

      {/* ── 10 · Skeletons ───────────────────────────────────────── */}
      <Section n={10} titleAr="الهياكل العظمية" titleEn="Skeletons" ar={ar}
        descAr="حالات التحميل: سطر، عنوان، حبّة، دائرة، ورأس مركّب."
        descEn="Loading states: line, title, pill, circle, and a composed header.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2.5">
            {[
              ["skel skel-title", "skel-title"],
              ["skel skel-text", "skel-text"],
              ["skel skel-line", "skel-line"],
              ["skel skel-line-sm", "skel-line-sm"],
              ["skel skel-eyebrow", "skel-eyebrow"],
            ].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cls} style={{ flex: 1 }} />
                <CopyChip text={label} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="skel skel-circle" style={{ width: 44, height: 44 }} />
              <span className="skel skel-pill" style={{ width: 90 }} />
              <CopyChip text="skel-circle / skel-pill" />
            </div>
            <div className="skel-header">
              <div className="skel-header-stripe" />
              <div className="space-y-2 p-3">
                <div className="skel skel-title" style={{ width: "60%" }} />
                <div className="skel skel-line" />
                <div className="skel skel-line" style={{ width: "80%" }} />
              </div>
            </div>
            <CopyChip text="skel-header · skel-header-stripe" />
          </div>
        </div>
      </Section>

      {/* ── 11 · Themes ──────────────────────────────────────────── */}
      <Section n={11} titleAr="السمات" titleEn="Theme presets" ar={ar}
        descAr="سجلّان: واجهة المشغّل (قابلة للتبديل في الإعدادات) وسمات المستأجر البيضاء. الثلاث الجديدة معلّمة."
        descEn="Two registries: operator chrome (switchable in Settings) and tenant white-labels. The three new presets are flagged.">
        <Sub label={ar ? `واجهة المشغّل · ${THEME_LIST.length}` : `Operator chrome · ${THEME_LIST.length}`} ar={ar} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {THEME_LIST.map((t) => (
            <ThemeCard
              key={t.id}
              name={ar ? t.name : t.nameEn}
              chips={[t.brandDeep, t.brand, t.accent, t.surface]}
              isNew={NEW_THEMES.has(t.id)}
              dark={t.isDark}
              ar={ar}
            />
          ))}
        </div>
        <Sub label={ar ? `سمات المستأجر · ${Object.keys(THEME_PRESETS).length}` : `Tenant white-labels · ${Object.keys(THEME_PRESETS).length}`} ar={ar} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {Object.values(THEME_PRESETS).map((p) => (
            <ThemeCard
              key={p.key}
              name={ar ? p.nameAr : p.nameEn}
              chips={p.swatches}
              emblem={p.emblem}
              isNew={NEW_THEMES.has(p.key)}
              ar={ar}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ───────────────────────── building blocks ───────────────────────── */

function Section({
  n, titleAr, titleEn, descAr, descEn, ar, children,
}: {
  n: number; titleAr: string; titleEn: string; descAr: string; descEn: string;
  ar: boolean; children: React.ReactNode;
}) {
  return (
    <section className="hn-anim-rise space-y-4">
      <div className="flex items-baseline gap-3">
        <span
          className="font-mono-tech text-xs tabular-nums"
          style={{ color: "var(--gold)", direction: "ltr" }}
        >
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="exec-title" style={{ color: "var(--ink)" }}>
          {ar ? titleAr : titleEn}
        </h2>
        <span className="h-px flex-1 self-center" style={{ background: "var(--line)" }} />
      </div>
      <p className="text-xs font-semibold leading-snug" style={{ color: "var(--ink-muted)" }}>
        {ar ? descAr : descEn}
      </p>
      {children}
    </section>
  );
}

function Sub({ label, ar }: { label: string; ar: boolean }) {
  return (
    <div
      className="eyebrow mt-2"
      style={{ color: "var(--gold)", direction: ar ? "rtl" : "ltr" }}
    >
      {label}
    </div>
  );
}

function Swatch({ name, value, ar }: { name: string; value: string; ar: boolean }) {
  const isColor = value.startsWith("#");
  return (
    <div style={{ border: "1px solid var(--line)" }}>
      <div
        className="h-14 w-full"
        style={{
          background: isColor ? `var(${name})` : `var(${name})`,
          borderBottom: "1px solid var(--line)",
        }}
        aria-hidden
      />
      <div className="px-2 py-1.5">
        <CopyChip text={name} block />
        <div
          className="mt-0.5 font-mono-tech text-[12px] tabular-nums"
          style={{ color: "var(--ink-muted)", direction: "ltr" }}
        >
          {isColor ? value : (ar ? "محسوب" : "computed")}
        </div>
      </div>
    </div>
  );
}

function ExprChip({ name, value }: { name: string; value: string }) {
  return (
    <div className="px-3 py-2.5" style={{ background: "var(--ivory)", border: "1px solid var(--line)" }}>
      {name === "--stroke-brand" ? (
        <div className="mb-2 h-6 w-full" style={{ background: "var(--stroke-brand)" }} aria-hidden />
      ) : (
        <div
          className="mb-2 h-10 w-full"
          style={{ background: "var(--cream)", boxShadow: `var(${name})` }}
          aria-hidden
        />
      )}
      <CopyChip text={name} block />
      <div className="mt-0.5 font-mono-tech text-[12px] leading-tight" style={{ color: "var(--ink-muted)", direction: "ltr" }}>
        {value}
      </div>
    </div>
  );
}

function AnimGrid({ classes }: { classes: readonly string[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
      {classes.map((cls) => {
        const gradient = cls === "hn-anim-grad";
        return (
          <div key={cls} className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-16 w-full items-center justify-center overflow-hidden"
              style={{ background: "var(--ivory)", border: "1px solid var(--line)" }}
            >
              <span
                className={cls}
                style={{
                  display: "block",
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: gradient ? "var(--stroke-brand)" : "var(--brick)",
                }}
                aria-hidden
              />
            </div>
            <CopyChip text={cls} />
          </div>
        );
      })}
    </div>
  );
}

function BgTile({ cls }: { cls: string }) {
  return (
    <div
      className={`relative flex items-end p-3 ${cls}`}
      style={{ height: 140, border: "1px solid var(--line)" }}
    >
      <CopyChip text={cls} />
    </div>
  );
}

function EffectCard({ cls, ar, hover }: { cls: string; ar: boolean; hover?: boolean }) {
  return (
    <div className={`${cls} flex flex-col gap-2 p-4`} style={{ minHeight: 90 }}>
      <span className="text-sm font-bold" style={{ color: cls === "glass" || cls === "sheen" ? "var(--text)" : "var(--ink)" }}>
        {hover ? (ar ? "مرّر فوقي" : "Hover me") : cls}
      </span>
      <CopyChip text={cls} />
    </div>
  );
}

function ThemeCard({
  name, chips, emblem, isNew, dark, ar,
}: {
  name: string; chips: string[]; emblem?: string; isNew?: boolean; dark?: boolean; ar?: boolean;
}) {
  return (
    <div
      className="hn-hover-lift overflow-hidden"
      style={{ border: isNew ? "2px solid var(--gold)" : "1px solid var(--line)" }}
    >
      <div className="flex h-12">
        {chips.map((c, i) => (
          <span key={i} className="flex-1" style={{ background: c }} aria-hidden />
        ))}
      </div>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5" style={{ background: "var(--cream)" }}>
        <span className="flex items-center gap-1 text-[13px] font-bold" style={{ color: "var(--ink)" }}>
          {emblem ? <span style={{ color: "var(--gold)" }}>{emblem}</span> : null}
          {name}
        </span>
        {isNew ? (
          <span className="badge badge-gold text-[12px]">{ar ? "جديد" : "NEW"}</span>
        ) : dark ? (
          <span className="text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>
            {ar ? "داكن" : "DARK"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* Click-to-copy monospace class chip. */
function CopyChip({ text, block, light }: { text: string; block?: boolean; light?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        try {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1100);
        } catch { /* clipboard unavailable — no-op */ }
      }}
      className={`inline-flex items-center gap-1 font-mono-tech text-[12px] focus-visible:[outline:2px_solid_var(--gold)] focus-visible:[outline-offset:1px] ${block ? "w-full justify-between" : ""}`}
      style={{
        direction: "ltr",
        padding: "2px 6px",
        borderRadius: 4,
        background: light ? "rgba(255,255,255,0.18)" : "var(--ivory)",
        border: `1px solid ${light ? "rgba(255,255,255,0.35)" : "var(--line)"}`,
        color: light ? "rgba(255,255,255,0.92)" : "var(--ink-muted)",
        transition:
          "background 160ms var(--ease-out-quart), color 160ms var(--ease-out-quart)",
      }}
      title={copied ? "Copied" : "Copy class"}
    >
      <span className="truncate">{text}</span>
      {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0 opacity-60" />}
    </button>
  );
}
