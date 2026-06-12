// /brain/learning — what the brain has learned about this org.
//
// Ported to the Claude Design reference
// (docs/design/system/sections/learning.html — brain NIGHT register: slim
// ribbon + KPI strip + dark panel). Real data + server actions are preserved;
// the look is the reference. Styles live in ./learning.css, scoped to .dl-page.
//
// Phase 7 of docs/PHASES-INTELLIGENCE.md.

import "../../daylight.css";
import "./learning.css";
import { Brain, Database, Cpu, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { digest } from "@/lib/brain/feedback.live";
import { LearningTrend } from "@/components/brain/LearningTrend";
import {
  learnNow,
  seedFeedback,
  togglePattern,
  unlearnPattern,
  deletePattern,
  clearAllFeedback,
} from "./actions";

const MODULE_LABEL: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "الفنادق", en: "Hotels" },
  DAIRY:     { ar: "الألبان", en: "Dairy" },
  FARMS:     { ar: "المزارع", en: "Farms" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  FINANCE:   { ar: "المالية", en: "Finance" },
  GROUP:     { ar: "المجموعة", en: "Group" },
  SUPPLY:    { ar: "سلسلة التوريد", en: "Supply" },
};

export default async function BrainLearningPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const [patterns, totalFeedback, monthDigest, recentEvents] = await Promise.all([
    prisma.brainPattern.findMany({
      orderBy: [{ status: "asc" }, { confidence: "desc" }],
    }),
    prisma.brainFeedback.count(),
    digest("month"),
    prisma.brainFeedback.findMany({
      orderBy: { ts: "desc" },
      take: 16,
    }),
  ]);

  const enabled = patterns.filter((p) => p.status === "ENABLED").length;
  const disabled = patterns.filter((p) => p.status === "DISABLED").length;
  const unlearned = patterns.filter((p) => p.status === "UNLEARNED").length;

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        {/* slim ribbon — eyebrow + title + intro */}
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
            </span>
            <h1>{ar ? "التعلّم" : "Learning"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "كل تجاهل، كل التزام، كل إلغاء يصبح إشارة. هذه هي الأنماط التي استخلصتُها — يمكنك إيقاف أيٍّ منها."
              : "Every dismiss, every commit, every abandonment becomes signal. These are the patterns I've extracted — you can disable any of them."}
          </div>
        </div>

        {/* KPI strip */}
        <div className="br-kpis">
          <div className="br-kpi">
            <div className="v">{enabled.toLocaleString("en-US")}</div>
            <div className="k">{ar ? "أنماط نشطة" : "Active patterns"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{disabled.toLocaleString("en-US")}</div>
            <div className="k">{ar ? "موقوفة" : "Disabled"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{totalFeedback.toLocaleString("en-US")}</div>
            <div className="k">{ar ? "أحداث رصد" : "Feedback events"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{monthDigest.accepted}/{monthDigest.rejected}</div>
            <div className="k">{ar ? "قبول/رفض (30 يوم)" : "Accept/Reject (30d)"}</div>
          </div>
        </div>

        {/* Phase 7 — weekly learning curve (accepted vs rejected signal) */}
        <div className="br-panel">
          <h2>{ar ? "منحنى التعلّم" : "Learning curve"}</h2>
          <div className="sub">{ar ? "إشارات القبول مقابل الرفض عبر الأسابيع" : "Accepted vs rejected signal over weeks"}</div>
          <LearningTrend ar={ar} weeks={12} />
        </div>

        {/* Controls — learn now + seed + clear */}
        <div className="br-controls">
          <form action={learnNow}>
            <button type="submit" className="br-btn br-btn-primary">
              <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "✦ إعادة التحليل" : "✦ Re-analyze"}
            </button>
          </form>
          {totalFeedback === 0 ? (
            <form action={seedFeedback}>
              <button type="submit" className="br-btn br-btn-ghost">
                <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "ازرع أحداث تدريبية" : "Seed training events"}
              </button>
            </form>
          ) : null}
          <form action={clearAllFeedback}>
            <button type="submit" className="br-btn danger">
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "مسح كل التعلّم" : "Clear all learning"}
            </button>
          </form>
        </div>

        {/* Patterns panel */}
        <div className="br-panel">
          <h2>{ar ? "الأنماط" : "Patterns"}</h2>
          <div className="sub">{ar ? "فعّل · ألغِ · احذف" : "Enable · disable · delete"}</div>
          {patterns.length === 0 ? (
            <EmptyState ar={ar} />
          ) : (
            <div>
              {patterns.map((p) => (
                <PatternRow key={p.id} pattern={p} ar={ar} />
              ))}
            </div>
          )}
        </div>

        {/* Recent feedback events */}
        {recentEvents.length > 0 ? (
          <div className="br-panel">
            <h2>{ar ? "سجل أحداث التغذية الراجعة" : "Feedback event log"}</h2>
            <div className="sub">
              {ar
                ? "كل حدث يُعدَّل الدماغ على أساسه — من التزام بخطة إلى تجاهل إشارة."
                : "Every event the brain is tuned on — from a plan commit to a dismissed insight."}
            </div>
            <div>
              {recentEvents.map((e) => (
                <FeedbackEventRow key={e.id} event={e} ar={ar} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Voluntary forgetting */}
        {unlearned > 0 ? (
          <div className="br-panel">
            <h2>{ar ? "نسيان طوعي" : "Voluntary forgetting"}</h2>
            <div className="sub">
              {ar
                ? `${unlearned} نمط حُذف من الذاكرة العاملة بناءً على طلبك.`
                : `${unlearned} pattern${unlearned === 1 ? "" : "s"} forgotten on request.`}
            </div>
            {patterns
              .filter((p) => p.status === "UNLEARNED")
              .map((p) => (
                <div key={p.id} className="br-row">
                  <div className="rt">
                    <div className="ts" style={{ fontStyle: "italic" }}>
                      {ar ? p.statementAr ?? p.statementEn : p.statementEn}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function PatternRow({ pattern, ar }: { pattern: any; ar: boolean }) {
  const enabled = pattern.status === "ENABLED";
  const m = pattern.module ? MODULE_LABEL[pattern.module] : null;

  return (
    <div className="br-row" style={{ opacity: enabled ? 1 : 0.6 }}>
      <div className="rt">
        <div className="tt" style={{ fontStyle: "italic", fontWeight: 600 }}>
          "{ar ? pattern.statementAr ?? pattern.statementEn : pattern.statementEn}"
        </div>
        <div className="ts">
          {pattern.authoredBy === "auto"
            ? (ar ? "تعلّم تلقائي" : "Auto-learned")
            : (ar ? "يدوي" : "Manual")}
          {m ? ` · ${ar ? m.ar : m.en}` : ""}
          {` · ${pattern.evidenceCount} ${ar ? "حدث" : "events"}`}
          {` · ${ar ? "ثقة" : "conf"} ${(pattern.confidence * 100).toFixed(0)}%`}
          {` · ${ar ? "آخر مشاهدة" : "last seen"} ${new Intl.DateTimeFormat(
            ar ? "ar-JO-u-nu-latn" : "en-US",
            { day: "numeric", month: "short" },
          ).format(pattern.lastObservedAt)}`}
        </div>
      </div>

      <span className={`br-chip ${enabled ? "ok" : "warn"}`}>
        {enabled ? (ar ? "نشط" : "Active") : (ar ? "موقوف" : "Disabled")}
      </span>

      {/* Toggle */}
      <form action={togglePattern}>
        <input type="hidden" name="id" value={pattern.id} />
        <button
          type="submit"
          className={`br-switch ${enabled ? "on" : ""}`}
          aria-pressed={enabled}
          title={enabled
            ? (ar ? "إيقاف هذا النمط" : "Disable this pattern")
            : (ar ? "تفعيل هذا النمط" : "Enable this pattern")}
        />
      </form>

      {/* Forget */}
      <form action={unlearnPattern}>
        <input type="hidden" name="id" value={pattern.id} />
        <button type="submit" className="br-btn br-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }} title={ar ? "نسيان هذا النمط" : "Forget this pattern"}>
          {ar ? "ينسى" : "Forget"}
        </button>
      </form>

      {/* Delete */}
      <form action={deletePattern}>
        <input type="hidden" name="id" value={pattern.id} />
        <button type="submit" className="br-btn danger" style={{ fontSize: 11, padding: "6px 12px" }} title={ar ? "حذف نهائي" : "Delete"}>
          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

const KIND_GLYPH: Record<string, string> = {
  PLAN_COMMITTED:           "✓",
  PLAN_ABANDONED:           "✗",
  PLAN_COMPLETED:           "★",
  PLAN_STEP_DONE:           "·",
  PLAN_STEP_BLOCKED:        "⊘",
  INSIGHT_HELPFUL:          "+",
  INSIGHT_DISMISSED:        "−",
  INSIGHT_RESOLVED:         "✓",
  RECOMMENDATION_OVERRIDDEN:"↩",
  OUTCOME_RIGHT:            "▲",
  OUTCOME_WRONG:            "▼",
  MEMORY_USEFUL:            "⬡",
  MEMORY_IRRELEVANT:        "⬡",
};

const KIND_COLOR: Record<string, string> = {
  PLAN_COMMITTED:           "var(--sage)",
  PLAN_COMPLETED:           "var(--sage)",
  PLAN_STEP_DONE:           "var(--sage)",
  INSIGHT_HELPFUL:          "var(--sage)",
  INSIGHT_RESOLVED:         "var(--sage)",
  OUTCOME_RIGHT:            "var(--sage)",
  PLAN_ABANDONED:           "#cf9384",
  PLAN_STEP_BLOCKED:        "#cf9384",
  INSIGHT_DISMISSED:        "#cf9384",
  OUTCOME_WRONG:            "#cf9384",
  RECOMMENDATION_OVERRIDDEN:"var(--gold-soft)",
  MEMORY_USEFUL:            "var(--gold-soft)",
  MEMORY_IRRELEVANT:        "var(--mist)",
};

function FeedbackEventRow({ event, ar }: { event: any; ar: boolean }) {
  const ageMs = Date.now() - new Date(event.ts).getTime();
  const ageMins = Math.round(ageMs / 60000);
  const ageHrs = Math.round(ageMs / 3600000);
  const ageDays = Math.round(ageMs / 86400000);
  const ageLabel =
    ageMins < 60
      ? ar ? `منذ ${ageMins} دقيقة` : `${ageMins}m ago`
      : ageHrs < 24
      ? ar ? `منذ ${ageHrs} ساعة` : `${ageHrs}h ago`
      : ar ? `منذ ${ageDays} يوم` : `${ageDays}d ago`;

  const glyph = KIND_GLYPH[event.kind] ?? "·";
  const color = KIND_COLOR[event.kind] ?? "var(--mist)";
  const moduleLabel = event.module ? MODULE_LABEL[event.module]?.[ar ? "ar" : "en"] ?? event.module : null;
  const kindLabel = event.kind.toLowerCase().replace(/_/g, " ");

  return (
    <div
      className="br-row"
      style={{ gap: 12 }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 13,
          color,
          minWidth: 16,
          textAlign: "center",
          flexShrink: 0,
        }}
        aria-hidden
      >
        {glyph}
      </span>
      <div className="rt" style={{ flex: 1, minWidth: 0 }}>
        <div className="tt" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cream)" }}>
          {kindLabel}
          {moduleLabel ? <span style={{ fontWeight: 400, opacity: 0.65, marginInlineStart: 8 }}>{moduleLabel}</span> : null}
        </div>
        {event.category ? (
          <div className="ts" style={{ fontSize: 11 }}>{event.category}</div>
        ) : null}
      </div>
      <span style={{ fontSize: 11, color: "var(--mist)", opacity: 0.55, flexShrink: 0, whiteSpace: "nowrap" }}>
        {ageLabel}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div
        className="inline-flex h-12 w-12 items-center justify-center"
        style={{
          border: "1px solid rgba(194,163,90,.3)",
          color: "var(--gold-soft)",
          background: "rgba(13,31,26,.4)",
          borderRadius: 14,
          margin: "0 auto",
        }}
      >
        <Brain className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(22px, 3vw, 30px)",
          color: "#fff",
          marginTop: 16,
        }}
      >
        {ar ? "لم أتعلّم شيئاً بعد." : "I haven't learned anything yet."}
      </h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--mist)", opacity: 0.7, marginTop: 10, maxWidth: "52ch", marginInline: "auto" }}>
        {ar
          ? "كل ما تفعله بالإشارات والخطط يدخل سجل التغذية الراجعة. أو ابدأ بأحداث تدريبية مزروعة لرؤية كيف يعمل الاستخلاص."
          : "Every action you take on insights and plans flows into the feedback log. Or seed plausible training events to see the analyzer in action."}
      </p>
      <div style={{ marginTop: 20 }}>
        <form action={seedFeedback}>
          <button type="submit" className="br-btn br-btn-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع أحداث تدريبية" : "Seed training events"}
          </button>
        </form>
      </div>
    </div>
  );
}
