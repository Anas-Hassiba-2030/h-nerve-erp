// /brain/learning — what the brain has learned about this org.
//
// Aesthetic: Quiet Authority (DESIGN-SKILL.md §1.C) — restrained,
// institutional, deep ink + warm gray + a single ochre accent only on
// the active toggles.
//
// Phase 7 of docs/PHASES-INTELLIGENCE.md.

import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import "../../daylight.css";
import { Brain, Database, Cpu, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
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
  const locale = getLocale();
  const ar = locale === "ar";

  const [patterns, totalFeedback, monthDigest] = await Promise.all([
    prisma.brainPattern.findMany({
      orderBy: [{ status: "asc" }, { confidence: "desc" }],
    }),
    prisma.brainFeedback.count(),
    digest("month"),
  ]);

  const enabled = patterns.filter((p) => p.status === "ENABLED").length;
  const disabled = patterns.filter((p) => p.status === "DISABLED").length;
  const unlearned = patterns.filter((p) => p.status === "UNLEARNED").length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · ما تعلّمتُه" : "Brain · What I've learned"}
        title={
          ar
            ? "ما تعلّمتُه عن طريقتك في اتخاذ القرار"
            : "What I've learned about how you decide"
        }
        subtitle={
          ar
            ? "كل تجاهل، كل التزام، كل إلغاء يصبح إشارة. هذه هي الأنماط التي استخلصتُها — يمكنك إيقاف أيٍّ منها."
            : "Every dismiss, every commit, every abandonment becomes signal. These are the patterns I've extracted — you can disable any of them."
        }
      />
        {/* Top stats row */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={ar ? "أنماط نشطة" : "Active patterns"}    value={enabled}     />
          <Stat label={ar ? "موقوفة"     : "Disabled"}           value={disabled}    />
          <Stat label={ar ? "أحداث رصد" : "Feedback events"}    value={totalFeedback} />
          <Stat
            label={ar ? "قبول/رفض (30 يوم)" : "Accept/Reject (30d)"}
            value={`${monthDigest.accepted}/${monthDigest.rejected}`}
          />
        </section>

        {/* Phase 7 — weekly learning curve (accepted vs rejected signal) */}
        <div className="mt-3">
          <LearningTrend ar={ar} weeks={12} />
        </div>

        {/* Action rail */}
        <div
          className="flex flex-wrap items-center gap-2 px-1 py-3"
          style={{
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{ar ? "تشغيل" : "Run"}</span>
          <form action={learnNow}>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "إعادة التحليل" : "Re-analyze"}
            </button>
          </form>
          {totalFeedback === 0 ? (
            <form action={seedFeedback}>
              <button type="submit" className="dl-btn dl-btn-secondary">
                <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "ازرع أحداث تدريبية" : "Seed training events"}
              </button>
            </form>
          ) : null}
          <div className="grow" />
          <form action={clearAllFeedback}>
            <button
              type="submit"
              className="dl-btn dl-btn-secondary"
              style={{ padding: "6px 12px", fontSize: 11, color: "var(--brick)" }}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "مسح كل التعلّم" : "Clear all learning"}
            </button>
          </form>
        </div>

        {/* Patterns */}
        {patterns.length === 0 ? (
          <EmptyState ar={ar} />
        ) : (
          <section
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
            }}
          >
            {patterns.map((p) => (
              <PatternCard key={p.id} pattern={p} ar={ar} />
            ))}
          </section>
        )}

        {unlearned > 0 ? (
          <DaylightPanel
            title={ar ? "نسيان طوعي" : "Voluntary forgetting"}
            aside={
              ar
                ? `${unlearned} نمط حُذف من الذاكرة العاملة بناءً على طلبك.`
                : `${unlearned} pattern${unlearned === 1 ? "" : "s"} forgotten on request.`
            }
          >
            <ul className="space-y-1.5">
              {patterns
                .filter((p) => p.status === "UNLEARNED")
                .map((p) => (
                  <li
                    key={p.id}
                    className="px-3 py-2"
                    style={{
                      background: "var(--ivory)",
                      border: "1px solid var(--line)",
                      fontSize: 12.5,
                      color: "var(--ink-muted)",
                      fontStyle: "italic",
                      borderRadius: 8,
                    }}
                  >
                    {ar ? p.statementAr ?? p.statementEn : p.statementEn}
                  </li>
                ))}
            </ul>
          </DaylightPanel>
        ) : null}
    </DaylightShell>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: "var(--cream)",
        border: "1px solid var(--line)",
        padding: "14px 18px",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{label}</div>
      <div
        style={{
          fontSize: "clamp(22px, 2.4vw, 30px)",
          fontWeight: 500,
          color: "var(--ink)",
          marginTop: 8,
        }}
      >
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </div>
    </div>
  );
}

