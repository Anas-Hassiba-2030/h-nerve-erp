// PlanGantt — the step visualization on the plan detail page.
//
// Vertical stack of step tiles. Each tile shows: order number eyebrow,
// action in Fraunces serif, owner role pill, duration, status pill, and
// an inline-start rail in the status's accent color. A "Mark done" form
// sits at the right edge of pending steps.
//
// Animation: heri-stagger fades them in left-to-right with 70ms cascade
// (matches the Phase 5 signature from PHASES-INTELLIGENCE.md).

import { CheckCircle2, AlertOctagon, Clock, Hourglass } from "lucide-react";
import { HeritagePill } from "@/components/heritage";
import { markStepBlocked, markStepDone } from "@/app/(app)/plans/actions";
import { pickLocale } from "@/lib/utils/utils";

const STATUS_ACCENT: Record<string, string> = {
  PENDING:     "var(--heri-rule-strong)",
  IN_PROGRESS: "var(--heri-copper)",
  DONE:        "var(--heri-teal)",
  BLOCKED:     "var(--heri-terracotta)",
};

const STATUS_TONE: Record<string, "success" | "warn" | "critical" | "info" | "neutral"> = {
  PENDING:     "neutral",
  IN_PROGRESS: "info",
  DONE:        "success",
  BLOCKED:     "critical",
};

const STATUS_ICON: Record<string, any> = {
  PENDING:     Hourglass,
  IN_PROGRESS: Clock,
  DONE:        CheckCircle2,
  BLOCKED:     AlertOctagon,
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  PENDING:     { ar: "بانتظار البدء", en: "Pending" },
  IN_PROGRESS: { ar: "قيد التنفيذ",   en: "In progress" },
  DONE:        { ar: "مكتمل",         en: "Done" },
  BLOCKED:     { ar: "مُعطّل",        en: "Blocked" },
};

type Step = {
  id: string;
  orderIndex: number;
  action: string;
  actionEn: string | null;
  ownerRole: string;
  durationDays: number;
  status: string;
  notes: string | null;
  completedAt: Date | null;
};

export function PlanGantt({
  steps,
  planId,
  planActive,
  ar,
}: {
  steps: Step[];
  planId: string;
  planActive: boolean;
  ar: boolean;
}) {
  if (steps.length === 0) {
    return (
      <div
        className="py-8 text-center"
        style={{ color: "var(--heri-ink-3)", fontStyle: "italic", fontSize: 13 }}
      >
        {ar ? "لا خطوات بعد." : "No steps yet."}
      </div>
    );
  }
  return (
    <ol className="space-y-3 heri-stagger">
      {steps.map((s) => (
        <StepTile
          key={s.id}
          step={s}
          planId={planId}
          planActive={planActive}
          ar={ar}
        />
      ))}
    </ol>
  );
}

function StepTile({
  step,
  planId,
  planActive,
  ar,
}: {
  step: Step;
  planId: string;
  planActive: boolean;
  ar: boolean;
}) {
  const accent = STATUS_ACCENT[step.status] ?? "var(--heri-rule-strong)";
  const tone = STATUS_TONE[step.status] ?? "neutral";
  const Icon = STATUS_ICON[step.status] ?? Hourglass;
  const canMarkDone = planActive && step.status !== "DONE";
  const canBlock = planActive && step.status === "PENDING";

  return (
    <li
      className="relative grid items-start gap-4"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "16px 18px",
        gridTemplateColumns: "auto 1fr auto",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{ insetInlineStart: 0, width: 3, background: accent }}
      />

      {/* Step number + icon */}
      <div className="ms-2 flex flex-col items-center gap-2 pt-0.5">
        <span
          className="heri-eyebrow heri-eyebrow-ink"
          style={{ fontSize: 12, letterSpacing: "0.18em" }}
        >
          {ar ? `خطوة ${pad2(step.orderIndex + 1)}` : `STEP ${pad2(step.orderIndex + 1)}`}
        </span>
        <Icon
          className="h-4 w-4"
          style={{ color: accent }}
          strokeWidth={1.5}
        />
      </div>

      {/* Body */}
      <div className="min-w-0">
        <p
          className={ar ? "" : "font-display-latin"}
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            letterSpacing: ar ? 0 : "-0.005em",
            color: "var(--heri-ink)",
            maxWidth: "62ch",
          }}
        >
          {pickLocale(ar, step.action, step.actionEn)}
        </p>
        <div
          className="mt-2.5 flex flex-wrap items-center gap-2"
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--heri-ink-3)",
          }}
        >
          <span
            style={{
              padding: "2px 8px",
              border: "1px solid var(--heri-rule-strong)",
              color: "var(--heri-ink-2)",
              background: "var(--heri-cream-2)",
            }}
          >
            {step.ownerRole}
          </span>
          <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
          <span>
            {step.durationDays} {ar ? "أيام" : "days"}
          </span>
          {step.completedAt ? (
            <>
              <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
              <span style={{ color: "var(--heri-teal)" }}>
                {ar ? "أُنجزت" : "completed"}{" "}
                {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                  day: "numeric",
                  month: "short",
                }).format(step.completedAt)}
              </span>
            </>
          ) : null}
        </div>
        {step.notes ? (
          <div
            className="mt-2 measure"
            style={{
              fontSize: 12,
              fontStyle: "italic",
              color: "var(--heri-ink-3)",
              lineHeight: 1.5,
              borderInlineStart: "2px solid var(--heri-rule-strong)",
              paddingInlineStart: 10,
            }}
          >
            {step.notes}
          </div>
        ) : null}
      </div>

      {/* Status + actions */}
      <div className="flex flex-col items-end gap-2">
        <HeritagePill tone={tone}>
          {ar ? STATUS_LABEL[step.status]?.ar : STATUS_LABEL[step.status]?.en}
        </HeritagePill>
        {canMarkDone ? (
          <form action={markStepDone}>
            <input type="hidden" name="stepId" value={step.id} />
            <input type="hidden" name="planId" value={planId} />
            <button
              type="submit"
              className="heri-btn heri-btn-ghost"
              style={{ padding: "6px 10px", fontSize: 12 }}
            >
              <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "أُنجزت" : "Mark done"}
            </button>
          </form>
        ) : null}
        {canBlock ? (
          <form action={markStepBlocked}>
            <input type="hidden" name="stepId" value={step.id} />
            <input type="hidden" name="planId" value={planId} />
            <button
              type="submit"
              className="heri-btn heri-btn-ghost"
              style={{ padding: "6px 10px", fontSize: 12 }}
              title={ar ? "تعليم كمُعطّلة" : "Mark blocked"}
            >
              <AlertOctagon className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "مُعطّل" : "Block"}
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
