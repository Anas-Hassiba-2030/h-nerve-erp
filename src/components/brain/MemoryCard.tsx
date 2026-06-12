// MemoryCard — a single recalled memory rendered as a portrait editorial tile.
//
// Layout:
//   ┌──────────────────────────────────────┐
//   │ INK TOP (the date stamp + module)    │
//   │ I REMEMBER · APR 18, 2024 · HOTELS   │
//   │ "Arena hosts EuroSkills, …"          │
//   ├──────────────────────────────────────┤
//   │ CREAM BODY (the story)               │
//   │ Arena Sofia hosted the EuroSkills…   │
//   │                                      │
//   │ — Lesson —                            │
//   │ When Arena books a conference > 1,500 │
//   │  attendees, pre-stage F&B at 1.4×.    │
//   ├───────────────────────────────────────┤
//   │ BOTTOM RAIL (module accent)           │
//   │ tags · outcome chip · similarity %    │
//   └───────────────────────────────────────┘
//
// Phase 6 of docs/PHASES-INTELLIGENCE.md.

import { Quote } from "lucide-react";
import { HeritagePill } from "@/components/heritage";

const MODULE_ACCENT: Record<string, string> = {
  HOTELS:    "var(--heri-terracotta)",
  DAIRY:     "var(--heri-copper)",
  FARMS:     "var(--heri-teal)",
  EDUCATION: "var(--heri-rose)",
  FINANCE:   "var(--heri-ink)",
  GROUP:     "var(--heri-ochre)",
  SUPPLY:    "var(--heri-ochre-2)",
};

const MODULE_LABEL: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "الفنادق", en: "Hotels" },
  DAIRY:     { ar: "الألبان", en: "Dairy" },
  FARMS:     { ar: "المزارع", en: "Farms" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  FINANCE:   { ar: "المالية", en: "Finance" },
  GROUP:     { ar: "المجموعة", en: "Group" },
  SUPPLY:    { ar: "سلسلة التوريد", en: "Supply" },
};

export type MemoryCardProps = {
  memory: {
    id: string;
    ts: Date;
    module: string;
    headline: { ar: string; en: string };
    body: { ar: string; en: string };
    tags: string[];
    outcome?: { metric: string; delta: number; lessonLearned?: string };
    /** Bilingual lesson, when available. Recall results populate both languages. */
    lesson?: { ar?: string | null; en?: string | null };
  };
  similarity?: number;
  ar: boolean;
  /** When true, render the compact "recall" variant used inline next to alerts/insights. */
  compact?: boolean;
};

export function MemoryCard({ memory, similarity, ar, compact = false }: MemoryCardProps) {
  const accent = MODULE_ACCENT[memory.module] ?? "var(--heri-rule-strong)";
  const moduleLabel = MODULE_LABEL[memory.module] ?? { ar: memory.module, en: memory.module };
  const dateStr = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(memory.ts);
  const outcomePct =
    memory.outcome && Math.abs(memory.outcome.delta) >= 0.005
      ? `${memory.outcome.delta >= 0 ? "+" : ""}${(memory.outcome.delta * 100).toFixed(0)}%`
      : null;

  return (
    <article
      className="relative flex flex-col"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        overflow: "hidden",
        height: compact ? undefined : "100%",
      }}
    >
      {/* INK TOP STRIP — date stamp + module + headline */}
      <header
        style={{
          background: "var(--heri-ink)",
          color: "var(--heri-cream)",
          padding: compact ? "12px 16px" : "16px 20px",
          position: "relative",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            insetInlineStart: 0,
            height: "100%",
            width: 3,
            background: accent,
          }}
        />
        <div
          className="ms-1.5 inline-flex items-center gap-2"
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 9.5,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "color-mix(in srgb, var(--heri-cream) 65%, transparent)",
          }}
        >
          <Quote className="h-2.5 w-2.5" strokeWidth={1.5} />
          <span style={{ color: "var(--heri-ochre)" }}>
            {ar ? "أتذكّر" : "I remember"}
          </span>
          <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{dateStr.toUpperCase()}</span>
          <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
          <span>{ar ? moduleLabel.ar : moduleLabel.en.toUpperCase()}</span>
        </div>
        <h3
          className={ar ? "ms-1.5 mt-2" : "font-display-latin ms-1.5 mt-2"}
          style={{
            fontSize: compact ? 16 : 18,
            lineHeight: 1.3,
            letterSpacing: ar ? 0 : "-0.012em",
            fontWeight: ar ? 600 : 500,
            color: "var(--heri-cream)",
            textWrap: "balance" as any,
            fontFamily: ar
              ? "'Reem Kufi','Aref Ruqaa','IBM Plex Sans Arabic',serif"
              : undefined,
            maxWidth: "32em",
          }}
        >
          {ar ? memory.headline.ar : memory.headline.en}
        </h3>
      </header>

      {/* CREAM BODY — story + lesson */}
      <div className="ms-2 flex-1 px-5 py-5">
        <p
          className="measure"
          style={{
            fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
            fontSize: compact ? 13 : 14,
            lineHeight: 1.6,
            color: "var(--heri-ink-2)",
            maxWidth: "60ch",
            fontStyle: ar ? "normal" : "normal",
          }}
        >
          {ar ? memory.body.ar : memory.body.en}
        </p>

        {(() => {
          const lessonText = ar
            ? (memory.lesson?.ar || memory.lesson?.en || memory.outcome?.lessonLearned)
            : (memory.lesson?.en || memory.outcome?.lessonLearned);
          if (!lessonText) return null;
          return (
            <div
              className="mt-4 pt-3"
              style={{ borderTop: "1px solid var(--heri-rule)" }}
            >
              <div
                className="heri-eyebrow inline-flex items-center gap-2"
                style={{ color: accent }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 1.5,
                    background: accent,
                  }}
                />
                {ar ? "الدرس المُستفاد" : "Lesson"}
              </div>
              <p
                className={ar ? "mt-2" : "font-display-latin mt-2"}
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--heri-ink)",
                  fontStyle: "italic",
                  maxWidth: "55ch",
                  fontFamily: ar
                    ? "'IBM Plex Sans Arabic','Cairo',sans-serif"
                    : undefined,
                }}
              >
                "{lessonText}"
              </p>
            </div>
          );
        })()}
      </div>

      {/* BOTTOM RAIL — tags + outcome chip + similarity */}
      <footer
        className="ms-2 px-5 py-3 flex flex-wrap items-center gap-2"
        style={{
          borderTop: "1px solid var(--heri-rule)",
          background: "var(--heri-cream-2)",
        }}
      >
        {memory.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--heri-ink-3)",
              padding: "2px 8px",
              border: "1px solid var(--heri-rule)",
              background: "var(--heri-cream)",
            }}
          >
            {tag}
          </span>
        ))}
        <div className="grow" />
        {outcomePct ? (
          <HeritagePill
            tone={(memory.outcome?.delta ?? 0) >= 0 ? "success" : "critical"}
          >
            {memory.outcome?.metric}: {outcomePct}
          </HeritagePill>
        ) : null}
        {typeof similarity === "number" ? (
          <span
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--heri-copper)",
              fontVariantNumeric: "tabular-nums",
            }}
            title={`similarity ${(similarity * 100).toFixed(1)}%`}
          >
            {(similarity * 100).toFixed(0)}% match
          </span>
        ) : null}
      </footer>
    </article>
  );
}
