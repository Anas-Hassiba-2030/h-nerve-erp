// /brain/learning — what the brain has learned about this org.
//
// Aesthetic: Quiet Authority (DESIGN-SKILL.md §1.C) — restrained,
// institutional, deep ink + warm gray + a single ochre accent only on
// the active toggles.
//
// Phase 7 of docs/PHASES-INTELLIGENCE.md.

import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { Brain, Database, Cpu, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { digest } from "@/lib/brain/feedback.live";
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
    <>
      <PageHeader
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

      <PageContainer>
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

        {/* Action rail */}
        <div
          className="flex flex-wrap items-center gap-2 px-1 py-3"
          style={{
            borderTop: "1px solid var(--heri-rule)",
            borderBottom: "1px solid var(--heri-rule)",
          }}
        >
          <span className="heri-eyebrow">{ar ? "تشغيل" : "Run"}</span>
          <form action={learnNow}>
            <button type="submit" className="heri-btn heri-btn-primary">
              <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "إعادة التحليل" : "Re-analyze"}
            </button>
          </form>
          {totalFeedback === 0 ? (
            <form action={seedFeedback}>
              <button type="submit" className="heri-btn heri-btn-secondary">
                <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "ازرع أحداث تدريبية" : "Seed training events"}
              </button>
            </form>
          ) : null}
          <div className="grow" />
          <form action={clearAllFeedback}>
            <button
              type="submit"
              className="heri-btn heri-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 11, color: "var(--heri-terracotta)" }}
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
            className="grid gap-3 heri-stagger"
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
          <HeritageSection
            eyebrow={ar ? "ما تم نسيانه" : "What's been unlearned"}
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
                      background: "var(--heri-cream-2)",
                      border: "1px solid var(--heri-rule)",
                      fontSize: 12.5,
                      color: "var(--heri-ink-3)",
                      fontStyle: "italic",
                    }}
                  >
                    {ar ? p.statementAr ?? p.statementEn : p.statementEn}
                  </li>
                ))}
            </ul>
          </HeritageSection>
        ) : null}
      </PageContainer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "14px 18px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink">{label}</div>
      <div
        className="heri-number mt-2"
        style={{
          fontSize: "clamp(22px, 2.4vw, 30px)",
          fontWeight: 500,
          color: "var(--heri-ink)",
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
      className="relative"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "18px 20px 16px",
        opacity: enabled ? 1 : 0.55,
        transition: "opacity 220ms cubic-bezier(0.25,1,0.5,1)",
      }}
    >
      {/* Top eyebrow row */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="heri-eyebrow inline-flex items-center gap-2 flex-wrap"
            style={{
              color: enabled ? "var(--heri-ochre-2)" : "var(--heri-ink-3)",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 14,
                height: 1.5,
                background: enabled ? "var(--heri-ochre)" : "var(--heri-rule-strong)",
              }}
            />
            {pattern.authoredBy === "auto" ? (ar ? "تعلّم تلقائي" : "Auto-learned") : (ar ? "يدوي" : "Manual")}
            {m ? (
              <>
                <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                <span>{ar ? m.ar.toUpperCase() : m.en.toUpperCase()}</span>
              </>
            ) : null}
            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
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
            className="heri-focusable"
            style={{
              position: "relative",
              width: 38,
              height: 22,
              background: enabled ? "var(--heri-ochre)" : "var(--heri-rule)",
              border: enabled ? "1px solid var(--heri-ochre-2)" : "1px solid var(--heri-rule-strong)",
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
                background: enabled ? "var(--heri-cream)" : "var(--heri-cream-2)",
                border: "1px solid var(--heri-ink-3)",
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
          color: "var(--heri-ink)",
          letterSpacing: ar ? 0 : "-0.012em",
          fontStyle: "italic",
          maxWidth: "60ch",
          fontFamily: ar
            ? "'IBM Plex Sans Arabic','Cairo',sans-serif"
            : "'Fraunces','Tiempos Headline',Georgia,serif",
          textWrap: "balance" as any,
          /* Phase 7 signature reveal — clip-path wipe over 600ms */
          animation: "pattern-reveal 600ms cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        "{ar ? pattern.statementAr ?? pattern.statementEn : pattern.statementEn}"
      </p>

      {/* Footer — confidence + status + actions */}
      <footer
        className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-2"
        style={{ borderTop: "1px solid var(--heri-rule)" }}
      >
        <div className="flex items-center gap-2">
          <HeritagePill tone={enabled ? "info" : "neutral"}>
            {enabled ? (ar ? "نشط" : "Active") : (ar ? "موقوف" : "Disabled")}
          </HeritagePill>
          <span
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--heri-ink-3)",
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
              color: "var(--heri-ink-3)",
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
              className="heri-btn heri-btn-ghost"
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
              className="heri-btn heri-btn-ghost"
              style={{
                padding: "5px 10px",
                fontSize: 10,
                color: "var(--heri-terracotta)",
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
      className="heri-hero"
      style={{ padding: "60px 32px", textAlign: "center" }}
    >
      <div
        className="inline-flex h-12 w-12 items-center justify-center mx-auto"
        style={{
          border: "1px solid var(--heri-rule-strong)",
          color: "var(--heri-ochre)",
          background: "var(--heri-cream-2)",
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
          color: "var(--heri-ink)",
        }}
      >
        {ar ? "لم أتعلّم شيئاً بعد." : "I haven't learned anything yet."}
      </h2>
      <p
        className="measure mt-3 mx-auto"
        style={{
          fontSize: "clamp(13px, 1vw, 14.5px)",
          lineHeight: 1.55,
          color: "var(--heri-ink-2)",
        }}
      >
        {ar
          ? "كل ما تفعله بالإشارات والخطط يدخل سجل التغذية الراجعة. أو ابدأ بأحداث تدريبية مزروعة لرؤية كيف يعمل الاستخلاص."
          : "Every action you take on insights and plans flows into the feedback log. Or seed plausible training events to see the analyzer in action."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <form action={seedFeedback}>
          <button type="submit" className="heri-btn heri-btn-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع أحداث تدريبية" : "Seed training events"}
          </button>
        </form>
      </div>
    </section>
  );
}
