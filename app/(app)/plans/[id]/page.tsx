// /plans/[id] — single plan detail with Gantt-style step visualization.
//
// Layout:
//   1. PageHeader (Heritage)
//   2. Hero plinth: goal as display headline + rationale measure paragraph
//   3. Target panel: target metric + delta + deadline + projected impact
//      from simulator (when available)
//   4. PlanGantt: vertical step stack with status accents and actions
//   5. Rollback condition card (if specified)
//   6. Footer rail: Commit / Abandon / Delete buttons + source link
//
// Phase 5 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Target, Sparkles, MessagesSquare, Calendar,
  CheckCircle2, AlertTriangle, ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { PlanGantt } from "@/components/plans/PlanGantt";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { commit, abandon, deletePlan } from "../actions";

const METRIC_LABEL: Record<string, { ar: string; en: string }> = {
  revenue:      { ar: "الإيراد", en: "Revenue" },
  margin:       { ar: "الهامش", en: "Margin" },
  occupancy:    { ar: "الإشغال", en: "Occupancy" },
  yield:        { ar: "الإنتاج", en: "Yield" },
  expiry_risk:  { ar: "مخاطر الانتهاء", en: "Expiry risk" },
  demand:       { ar: "الطلب", en: "Demand" },
  inventory:    { ar: "المخزون", en: "Inventory" },
};

const STATUS_TONE: Record<string, "success" | "warn" | "critical" | "info" | "neutral"> = {
  ACTIVE: "info",
  DRAFT: "warn",
  DONE: "success",
  ABANDONED: "neutral",
  ROLLED_BACK: "critical",
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT:       { ar: "مسوّدة", en: "Draft" },
  ACTIVE:      { ar: "قيد التنفيذ", en: "Active" },
  DONE:        { ar: "مكتمل", en: "Done" },
  ABANDONED:   { ar: "مُلغى", en: "Abandoned" },
  ROLLED_BACK: { ar: "تراجع", en: "Rolled back" },
};

