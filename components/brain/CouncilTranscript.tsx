"use client";

// CouncilTranscript — renders a CouncilSession as a magazine-style spread.
//
// Each specialist voice is a tile with its agent's accent color as the
// inline-start rail. The thesis is in Fraunces serif at editorial size.
// Evidence pills sit in mono uppercase at the foot of each tile.
//
// The Moderator's synthesis is rendered as a larger plinth with a soft
// gradient rail along the top, the recommendation in display serif, and
// a confidence number that ticks up from 0 → final on mount.
//
// Animation: voices fade-up with translate-y, staggered 80ms apart via
// the existing .heri-stagger primitive.

import { useEffect, useState } from "react";
import type { CouncilSession, AgentVoice } from "@/lib/brain/council";
import { HeritagePill } from "@/components/heritage";
import { SmoothNumber } from "./SmoothNumber";

const AGENT_ACCENT: Record<string, string> = {
  "hospitality-expert": "var(--heri-terracotta)",
  "dairy-expert":       "var(--heri-copper)",
  "agri-expert":        "var(--heri-teal)",
  "finance-brain":      "var(--heri-ink)",
  "risk-officer":       "var(--heri-ochre-2)",
  moderator:            "var(--heri-ochre)",
};

// Short persona descriptor under each speaker's name — turns a label into a
// recognisable seat at the table. Bilingual; falls back to nothing if unknown.
const AGENT_ROLE: Record<string, { ar: string; en: string }> = {
  "hospitality-expert": { ar: "مشغّل فنادق أول · ضيافة", en: "Senior hotel operator · hospitality" },
  "dairy-expert":       { ar: "جودة الألبان · المها", en: "Dairy QC lead · Maha" },
  "agri-expert":        { ar: "مهندس زراعي · لوران", en: "Agronomy lead · Loran" },
  "finance-brain":      { ar: "الخزينة والهامش", en: "Treasury & margin" },
  "risk-officer":       { ar: "ضابط المخاطر", en: "Risk officer" },
  moderator:            { ar: "المُيَسّر", en: "Moderator" },
};

const POSITION_TONE: Record<string, "success" | "warn" | "critical" | "info" | "neutral"> = {
  support:  "success",
  oppose:   "critical",
  qualify:  "warn",
  moderate: "info",
};

// Debate spectrum order — support first, dissent last, so the reader rides
// the tension up to the moderator's resolution.
const STANCE_RANK: Record<string, number> = {
  support: 0,
  moderate: 1,
  qualify: 2,
  oppose: 3,
};

