// /brain/iq — Brain IQ — the capstone screen.
//
// Aesthetic: Heritage Modern with the giant 120-180px Fraunces IQ number
// (the only screen in H-Nerve allowed to use a number that big — see
// docs/PHASES-INTELLIGENCE.md Phase 10).
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { IQTrend } from "@/components/brain/IQTrend";
import { SmoothNumber } from "@/components/brain/SmoothNumber";
import { prisma } from "@/lib/db";
import { computeIQ } from "@/lib/brain/meta.reflector";
import { getLocale } from "@/lib/i18n.server";
import { Cpu, Database, Trash2, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { reflectNow, seedHistory, clearMetaHistory } from "./actions";

export default async function BrainIQPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const [iq, history, drafts, applied] = await Promise.all([
    computeIQ("default"),
    prisma.brainIQHistory.findMany({
      where: { scope: "default" },
      orderBy: { snappedAt: "asc" },
      take: 60,
    }),
    prisma.selfTuningReport.count({ where: { scope: "default", status: "DRAFT" } }),
    prisma.selfTuningReport.count({ where: { scope: "default", status: "APPROVED" } }),
  ]);

  // Use the seeded trajectory if it exists; otherwise show the live computation.
  const liveScore = iq.score;
  const headlineScore = history.length > 0 ? history[history.length - 1].iq : liveScore;
  const allTimeHigh = history.length > 0 ? Math.max(...history.map((h) => h.iq), liveScore) : liveScore;
  const previous = history.length >= 2 ? history[history.length - 2].iq : null;
  const delta = previous != null ? headlineScore - previous : 0;
  const trend: "rising" | "falling" | "flat" =
    delta > 0 ? "rising" : delta < 0 ? "falling" : "flat";

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · الذكاء" : "Brain · IQ"}
        title={ar ? "الذكاء الجمعي للنظام" : "The brain's intelligence"}
        subtitle={
          ar
            ? "رقم واحد يلخّص أداء الدماغ. يصعد عندما تتحسّن، ينزل عندما تتراجع. كل تعديل ذاتي يُسجَّل."
            : "One number that summarizes how the brain is performing. It rises when accuracy and outcome rise; falls when they degrade. Every self-tuning step is on record."
        }
      />

      <PageContainer>
        {history.length === 0 ? (
          <EmptyState ar={ar} />
        ) : (
          <>
            {/* ── THE GIANT IQ NUMBER ─────────────────────────────────── */}
            <section
              className="brain-iq-hero"
              style={{
                background: "var(--heri-cream)",
                border: "1px solid var(--heri-rule-strong)",
                padding: "48px clamp(24px, 5vw, 64px) 40px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  insetInline: 0,
                  height: 2,
                  background:
                    "linear-gradient(90deg, var(--heri-terracotta) 0%, var(--heri-ochre) 50%, var(--heri-teal) 100%)",
                }}
              />

              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div className="text-center md:text-start">
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
                    {ar ? "معدّل ذكاء الدماغ" : "BRAIN IQ"}
                  </div>
                  {/* The only 120-180px number in the entire app */}
                  <div
                    className="font-display-latin"
                    style={{
                      fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                      fontSize: "clamp(96px, 14vw, 180px)",
                      lineHeight: 0.92,
                      letterSpacing: "-0.045em",
                      fontWeight: 500,
                      color: "var(--heri-ink)",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 18,
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    <SmoothNumber
                      value={headlineScore}
                      format="integer"
                      durationMs={1400}
                      flash={false}
                    />
                    <span
                      aria-hidden
                      className="brain-iq-rule"
                      style={{
                        display: "block",
                        height: 2,
                        background: "var(--heri-ochre)",
                        marginTop: 12,
                        animation: "iq-rule-draw 900ms cubic-bezier(0.16,1,0.3,1) 320ms both",
                      }}
                    />
                  </div>

                  <div
                    className="mt-5 inline-flex items-center gap-3"
                    style={{
                      fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--heri-ink-3)",
                    }}
                  >
                    <TrendIcon trend={trend} />
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {trend === "rising" ? "+" : trend === "falling" ? "" : "±"}
                      {Math.abs(delta)} {ar ? "هذا الأسبوع" : "this week"}
                    </span>
                    {headlineScore === allTimeHigh && history.length > 1 ? (
                      <>
                        <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                        <span style={{ color: "var(--heri-ochre-2)" }}>
                          {ar ? "أعلى مستوى" : "ALL-TIME HIGH"}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Component breakdown */}
                <div
                  className="grid grid-cols-2 gap-3"
                  style={{ minWidth: 280 }}
                >
                  <ComponentTile
                    label={ar ? "الدقّة" : "Accuracy"}
                    value={iq.components.accuracy}
                  />
                  <ComponentTile
                    label={ar ? "السرعة" : "Velocity"}
                    value={iq.components.decisionVelocity}
                  />
                  <ComponentTile
                    label={ar ? "النتائج" : "Outcome"}
                    value={iq.components.outcomeQuality}
                  />
                  <ComponentTile
                    label={ar ? "الثقة" : "Trust"}
                    value={iq.components.userTrust}
                  />
                </div>
              </div>
            </section>

            {/* ── THE TREND LINE ─────────────────────────────────────── */}
            <HeritageSection
              eyebrow={ar ? "المسار" : "Trajectory"}
              title={
                ar
                  ? `${history.length} نقطة بيانات أسبوعية`
                  : `${history.length} weekly data points`
              }
              aside={
                ar
                  ? "النقطة الأخيرة هي اللحظة الحاضرة. ابتدأنا من 102 ووصلنا إلى ما تراه."
                  : "The rightmost dot is the current moment. We started at 102 and climbed from there."
              }
            >
              <IQTrend history={history.map((h) => ({ snappedAt: h.snappedAt, iq: h.iq }))} />
            </HeritageSection>

            {/* ── ACTIONS RAIL ───────────────────────────────────────── */}
            <div
              className="flex flex-wrap items-center gap-2 px-1 py-3"
              style={{
                borderTop: "1px solid var(--heri-rule)",
                borderBottom: "1px solid var(--heri-rule)",
              }}
            >
              <span className="heri-eyebrow">{ar ? "التأمّل" : "Reflection"}</span>
              <form action={reflectNow}>
                <button type="submit" className="heri-btn heri-btn-primary">
                  <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {ar ? "تأمّل الآن" : "Reflect now"}
                </button>
              </form>
              <Link
                href="/brain/self-tuning"
                className="heri-btn heri-btn-secondary"
                style={{ padding: "8px 14px", fontSize: 12 }}
              >
                {ar ? "كل التقارير" : "All reports"}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
              {drafts > 0 ? (
                <HeritagePill tone="warn">
                  {drafts} {ar ? "قيد المراجعة" : "pending review"}
                </HeritagePill>
              ) : null}
              {applied > 0 ? (
                <HeritagePill tone="success">
                  {applied} {ar ? "مُطبَّقة" : "applied"}
                </HeritagePill>
              ) : null}
              <div className="grow" />
              <form action={clearMetaHistory}>
                <button
                  type="submit"
                  className="heri-btn heri-btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: 11,
                    color: "var(--heri-terracotta)",
                  }}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "مسح المسار" : "Reset trajectory"}
                </button>
              </form>
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ComponentTile({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div
      style={{
        background: "var(--heri-cream-2)",
        border: "1px solid var(--heri-rule)",
        padding: "12px 14px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className="heri-number mt-2"
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "var(--heri-ink)",
          letterSpacing: "-0.018em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pct}
        <span
          style={{
            fontSize: 12,
            fontFamily:
              "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            color: "var(--heri-ink-3)",
            marginInlineStart: 4,
            letterSpacing: "0.06em",
          }}
        >
          /100
        </span>
      </div>
      {/* Tiny progress hairline */}
      <div
        className="mt-3 h-px"
        style={{ background: "var(--heri-rule)", position: "relative" }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            insetInlineStart: 0,
            top: -1,
            height: 2,
            width: `${pct}%`,
            background: "var(--heri-ochre)",
            transition: "width 480ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "rising" | "falling" | "flat" }) {
  if (trend === "rising")
    return (
      <TrendingUp
        className="h-4 w-4"
        strokeWidth={1.5}
        style={{ color: "var(--heri-teal)" }}
      />
    );
  if (trend === "falling")
    return (
      <TrendingDown
        className="h-4 w-4"
        strokeWidth={1.5}
        style={{ color: "var(--heri-terracotta)" }}
      />
    );
  return (
    <Minus
      className="h-4 w-4"
      strokeWidth={1.5}
      style={{ color: "var(--heri-ink-3)" }}
    />
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
        <Cpu className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        className={ar ? "mt-5" : "font-display-latin mt-5"}
        style={{
          fontSize: "clamp(28px, 3.4vw, 46px)",
          lineHeight: 1.05,
          letterSpacing: ar ? "-0.005em" : "-0.022em",
          fontWeight: ar ? 600 : 500,
          color: "var(--heri-ink)",
        }}
      >
        {ar ? "لا مسار بعد." : "No trajectory yet."}
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
          ? "ازرع 8 أسابيع من المسار التجريبي لرؤية الدماغ يصعد، أو شغّل تأمّلاً جديداً ليبدأ القياس من الآن."
          : "Seed 8 weeks of demo trajectory to watch the brain climb, or trigger a reflection to start measuring from now."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <form action={seedHistory}>
          <button type="submit" className="heri-btn heri-btn-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع 8 أسابيع" : "Seed 8 weeks"}
          </button>
        </form>
        <form action={reflectNow}>
          <button type="submit" className="heri-btn heri-btn-secondary">
            <Cpu className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "تأمّل الآن" : "Reflect now"}
          </button>
        </form>
      </div>
    </section>
  );
}