export default async function PlanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!plan) notFound();

  const planActive = plan.status === "ACTIVE";
  const isDraft = plan.status === "DRAFT";
  const stepsTotal = plan.steps.length;
  const stepsDone = plan.steps.filter((s) => s.status === "DONE").length;
  const progress = stepsTotal > 0 ? stepsDone / stepsTotal : 0;
  const m = METRIC_LABEL[plan.targetMetric] ?? { ar: plan.targetMetric, en: plan.targetMetric };

  const sourceCouncilSession = plan.sourceCouncilSessionId
    ? await prisma.councilSession.findUnique({ where: { id: plan.sourceCouncilSessionId } })
    : null;
  const sourceInsight = plan.sourceInsightId
    ? await prisma.aIInsight.findUnique({ where: { id: plan.sourceInsightId } })
    : null;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · خطة" : "Brain · Plan"}
        title={plan.goal.length > 90 ? plan.goal.slice(0, 88) + "…" : plan.goal}
        subtitle={
          ar
            ? `أُنشئت بتاريخ ${formatDate(plan.createdAt, "ar")}`
            : `Created ${formatDate(plan.createdAt, "en")}`
        }
      />

      <PageContainer>
        {/* Top rail: back link + delete */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/plans"
            className="heri-focusable inline-flex items-center gap-2"
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--heri-copper)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
            {ar ? "العودة إلى الخطط" : "All plans"}
          </Link>
          <div className="flex items-center gap-2">
            <HeritagePill tone={STATUS_TONE[plan.status] ?? "neutral"}>
              {ar ? STATUS_LABEL[plan.status]?.ar : STATUS_LABEL[plan.status]?.en}
            </HeritagePill>
            <form action={deletePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <button
                type="submit"
                className="heri-btn heri-btn-ghost"
                style={{ padding: "6px 12px", fontSize: 11 }}
              >
                {ar ? "حذف" : "Delete"}
              </button>
            </form>
          </div>
        </div>

        {/* Hero plinth: goal + rationale */}
        <section className="heri-hero">
          <div className="px-6 py-7 md:px-9 md:py-9">
            <div className="heri-eyebrow">
              {ar ? "الهدف" : "Goal"}
            </div>
            <h2
              className={ar ? "mt-3" : "font-display-latin mt-3"}
              style={{
                fontSize: "clamp(24px, 2.8vw, 38px)",
                lineHeight: 1.15,
                letterSpacing: ar ? "-0.005em" : "-0.018em",
                fontWeight: ar ? 600 : 500,
                color: "var(--heri-ink)",
                textWrap: "balance" as any,
                maxWidth: "26em",
              }}
            >
              {plan.goal}
            </h2>
            {plan.rationale ? (
              <p
                className="measure mt-4"
                style={{
                  fontSize: "clamp(13.5px, 1vw, 15px)",
                  lineHeight: 1.6,
                  color: "var(--heri-ink-2)",
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                }}
              >
                {plan.rationale}
              </p>
            ) : null}
            {/* Source */}
            {sourceCouncilSession ? (
              <div className="mt-5">
                <Link
                  href={`/brain/council/${sourceCouncilSession.id}`}
                  className="heri-eyebrow inline-flex items-center gap-2 transition"
                  style={{ color: "var(--heri-copper)", textDecoration: "none" }}
                >
                  <MessagesSquare className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "من جلسة المجلس →" : "Source: council session →"}
                </Link>
              </div>
            ) : null}
            {sourceInsight ? (
              <div className="mt-5">
                <Link
                  href={`/insights`}
                  className="heri-eyebrow inline-flex items-center gap-2 transition"
                  style={{ color: "var(--heri-copper)", textDecoration: "none" }}
                >
                  <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "من إشارة:" : "Source: insight —"} {sourceInsight.title}
                </Link>
              </div>
            ) : null}
          </div>

          {/* Target row */}
          <div
            className="grid grid-cols-2 md:grid-cols-3"
            style={{ borderTop: "1px solid var(--heri-rule-strong)" }}
          >
            <TargetTile
              eyebrow={ar ? "المؤشر" : "Metric"}
              icon={<Target className="h-3 w-3" strokeWidth={1.5} />}
              value={ar ? m.ar : m.en}
              isText
            />
            <TargetTile
              eyebrow={ar ? "التغيّر المُستهدف" : "Target delta"}
              icon={null}
              value={`${plan.targetDelta >= 0 ? "+" : ""}${(plan.targetDelta * 100).toFixed(0)}%`}
              accent={
                plan.targetDelta >= 0
                  ? "var(--heri-teal)"
                  : "var(--heri-terracotta)"
              }
              divider
            />
            <TargetTile
              eyebrow={ar ? "الموعد النهائي" : "Deadline"}
              icon={<Calendar className="h-3 w-3" strokeWidth={1.5} />}
              value={formatDate(plan.targetDeadline, ar ? "ar" : "en")}
              divider
              isText
            />
          </div>

          {/* Progress bar (only if any steps exist) */}
          {stepsTotal > 0 ? (
            <div
              className="px-6 py-5 md:px-9 grid grid-cols-[auto_1fr_auto] gap-4 items-center"
              style={{ borderTop: "1px solid var(--heri-rule)" }}
            >
              <span className="heri-eyebrow heri-eyebrow-ink">
                {ar ? "التقدّم" : "Progress"}
              </span>
              <div
                className="h-px relative"
                style={{ background: "var(--heri-rule)" }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    insetInlineStart: 0,
                    top: -1,
                    height: 3,
                    width: `${Math.round(progress * 100)}%`,
                    background: "var(--heri-ochre)",
                    transition: "width 480ms cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
              <span
                className="heri-number-mono"
                style={{
                  fontSize: 13,
                  color: "var(--heri-ink)",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stepsDone}/{stepsTotal}
              </span>
            </div>
          ) : null}
        </section>

        {/* Step Gantt */}
        <section>
          <div className="mb-3 heri-eyebrow inline-flex items-center gap-2">
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 18,
                height: 1.5,
                background: "var(--heri-ochre)",
              }}
            />
            {ar ? "الخطوات" : "Steps"}
          </div>
          <PlanGantt
            steps={plan.steps as any}
            planId={plan.id}
            planActive={planActive}
            ar={ar}
          />
        </section>

        {/* Rollback card */}
        {plan.rollbackCondition ? (
          <section
            style={{
              background: "var(--heri-cream)",
              border: "1px solid var(--heri-rule)",
              borderInlineStart: "2px solid var(--heri-terracotta)",
              padding: "14px 18px",
            }}
          >
            <div
              className="heri-eyebrow inline-flex items-center gap-2"
              style={{ color: "var(--heri-terracotta)" }}
            >
              <ShieldAlert className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "شرط التراجع" : "Rollback condition"}
            </div>
            <p
              className="mt-2"
              style={{
                fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                fontSize: 14,
                fontStyle: "italic",
                lineHeight: 1.55,
                color: "var(--heri-ink-2)",
                maxWidth: "65ch",
              }}
            >
              "{plan.rollbackCondition}"
            </p>
          </section>
        ) : null}

        {/* Commit footer */}
        {isDraft ? (
          <section
            className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center"
            style={{
              background: "var(--heri-cream-2)",
              border: "1px solid var(--heri-rule-strong)",
              padding: "16px 20px",
            }}
          >
            <div>
              <div className="heri-eyebrow heri-eyebrow-ink">
                {ar ? "حالة الخطة" : "Plan status"}
              </div>
              <p
                className="mt-1"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: 13.5,
                  color: "var(--heri-ink-2)",
                  lineHeight: 1.5,
                }}
              >
                {ar
                  ? "هذه الخطة في حالة مسوّدة. اضغط «إصدار» لجعلها نشطة وبدء متابعة المؤشر المُستهدف."
                  : "This plan is in draft. Press 'Commit' to set it active and start tracking the target metric."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={abandon}>
                <input type="hidden" name="id" value={plan.id} />
                <button type="submit" className="heri-btn heri-btn-ghost">
                  {ar ? "إلغاء الخطة" : "Abandon"}
                </button>
              </form>
              <form action={commit}>
                <input type="hidden" name="id" value={plan.id} />
                <button type="submit" className="heri-btn heri-btn-primary">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "إصدار الخطة" : "Commit plan"}
                </button>
              </form>
            </div>
          </section>
        ) : planActive ? (
          <section
            className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center"
            style={{
              background: "var(--heri-cream-2)",
              border: "1px solid var(--heri-rule)",
              padding: "12px 20px",
            }}
          >
            <div className="heri-eyebrow heri-eyebrow-ink inline-flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
              {ar
                ? "الخطة نشطة — أكمل الخطوات أعلاه."
                : "Plan is active — complete the steps above."}
            </div>
            <form action={abandon}>
              <input type="hidden" name="id" value={plan.id} />
              <button type="submit" className="heri-btn heri-btn-ghost">
                {ar ? "إلغاء الخطة" : "Abandon"}
              </button>
            </form>
          </section>
        ) : null}
      </PageContainer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────

function TargetTile({
  eyebrow,
  icon,
  value,
  divider = false,
  accent,
  isText = false,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  value: string;
  divider?: boolean;
  accent?: string;
  isText?: boolean;
}) {
  return (
    <div
      className="px-6 py-5 md:px-8 md:py-6"
      style={{
        borderInlineStart: divider ? "1px solid var(--heri-rule)" : undefined,
      }}
    >
      <div className="heri-eyebrow inline-flex items-center gap-2">
        {icon}
        {eyebrow}
      </div>
      <div
        className={isText ? "" : "heri-number"}
        style={{
          fontSize: isText ? 18 : "clamp(22px, 2.4vw, 30px)",
          lineHeight: 1.1,
          letterSpacing: "-0.012em",
          fontWeight: isText ? 500 : 500,
          color: accent ?? "var(--heri-ink)",
          marginTop: 8,
          fontFamily: isText
            ? "'Fraunces','Tiempos Headline',Georgia,serif"
            : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(d: Date, locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
