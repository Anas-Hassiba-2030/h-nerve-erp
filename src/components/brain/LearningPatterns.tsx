"use client";

// LearningPatterns — the client/API-driven learning view behind /learning.
//
// useEffect → GET /api/learning/patterns. Renders the feedback signal
// grouped by kind (counts) and the weekly trend sparkline (LearningTrend,
// recharts). The fetch-driven twin of the SSR /brain/learning page, which
// shows the extracted BrainPatterns + toggles. This one shows the raw
// signal the patterns are learned FROM.
//
// Phase 7 of docs/governance/PHASES-INTELLIGENCE.md.

import { useEffect, useState } from "react";
import { LearningTrend } from "@/components/brain/LearningTrend";

type PatternsResponse = {
  totalEvents: number;
  weeks: { week: string; total: number; accepted: number; rejected: number; neutral: number }[];
  byKind: Record<string, number>;
  byModule: Record<string, number>;
};

const KIND_LABEL: Record<string, { ar: string; en: string }> = {
  INSIGHT_DISMISSED:         { ar: "تجاهل إشارة", en: "Insight dismissed" },
  INSIGHT_HELPFUL:           { ar: "إشارة مفيدة", en: "Insight helpful" },
  INSIGHT_RESOLVED:          { ar: "إشارة محلولة", en: "Insight resolved" },
  PLAN_COMMITTED:            { ar: "اعتماد خطة", en: "Plan committed" },
  PLAN_ABANDONED:            { ar: "إلغاء خطة", en: "Plan abandoned" },
  PLAN_COMPLETED:            { ar: "إكمال خطة", en: "Plan completed" },
  PLAN_STEP_DONE:            { ar: "إنجاز خطوة", en: "Step done" },
  PLAN_STEP_BLOCKED:         { ar: "تعطّل خطوة", en: "Step blocked" },
  RECOMMENDATION_OVERRIDDEN: { ar: "تجاوز توصية", en: "Recommendation overridden" },
  OUTCOME_RIGHT:             { ar: "نتيجة صائبة", en: "Outcome right" },
  OUTCOME_WRONG:             { ar: "نتيجة خاطئة", en: "Outcome wrong" },
  MEMORY_USEFUL:             { ar: "ذاكرة مفيدة", en: "Memory useful" },
  MEMORY_IRRELEVANT:         { ar: "ذاكرة غير مفيدة", en: "Memory irrelevant" },
};

export function LearningPatterns({ ar }: { ar: boolean }) {
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/learning/patterns?weeks=12", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: PatternsResponse) => {
        if (alive) setData(j);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <Notice ar={ar} text={ar ? "تعذّر تحميل الأنماط." : "Couldn't load patterns."} />;
  }
  if (!data) {
    return <Notice ar={ar} text={ar ? "جارٍ التحميل…" : "Loading…"} />;
  }

  const kinds = Object.entries(data.byKind).sort((a, b) => b[1] - a[1]);
  const maxCount = kinds.length ? Math.max(...kinds.map(([, n]) => n)) : 0;

  return (
    <div className="space-y-6">
      {/* Weekly trend */}
      <LearningTrend ar={ar} weeks={12} />

      {/* Signal grouped by kind */}
      <section>
        <header className="flex items-center justify-between px-1 pb-2">
          <span className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "الإشارة حسب النوع" : "Signal by type"}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--heri-ink-3)",
            }}
          >
            {data.totalEvents.toLocaleString("en-US")} {ar ? "حدث" : "events"}
          </span>
        </header>

        {kinds.length === 0 ? (
          <Notice ar={ar} text={ar ? "لا أحداث تغذية راجعة بعد." : "No feedback events yet."} />
        ) : (
          <ul className="space-y-1.5">
            {kinds.map(([kind, count]) => {
              const label = ar ? KIND_LABEL[kind]?.ar ?? kind : KIND_LABEL[kind]?.en ?? kind;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <li
                  key={kind}
                  className="flex items-center gap-3 px-3 py-2"
                  style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}
                >
                  <span style={{ fontSize: 12.5, color: "var(--heri-ink)", minWidth: "12ch" }}>{label}</span>
                  <span
                    aria-hidden
                    className="grow"
                    style={{ height: 6, background: "var(--heri-cream-2)", position: "relative", overflow: "hidden" }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        insetInlineStart: 0,
                        top: 0,
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--heri-ochre)",
                        transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--heri-ink-2)",
                      minWidth: "3ch",
                      textAlign: "end",
                    }}
                  >
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Notice({ ar, text }: { ar: boolean; text: string }) {
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        padding: "32px 24px",
        textAlign: "center",
        fontSize: 13,
        color: "var(--heri-ink-3)",
        fontStyle: "italic",
        border: "1px solid var(--heri-rule)",
        background: "var(--heri-cream-2)",
      }}
    >
      {text}
    </div>
  );
}
