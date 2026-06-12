// /theater/council/[id] — The Decision Theater for a council session.
//
// Phase 9 of docs/PHASES-INTELLIGENCE.md. The composition phase: pulls
// situation (Phase 4 narrator) + history (Phase 6 memory) + simulation
// (Phase 2 simulator) + council voices (Phase 3) + plan (Phase 5) into
// a fullscreen 5-act magazine spread.
//
// Refined Editorial all the way (DESIGN-SKILL §1.A).

import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { composeFromCouncil, actTitle } from "@/lib/theater/director";
import { TheaterShell } from "@/components/theater/TheaterShell";
import { Act } from "@/components/theater/Act";
import { Pullquote } from "@/components/theater/Pullquote";
import { ArrowRight, Target } from "lucide-react";

const ROMAN = ["I", "II", "III", "IV", "V"];
const ACCENT_PER_AGENT: Record<string, string> = {
  "hospitality-expert": "#b85c38",
  "dairy-expert":       "#7d5a3a",
  "agri-expert":        "#1f4e4a",
  "finance-brain":      "#1a1410",
  "risk-officer":       "#a87a32",
};

export default async function TheaterCouncilPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const script = await composeFromCouncil(params.id, ar ? "ar" : "en");
  if (!script) notFound();

  const actTitles = [0, 1, 2, 3, 4].map((i) => actTitle(i as 0 | 1 | 2 | 3 | 4, ar ? "ar" : "en"));

  return (
    <TheaterShell
      topic={script.topic}
      ar={ar}
      exitHref={`/brain/council/${script.sessionId}`}
      actTitles={actTitles}
    >
      {/* ── ACT I — SITUATION ─────────────────────────────────────── */}
      <Act
        index={0}
        romanNumeral={ROMAN[0]}
        eyebrow={ar ? "المشهد" : "Scene"}
        title={ar ? "الوضع" : "The situation"}
      >
        <p
          className="theater-prose theater-drop-cap"
          dir={ar ? "rtl" : "ltr"}
        >
          {(script.acts[0] as any).narrative}
        </p>
        <ul className="theater-metrics">
          {(script.acts[0] as any).metrics.map((m: any, i: number) => (
            <li
              key={i}
              className="theater-metric"
              data-tone={m.tone ?? "neutral"}
            >
              <span className="theater-metric-label">{m.label}</span>
              <span className="theater-metric-value">{m.value}</span>
            </li>
          ))}
        </ul>
      </Act>
      {/* ── ACT II — HISTORY ──────────────────────────────────────── */}
      <Act
        index={1}
        romanNumeral={ROMAN[1]}
        eyebrow={ar ? "ذاكرة" : "Memory"}
        title={ar ? "ما حدث من قبل" : "What's happened before"}
        subtitle={
          ar
            ? "ثلاث قصص من الماضي تُشبه ما نواجهه الآن — مع الدرس المُستخلص من كلٍّ منها."
            : "Three stories from the archive that match the situation — with the lesson each one wrote."
        }
      >
        {(script.acts[1] as any).memories.length === 0 ? (
          <p className="theater-empty">
            {ar
              ? "لا أصداء من الماضي بعد. زرع البحيرة من /brain/memory."
              : "No echoes in the archive yet. Seed the lake from /brain/memory."}
          </p>
        ) : (
          <div className="theater-memory-stack">
            {(script.acts[1] as any).memories.map((m: any, i: number) => (
              <article
                key={m.id}
                className="theater-memory"
                style={{ animationDelay: `${i * 220}ms` }}
              >
                <header className="theater-memory-head">
                  <time className="theater-memory-date">
                    {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(m.occurredAt).toUpperCase()}
                  </time>
                  <span className="theater-memory-module">{m.module}</span>
                  <span className="theater-memory-sim">
                    {(m.similarity * 100).toFixed(0)}% {ar ? "تطابق" : "match"}
                  </span>
                </header>
                <h3 className="theater-memory-headline">
                  {ar ? m.headline.ar : m.headline.en}
                </h3>
                <p className="theater-memory-body">
                  {ar ? m.body.ar : m.body.en}
                </p>
                {(ar ? m.lesson?.ar : m.lesson?.en) ? (
                  <p className="theater-memory-lesson">
                    <span className="theater-memory-lesson-tag">
                      {ar ? "الدرس" : "Lesson"}
                    </span>
                    <em>"{ar ? m.lesson.ar : m.lesson.en}"</em>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Act>
      {/* ── ACT III — SIMULATION ──────────────────────────────────── */}
      <Act
        index={2}
        romanNumeral={ROMAN[2]}
        eyebrow={ar ? "محاكاة" : "Simulation"}
        title={ar ? "ماذا لو…" : "What if…"}
        subtitle={
          ar
            ? `إذا تحرّك "${(script.acts[2] as any).perturbation.label}" بنسبة ${(script.acts[2] as any).perturbation.pct.toFixed(0)}٪، فهذه أكبر التموجات في الرسم السببي.`
            : `If "${(script.acts[2] as any).perturbation.label}" moved by ${(script.acts[2] as any).perturbation.pct.toFixed(0)}%, these are the largest ripples across the causal graph.`
        }
      >
        {(script.acts[2] as any).rows.length === 0 ? (
          <p className="theater-empty">
            {ar
              ? "ابنِ الرسم السببي أولاً من /brain/graph."
              : "Build the causal graph first at /brain/graph."}
          </p>
        ) : (
          <ol className="theater-impact">
            {(script.acts[2] as any).rows.map((r: any, i: number) => {
              const negative = r.deltaPct < 0;
              return (
                <li
                  key={i}
                  className="theater-impact-row"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <span className="theater-impact-rank">{String(i + 1).padStart(2, "0")}</span>
                  <div className="theater-impact-body">
                    <div className="theater-impact-label">{r.label}</div>
                    <div className="theater-impact-meta">
                      {r.kind} · {ar ? "هوب" : "hops"} {r.hops}
                    </div>
                  </div>
                  <div
                    className="theater-impact-delta"
                    data-tone={negative ? "neg" : "pos"}
                  >
                    {r.deltaPct >= 0 ? "+" : ""}
                    {r.deltaPct.toFixed(1)}%
                  </div>
                  <span
                    className="theater-impact-bar"
                    style={{
                      width: `${Math.min(60, Math.abs(r.deltaPct) * 2)}%`,
                    }}
                    data-tone={negative ? "neg" : "pos"}
                  />
                </li>
              );
            })}
          </ol>
        )}
        <p className="theater-impact-caveat">
          {ar
            ? `أثر ينتشر إلى ${(script.acts[2] as any).totalAffected} كياناً مرتبطاً.`
            : `Effect propagates to ${(script.acts[2] as any).totalAffected} connected entities.`}
        </p>
      </Act>
      {/* ── ACT IV — COUNCIL ──────────────────────────────────────── */}
      <Act
        index={3}
        romanNumeral={ROMAN[3]}
        eyebrow={ar ? "مجلس" : "Council"}
        title={ar ? "ما قاله المجلس" : "What the council said"}
        subtitle={
          ar
            ? "خمسة أصوات. خمس زوايا. كل صوت اختار جملته الأكثر صراحة."
            : "Five voices. Five angles. Each chose their sharpest sentence."
        }
      >
        <div className="theater-council">
          {(script.acts[3] as any).voices.map((v: any, i: number) => {
            const accent = ACCENT_PER_AGENT[v.agentId] ?? "#7d5a3a";
            // Pull-quote = first sentence of thesis (most striking).
            const sentences = (v.thesis ?? "").split(/(?<=[.!?])\s+/);
            const quote = sentences[0] ?? v.thesis ?? "";
            return (
              <Pullquote
                key={i}
                quote={quote}
                attribution={ar ? v.speakerLabel.ar : v.speakerLabel.en}
                accent={accent}
                delay={i * 280}
              />
            );
          })}
        </div>
      </Act>
      {/* ── ACT V — RECOMMENDATION ────────────────────────────────── */}
      <Act
        index={4}
        romanNumeral={ROMAN[4]}
        eyebrow={ar ? "توصية" : "Verdict"}
        title={ar ? "ما الذي نفعله الآن" : "What we do now"}
      >
        <div className="theater-verdict">
          <p className="theater-verdict-prose">
            {(script.acts[4] as any).moderator.recommendation}
          </p>
          <div className="theater-verdict-confidence">
            <span className="theater-verdict-confidence-label">
              {ar ? "الثقة" : "Confidence"}
            </span>
            <span className="theater-verdict-confidence-value">
              {((script.acts[4] as any).moderator.confidence * 100).toFixed(0)}
              <span className="theater-verdict-confidence-unit">/100</span>
            </span>
          </div>
          {(script.acts[4] as any).moderator.dissentNote ? (
            <aside className="theater-verdict-dissent">
              <span className="theater-verdict-dissent-tag">
                {ar ? "مُعارضة مسجّلة" : "Recorded dissent"}
              </span>
              <em>"{(script.acts[4] as any).moderator.dissentNote}"</em>
            </aside>
          ) : null}
        </div>

        {(script.acts[4] as any).plan ? (
          <div className="theater-plan">
            <header className="theater-plan-head">
              <span className="theater-plan-eyebrow">
                {ar ? "الخطة" : "The plan"}
              </span>
              <Link
                href={`/plans/${(script.acts[4] as any).plan.id}`}
                className="theater-plan-link"
              >
                {ar ? "افتح الخطة الكاملة" : "Open full plan"}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </header>
            <h3 className="theater-plan-goal">
              {(script.acts[4] as any).plan.goal}
            </h3>
            <ol className="theater-plan-steps">
              {(script.acts[4] as any).plan.steps.slice(0, 3).map((s: any) => (
                <li key={s.orderIndex} className="theater-plan-step">
                  <span className="theater-plan-step-num">
                    {String(s.orderIndex + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="theater-plan-step-action">{s.action}</div>
                    <div className="theater-plan-step-meta">
                      {s.ownerRole} · {s.durationDays} {ar ? "أيام" : "days"}
                    </div>
                  </div>
                </li>
              ))}
              {(script.acts[4] as any).plan.steps.length > 3 ? (
                <li className="theater-plan-step-more">
                  + {(script.acts[4] as any).plan.steps.length - 3}{" "}
                  {ar ? "خطوات أخرى" : "more steps"}
                </li>
              ) : null}
            </ol>
          </div>
        ) : (
          <div className="theater-plan-cta">
            <p>
              {ar
                ? "لم تُولَّد خطة بعد لهذه الجلسة. عُد إلى صفحة المجلس واضغط «توليد خطة»."
                : "No plan yet. Return to the council session and press \"Generate plan\"."}
            </p>
            <Link
              href={`/brain/council/${script.sessionId}`}
              className="theater-plan-cta-link"
            >
              <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "إلى المجلس" : "Back to council"}
            </Link>
          </div>
        )}

        {/* End-of-spread sign-off */}
        <div className="theater-signoff" aria-hidden>
          <span className="theater-signoff-rule" />
          <span className="theater-signoff-mark">⁂</span>
          <span className="theater-signoff-rule" />
        </div>
      </Act>
    </TheaterShell>
  );
}