export function CouncilTranscript({
  session,
  ar,
}: {
  session: CouncilSession;
  ar: boolean;
}) {
  // Tick the moderator's confidence on mount only (not when session changes).
  const [confidenceTarget, setConfidenceTarget] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setConfidenceTarget(session.synthesis.confidence ?? 0), 280);
    return () => clearTimeout(t);
  }, [session.id, session.synthesis.confidence]);

  const ordered = [...session.voices].sort(
    (a, b) => (STANCE_RANK[a.position] ?? 9) - (STANCE_RANK[b.position] ?? 9)
  );
  const counts = session.voices.reduce<Record<string, number>>((m, v) => {
    m[v.position] = (m[v.position] ?? 0) + 1;
    return m;
  }, {});

  return (
    <div className="space-y-6">
      {/* ── Stance tally — the shape of the room at a glance ──────────── */}
      <StanceTally counts={counts} total={session.voices.length} ar={ar} />

      {/* ── Specialist voices ────────────────────────────────────────── */}
      <section className="grid gap-4 heri-stagger md:grid-cols-2">
        {ordered.map((v, i) => (
          <VoiceTile key={v.agentId + i} voice={v} ar={ar} index={i + 1} />
        ))}
      </section>

      {/* ── Debate → decision transition ─────────────────────────────── */}
      <div className="flex items-center gap-3" aria-hidden>
        <span style={{ flex: 1, height: 1, background: "var(--heri-rule)" }} />
        <span
          className="heri-eyebrow heri-eyebrow-ink"
          style={{ letterSpacing: "0.2em" }}
        >
          {ar ? "من النقاش إلى القرار" : "From debate to decision"}
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--heri-rule)" }} />
      </div>

      {/* ── Moderator synthesis ──────────────────────────────────────── */}
      <section className="heri-hero" style={{ position: "relative" }}>
        <div className="px-6 py-8 md:px-9 md:py-10">
          <div className="heri-eyebrow inline-flex items-center gap-2">
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 18,
                height: 1.5,
                background: "var(--heri-ochre)",
              }}
            />
            {ar ? "المُيَسّر · توصية" : "Moderator · synthesis"}
          </div>
          <p
            className={ar ? "mt-4" : "font-display-latin mt-4"}
            style={{
              fontSize: "clamp(20px, 1.8vw, 28px)",
              lineHeight: 1.4,
              letterSpacing: ar ? "-0.005em" : "-0.014em",
              fontWeight: ar ? 500 : 500,
              color: "var(--heri-ink)",
              textWrap: "balance" as any,
              maxWidth: "70ch",
            }}
          >
            {session.synthesis.recommendation || "—"}
          </p>

          <div
            className="mt-7 grid gap-4 md:grid-cols-[auto_1fr] md:items-end"
            style={{ borderTop: "1px solid var(--heri-rule)", paddingTop: 18 }}
          >
            <div>
              <div className="heri-eyebrow heri-eyebrow-ink mb-1">
                {ar ? "الثقة" : "Confidence"}
              </div>
              <div
                className="heri-number"
                style={{
                  fontSize: "clamp(48px, 5vw, 72px)",
                  lineHeight: 1,
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                  letterSpacing: "-0.025em",
                }}
              >
                <SmoothNumber
                  value={confidenceTarget * 100}
                  format="integer"
                  durationMs={1200}
                  flash={false}
                />
                <span
                  style={{
                    fontFamily:
                      "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: "0.32em",
                    color: "var(--heri-ink-3)",
                    marginInlineStart: 8,
                    letterSpacing: "0.06em",
                  }}
                >
                  /100
                </span>
              </div>
            </div>
            {session.synthesis.dissentNote ? (
              <div
                style={{
                  borderInlineStart: "2px solid var(--heri-terracotta)",
                  paddingInlineStart: 14,
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontStyle: "italic",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "var(--heri-ink-2)",
                  maxWidth: "55ch",
                }}
              >
                <div
                  className="heri-eyebrow"
                  style={{
                    color: "var(--heri-terracotta)",
                    marginBottom: 4,
                    fontStyle: "normal",
                  }}
                >
                  {ar ? "معارضة مسجّلة" : "Recorded dissent"}
                </div>
                "{session.synthesis.dissentNote}"
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function VoiceTile({ voice, ar, index }: { voice: AgentVoice; ar: boolean; index: number }) {
  const accent = AGENT_ACCENT[voice.agentId] ?? "var(--heri-rule-strong)";
  const positionTone = POSITION_TONE[voice.position] ?? "neutral";
  const positionLabel = positionLabels(voice.position, ar);
  const role = AGENT_ROLE[voice.agentId];

  return (
    <article
      className="relative"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "20px 22px",
        overflow: "hidden",
      }}
    >
      {/* Inline-start rail — the agent's accent */}
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{ insetInlineStart: 0, width: 3, background: accent }}
      />

      <header className="ms-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2.5">
          {/* Seat marker — the agent's index in the agent's accent */}
          <span
            aria-hidden
            style={{
              flex: "none",
              width: 22,
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${accent}`,
              color: accent,
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 11,
              fontWeight: 600,
              marginTop: 1,
            }}
          >
            {index}
          </span>
          <div className="min-w-0">
            <div
              className="heri-eyebrow"
              style={{ color: accent, letterSpacing: "0.16em" }}
            >
              {ar ? voice.speakerLabel.ar : voice.speakerLabel.en}
            </div>
            {role ? (
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--heri-ink-3)",
                  marginTop: 2,
                  lineHeight: 1.35,
                }}
              >
                {ar ? role.ar : role.en}
              </div>
            ) : null}
          </div>
        </div>
        <HeritagePill tone={positionTone}>{positionLabel}</HeritagePill>
      </header>

      <p
        className={ar ? "ms-2 mt-3" : "font-display-latin ms-2 mt-3"}
        style={{
          fontSize: 14.5,
          lineHeight: 1.55,
          letterSpacing: ar ? 0 : "-0.005em",
          color: "var(--heri-ink)",
          fontWeight: 400,
          maxWidth: "60ch",
          fontFamily: ar
            ? "'Reem Kufi','Aref Ruqaa','IBM Plex Sans Arabic',serif"
            : undefined,
        }}
      >
        {voice.thesis}
      </p>

      {voice.evidence && voice.evidence.length > 0 ? (
        <ul
          className="ms-2 mt-4 flex flex-wrap items-center gap-1.5"
          style={{ borderTop: "1px solid var(--heri-rule)", paddingTop: 12 }}
        >
          {voice.evidence.map((e, i) => (
            <li key={i}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  fontFamily:
                    "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--heri-ink-2)",
                  background: "var(--heri-cream-2)",
                  border: "1px solid var(--heri-rule)",
                }}
                title={`weight ${(e.weight * 100).toFixed(0)}%`}
              >
                <span
                  aria-hidden
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: accent,
                    opacity: Math.max(0.4, e.weight),
                  }}
                />
                {e.label || e.ref}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function positionLabels(p: AgentVoice["position"], ar: boolean): string {
  if (ar) {
    return p === "support" ? "تأييد"
      : p === "oppose" ? "معارضة"
      : p === "qualify" ? "تحفّظ"
      : "تأمّل";
  }
  return p === "support" ? "Support"
    : p === "oppose" ? "Oppose"
    : p === "qualify" ? "Qualify"
    : "Moderate";
}

function StanceTally({
  counts,
  total,
  ar,
}: {
  counts: Record<string, number>;
  total: number;
  ar: boolean;
}) {
  if (total === 0) return null;
  const order: Array<{ key: AgentVoice["position"]; color: string }> = [
    { key: "support", color: "var(--heri-teal)" },
    { key: "moderate", color: "var(--heri-ochre-2)" },
    { key: "qualify", color: "var(--heri-ochre)" },
    { key: "oppose", color: "var(--heri-terracotta)" },
  ];
  const present = order.filter((o) => (counts[o.key] ?? 0) > 0);

  return (
    <section
      style={{
        border: "1px solid var(--heri-rule)",
        background: "var(--heri-cream-2)",
        padding: "13px 16px",
      }}
    >
      <div className="flex items-center justify-between gap-3" style={{ marginBottom: 9 }}>
        <div className="heri-eyebrow heri-eyebrow-ink">
          {ar ? "موقف المجلس" : "Where the council stands"}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 10.5,
            color: "var(--heri-ink-3)",
            letterSpacing: "0.08em",
          }}
        >
          {total} {ar ? "أصوات" : "voices"}
        </div>
      </div>

      {/* Proportion bar */}
      <div
        className="flex w-full overflow-hidden"
        style={{ height: 6, borderRadius: 2, background: "var(--heri-rule)" }}
      >
        {present.map((o) => (
          <span
            key={o.key}
            style={{ width: `${((counts[o.key] ?? 0) / total) * 100}%`, background: o.color }}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" style={{ marginTop: 10 }}>
        {present.map((o) => (
          <li
            key={o.key}
            className="flex items-center gap-1.5"
            style={{ fontSize: 11.5, color: "var(--heri-ink-2)" }}
          >
            <span
              aria-hidden
              style={{ width: 8, height: 8, background: o.color, borderRadius: "50%" }}
            />
            <span className="heri-number-mono" style={{ fontWeight: 600, color: "var(--heri-ink)" }}>
              {counts[o.key]}
            </span>
            {positionLabels(o.key, ar)}
          </li>
        ))}
      </ul>
    </section>
  );
}
