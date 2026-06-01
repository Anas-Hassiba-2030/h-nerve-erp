// /brain/iq — Brain IQ — the capstone screen.
//
// Aesthetic: Heritage Modern with the giant 120-180px Fraunces IQ number
// (the only screen in H-Nerve allowed to use a number that big — see
// docs/PHASES-INTELLIGENCE.md Phase 10).
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import "../../daylight.css";
import { IQTrend } from "@/components/brain/IQTrend";
import { SmoothNumber } from "@/components/brain/SmoothNumber";
import { prisma } from "@/lib/db";
import { computeIQ } from "@/lib/brain/meta.reflector";
import { getLocale } from "@/lib/i18n.server";
import { Cpu, Database, Trash2, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { reflectNow, seedHistory, clearMetaHistory } from "./actions";
import { ConfirmResetForm } from "./ConfirmResetForm";

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
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · الذكاء" : "Brain · IQ"}
        title={ar ? "الذكاء الجمعي للنظام" : "The brain's intelligence"}
        subtitle={
          ar
            ? "رقم واحد يلخّص أداء الدماغ. يصعد عندما تتحسّن، ينزل عندما تتراجع. كل تعديل ذاتي يُسجَّل."
            : "One number that summarizes how the brain is performing. It rises when accuracy and outcome rise; falls when they degrade. Every self-tuning step is on record."
        }
      />

      {history.length === 0 ? (
        <EmptyState ar={ar} />
      ) : (
        <>
          {/* ── THE GIANT IQ NUMBER ─────────────────────────────────── */}
          <section
            className="brain-iq-hero panel reveal"
            style={{
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
                    "linear-gradient(90deg, var(--brick) 0%, var(--gold) 50%, var(--emerald) 100%)",
                }}
              />

              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div className="text-center md:text-start">
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--gold)" }}>
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        width: 18,
                        height: 1.5,
                        background: "var(--gold)",
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
                      color: "var(--ink)",
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
                        background: "var(--gold)",
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
                      color: "var(--ink-muted)",
                    }}
                  >
                    <TrendIcon trend={trend} />
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {trend === "rising" ? "+" : trend === "falling" ? "" : "±"}
                      {Math.abs(delta)} {ar ? "هذا الأسبوع" : "this week"}
                    </span>
                    {headlineScore === allTimeHigh && history.length > 1 ? (
                      <>
                        <span style={{ color: "var(--line)" }}>·</span>
                        <span style={{ color: "var(--gold)" }}>
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
          <DaylightPanel
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
          </DaylightPanel>

          {/* ── ACTIONS RAIL ───────────────────────────────────────── */}
          <div
            className="flex flex-wrap items-center gap-2 px-1 py-3"
            style={{
              borderTop: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{ar ? "التأمّل" : "Reflection"}</span>
            <form action={reflectNow}>
              <button type="submit" className="dl-btn dl-btn-primary">
                <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "تأمّل الآن" : "Reflect now"}
              </button>
            </form>
            <Link
              href="/brain/self-tuning"
              className="dl-btn dl-btn-secondary"
              style={{ padding: "8px 14px", fontSize: 12 }}
            >
              {ar ? "كل التقارير" : "All reports"}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
            {drafts > 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
                {drafts} {ar ? "قيد المراجعة" : "pending review"}
              </span>
            ) : null}
            {applied > 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
                {applied} {ar ? "مُطبَّقة" : "applied"}
              </span>
            ) : null}
            <div className="grow" />
            <ConfirmResetForm ar={ar} />
          </div>
        </>
      )}
    </DaylightShell>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ComponentTile({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div
      style={{
        background: "var(--ivory)",
        border: "1px solid var(--line)",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "var(--ink)",
          marginTop: 8,
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
            color: "var(--ink-muted)",
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
        style={{ background: "var(--line)", position: "relative" }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            insetInlineStart: 0,
            top: -1,
            height: 2,
            width: `${pct}%`,
            background: "var(--gold)",
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
        style={{ color: "var(--emerald)" }}
      />
    );
  if (trend === "falling")
    return (
      <TrendingDown
        className="h-4 w-4"
        strokeWidth={1.5}
        style={{ color: "var(--brick)" }}
      />
    );
  return (
    <Minus
      className="h-4 w-4"
      strokeWidth={1.5}
      style={{ color: "var(--ink-muted)" }}
    />
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
        <Cpu className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        className={ar ? "mt-5" : "font-display-latin mt-5"}
        style={{
          fontSize: "clamp(28px, 3.4vw, 46px)",
          lineHeight: 1.05,
          letterSpacing: ar ? "-0.005em" : "-0.022em",
          fontWeight: ar ? 600 : 500,
          color: "var(--ink)",
        }}
      >
        {ar ? "لا مسار بعد." : "No trajectory yet."}
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
          ? "ازرع 8 أسابيع من المسار التجريبي لرؤية الدماغ يصعد، أو شغّل تأمّلاً جديداً ليبدأ القياس من الآن."
          : "Seed 8 weeks of demo trajectory to watch the brain climb, or trigger a reflection to start measuring from now."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <form action={seedHistory}>
          <button type="submit" className="dl-btn dl-btn-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع 8 أسابيع" : "Seed 8 weeks"}
          </button>
        </form>
        <form action={reflectNow}>
          <button type="submit" className="dl-btn dl-btn-secondary">
            <Cpu className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "تأمّل الآن" : "Reflect now"}
          </button>
        </form>
      </div>
    </section>
  );
}
