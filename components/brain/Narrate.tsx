"use client";

// Narrate — the signature tooltip of the H-Nerve Narrator (Phase 4).
//
// Behavior:
//   • Hover for 300ms → Stage 1: a one-line summary fades in.
//   • Hover for 1200ms → Stage 2: the box GROWS, a hairline divider draws,
//     and an editorial paragraph fades in via clip-path reveal.
//   • If the editorial isn't cached yet, a skeleton appears while we wait
//     for the server action.
//
// Aesthetic: Heritage Modern editorial. Cream plinth, single ochre rail
// at top, hairline border, no shadow. Fraunces serif body. Mono uppercase
// "BRAIN · NARRATIVE" eyebrow.
//
// Phase 4 of docs/PHASES-INTELLIGENCE.md.

import { useCallback, useEffect, useRef, useState } from "react";
import { narrate, type NarrateInput, type NarrateResult } from "@/app/(app)/brain/narrate/actions";

export type NarrateProps = {
  /** What this is about — used for cache keying. */
  topic: string;
  /** One-line summary shown in Stage 1 — should be instantly available. */
  summary: string;
  /** Structured facts the editorial paragraph will reason over. */
  facts: Record<string, any>;
  /** Locale — defaults to "en". */
  locale?: "ar" | "en";
  /** Optional manual citations (the model gets these too). */
  citations?: { ref: string; label: string }[];
  /** The wrapped element. Hovering ANY child triggers the tooltip. */
  children: React.ReactNode;
  /** Position of the tooltip relative to children. Defaults to "bottom". */
  placement?: "top" | "bottom";
  /** Disable the tooltip entirely (for tests / reduced-motion). */
  disabled?: boolean;
};

type Stage = "hidden" | "summary" | "editorial";

const SUMMARY_DELAY_MS = 300;
const EDITORIAL_DELAY_MS = 1200;

export function Narrate({
  topic,
  summary,
  facts,
  locale = "en",
  citations,
  children,
  placement = "bottom",
  disabled,
}: NarrateProps) {
  const [stage, setStage] = useState<Stage>("hidden");
  const [editorial, setEditorial] = useState<NarrateResult | null>(null);
  const [loading, setLoading] = useState(false);

  const summaryTimerRef = useRef<number | null>(null);
  const editorialTimerRef = useRef<number | null>(null);
  const fetchedKeyRef = useRef<string | null>(null);

  const cacheKey = stableKey(topic, locale, facts);

  const cancelTimers = useCallback(() => {
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    if (editorialTimerRef.current) {
      window.clearTimeout(editorialTimerRef.current);
      editorialTimerRef.current = null;
    }
  }, []);

  const fetchEditorial = useCallback(async () => {
    if (fetchedKeyRef.current === cacheKey) return;
    fetchedKeyRef.current = cacheKey;
    setLoading(true);
    try {
      const input: NarrateInput = {
        topic,
        register: "editorial",
        locale,
        facts,
        summary,
        citations,
      };
      const result = await narrate(input);
      setEditorial(result);
    } catch (e) {
      console.error("[narrate]", e);
      setEditorial({
        text:
          locale === "ar"
            ? "تعذّر توليد النص التحريري. تحقّق من الاتصال أو حاول مرة أخرى."
            : "Couldn't generate the editorial. Check the connection and retry.",
        cacheHit: false,
        isStub: true,
        ms: 0,
        wordCount: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [cacheKey, topic, locale, facts, summary, citations]);

  const onEnter = useCallback(() => {
    if (disabled) return;
    cancelTimers();
    summaryTimerRef.current = window.setTimeout(() => {
      setStage("summary");
    }, SUMMARY_DELAY_MS);
    editorialTimerRef.current = window.setTimeout(() => {
      setStage("editorial");
      void fetchEditorial();
    }, EDITORIAL_DELAY_MS);
  }, [cancelTimers, fetchEditorial, disabled]);

  const onLeave = useCallback(() => {
    cancelTimers();
    setStage("hidden");
  }, [cancelTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTimers();
    };
  }, [cancelTimers]);

  // Respect prefers-reduced-motion: skip the staged grow, jump straight to editorial.
  const reducedMotion = useReducedMotion();

  return (
    <span
      className="narrate"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      style={{ position: "relative", display: "inline-block" }}
    >
      {children}
      {stage !== "hidden" ? (
        <span
          className="narrate-tip"
          data-stage={stage}
          data-placement={placement}
          data-reduced-motion={reducedMotion ? "true" : "false"}
          role="tooltip"
        >
          <span className="narrate-rail" aria-hidden />
          <span className="narrate-eyebrow">
            {locale === "ar" ? "الراوي" : "BRAIN · NARRATIVE"}
          </span>
          <span className="narrate-summary">{summary}</span>
          {stage === "editorial" ? (
            <>
              <span className="narrate-divider" aria-hidden />
              <span className="narrate-editorial" data-loading={loading ? "true" : "false"}>
                {loading || !editorial ? (
                  <SkeletonText lines={3} />
                ) : (
                  editorial.text
                )}
              </span>
              {editorial && !loading ? (
                <span className="narrate-foot">
                  <span className="narrate-foot-tag">
                    {editorial.isStub
                      ? locale === "ar"
                        ? "وضع تجريبي"
                        : "stub"
                      : locale === "ar"
                        ? "كلود"
                        : "claude"}
                  </span>
                  <span className="narrate-foot-tag">
                    {editorial.cacheHit
                      ? locale === "ar"
                        ? "ذاكرة"
                        : "cached"
                      : `${editorial.ms}ms`}
                  </span>
                  <span className="narrate-foot-tag">
                    {editorial.wordCount} {locale === "ar" ? "كلمة" : "words"}
                  </span>
                </span>
              ) : null}
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span className="narrate-skel" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="narrate-skel-line"
          style={{
            width: i === lines - 1 ? "62%" : "100%",
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </span>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function stableKey(topic: string, locale: string, facts: Record<string, any>): string {
  return `${topic}|${locale}|${JSON.stringify(canonicalize(facts))}`;
}
function canonicalize(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const obj = v as Record<string, unknown>;
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = canonicalize(obj[k]);
      return acc;
    }, {});
}