function PatternCard({ pattern, ar }: { pattern: any; ar: boolean }) {
  const enabled = pattern.status === "ENABLED";
  const m = pattern.module ? MODULE_LABEL[pattern.module] : null;

  return (
    <article
      className="panel reveal"
      style={{
        padding: "18px 20px 16px",
        opacity: enabled ? 1 : 0.55,
        transition: "opacity 220ms cubic-bezier(0.25,1,0.5,1)",
      }}
    >
      {/* Top eyebrow row */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em",
              color: enabled ? "var(--gold)" : "var(--ink-muted)",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 14,
                height: 1.5,
                background: enabled ? "var(--gold)" : "var(--line)",
              }}
            />
            {pattern.authoredBy === "auto" ? (ar ? "تعلّم تلقائي" : "Auto-learned") : (ar ? "يدوي" : "Manual")}
            {m ? (
              <>
                <span style={{ color: "var(--line)" }}>·</span>
                <span>{ar ? m.ar.toUpperCase() : m.en.toUpperCase()}</span>
              </>
            ) : null}
            <span style={{ color: "var(--line)" }}>·</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {pattern.evidenceCount} {ar ? "حدث" : "events"}
            </span>
          </div>
        </div>
        {/* Toggle — the only colored element on the page when ENABLED */}
        <form action={togglePattern}>
          <input type="hidden" name="id" value={pattern.id} />
          <button
            type="submit"
            aria-pressed={enabled}
            title={enabled
              ? (ar ? "إيقاف هذا النمط" : "Disable this pattern")
              : (ar ? "تفعيل هذا النمط" : "Enable this pattern")}
            style={{
              position: "relative",
              width: 38,
              height: 22,
              background: enabled ? "var(--gold)" : "var(--line)",
              border: enabled ? "1px solid var(--gold-soft)" : "1px solid var(--line)",
              borderRadius: 999,
              cursor: "pointer",
              transition: "background 220ms cubic-bezier(0.25,1,0.5,1), border-color 220ms cubic-bezier(0.25,1,0.5,1)",
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 2,
                insetInlineStart: enabled ? 18 : 2,
                width: 16,
                height: 16,
                background: enabled ? "var(--cream)" : "var(--ivory)",
                border: "1px solid var(--ink-muted)",
                borderRadius: "50%",
                transition: "inset-inline-start 220ms cubic-bezier(0.25,1,0.5,1)",
              }}
            />
          </button>
        </form>
      </header>

      {/* Statement — italic Fraunces, the editorial moment */}
      <p
        className={ar ? "mt-4" : "font-display-latin mt-4"}
        style={{
          fontSize: "clamp(15.5px, 1.2vw, 17px)",
          lineHeight: 1.5,
          color: "var(--ink)",
          letterSpacing: ar ? 0 : "-0.012em",
          fontStyle: "italic",
          maxWidth: "60ch",
          fontFamily: ar
            ? "'IBM Plex Sans Arabic','Cairo',sans-serif"
            : "'Fraunces','Tiempos Headline',Georgia,serif",
          textWrap: "balance" as any,
          animation: "pattern-reveal 600ms cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        "{ar ? pattern.statementAr ?? pattern.statementEn : pattern.statementEn}"
      </p>

      {/* Footer — confidence + status + actions */}
      <footer
        className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
            {enabled ? (ar ? "نشط" : "Active") : (ar ? "موقوف" : "Disabled")}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {ar ? "ثقة" : "conf"} {(pattern.confidence * 100).toFixed(0)}%
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
            }}
          >
            {ar ? "آخر مشاهدة" : "last seen"}{" "}
            {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
              day: "numeric",
              month: "short",
            }).format(pattern.lastObservedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <form action={unlearnPattern}>
            <input type="hidden" name="id" value={pattern.id} />
            <button
              type="submit"
              className="dl-btn dl-btn-secondary"
              style={{ padding: "5px 10px", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}
              title={ar ? "نسيان هذا النمط" : "Forget this pattern"}
            >
              {ar ? "ينسى" : "Forget"}
            </button>
          </form>
          <form action={deletePattern}>
            <input type="hidden" name="id" value={pattern.id} />
            <button
              type="submit"
              className="dl-btn dl-btn-secondary"
              style={{
                padding: "5px 10px",
                fontSize: 10,
                color: "var(--brick)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
              title={ar ? "حذف نهائي" : "Delete"}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </footer>
    </article>
  );
}

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <section
      className="panel reveal"
      style={{ padding: "60px 32px", textAlign: "center" }}
    >
      <div
        className="inline-flex h-12 w-12 items-center justify-center mx-auto"
        style={{
          border: "1px solid var(--line)",
          color: "var(--gold)",
          background: "var(--ivory)",
        }}
      >
        <Brain className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        className={ar ? "mt-5" : "font-display-latin mt-5"}
        style={{
          fontSize: "clamp(24px, 3vw, 38px)",
          lineHeight: 1.05,
          letterSpacing: ar ? "-0.005em" : "-0.022em",
          fontWeight: ar ? 600 : 500,
          color: "var(--ink)",
        }}
      >
        {ar ? "لم أتعلّم شيئاً بعد." : "I haven't learned anything yet."}
      </h2>
      <p
        className="measure mt-3 mx-auto"
        style={{
          fontSize: "clamp(13px, 1vw, 14.5px)",
          lineHeight: 1.55,
          color: "var(--ink-muted)",
        }}
      >
        {ar
          ? "كل ما تفعله بالإشارات والخطط يدخل سجل التغذية الراجعة. أو ابدأ بأحداث تدريبية مزروعة لرؤية كيف يعمل الاستخلاص."
          : "Every action you take on insights and plans flows into the feedback log. Or seed plausible training events to see the analyzer in action."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <form action={seedFeedback}>
          <button type="submit" className="dl-btn dl-btn-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع أحداث تدريبية" : "Seed training events"}
          </button>
        </form>
      </div>
    </section>
  );
}
