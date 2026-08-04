// lib/voac/present.ts — how the VOAC ledger reads to a human.
//
// Pure on purpose. Status tones, bilingual labels and confidence wording are
// exactly the kind of logic that rots when it lives inside JSX: nobody tests it,
// and a wrong tone is not a crash — it is a manager reading "succeeded" on a run
// that produced nothing.
//
// The tone mapping carries a real editorial stance: a REFUSED run is NOT a
// failure. The system declining to act — over a hop ceiling, an autonomous
// topology with no opt-in, a missing companyId — is the safety boundary doing
// its job, and painting it red teaches operators to treat correct refusals as
// incidents.

import type { RunStatus } from "./runStore";

export type Tone = "ok" | "warn" | "crit" | "info" | "muted";

export type Labelled = { ar: string; en: string; tone: Tone };

const RUN_STATUS: Record<RunStatus, Labelled> = {
  RUNNING: { ar: "قيد التشغيل", en: "Running", tone: "info" },
  SUCCEEDED: { ar: "اكتمل", en: "Succeeded", tone: "ok" },
  // A genuine fault: something threw or a step errored.
  FAILED: { ar: "فشل", en: "Failed", tone: "crit" },
  // Not a fault — the tenant's cap did its job. Warn, so it is visible, but
  // never crit.
  BUDGET_EXHAUSTED: { ar: "تجاوز حد الميزانية", en: "Budget exhausted", tone: "warn" },
  // The safety boundary working. Neutral, deliberately.
  REFUSED: { ar: "رُفض قبل التنفيذ", en: "Refused before running", tone: "muted" },
  // No model configured. Not a defect, not a result.
  STUB: { ar: "وضع تجريبي — بلا نموذج", en: "Stub — no model", tone: "muted" },
};

export function runStatusLabel(status: string): Labelled {
  return RUN_STATUS[status as RunStatus] ?? { ar: status, en: status, tone: "muted" };
}

const PROPOSAL_STATUS: Record<string, Labelled> = {
  PENDING: { ar: "بانتظار القرار", en: "Awaiting decision", tone: "warn" },
  ACCEPTED: { ar: "مقبول", en: "Accepted", tone: "ok" },
  REJECTED: { ar: "مرفوض", en: "Rejected", tone: "muted" },
  EXPIRED: { ar: "انتهت صلاحيته", en: "Expired", tone: "muted" },
};

export function proposalStatusLabel(status: string): Labelled {
  return PROPOSAL_STATUS[status] ?? { ar: status, en: status, tone: "muted" };
}

const STEP_KIND: Record<string, { ar: string; en: string }> = {
  plan: { ar: "تخطيط", en: "Plan" },
  tool: { ar: "أداة", en: "Tool" },
  debate: { ar: "مداولة", en: "Debate" },
  verify: { ar: "تحقّق", en: "Verify" },
  narrate: { ar: "صياغة", en: "Narrate" },
};

export function stepKindLabel(kind: string): { ar: string; en: string } {
  return STEP_KIND[kind] ?? { ar: kind, en: kind };
}

/**
 * How a score should be READ, given who produced it.
 *
 * A self-assessed score is not evidence. Surfacing it with the same weight as a
 * human score is how a circular reward loop gets built by accident — so the
 * label always names the source.
 */
export function scoreLabel(
  score: number | null | undefined,
  scoredBy: string | null | undefined,
): { text: { ar: string; en: string }; tone: Tone; trustworthy: boolean } {
  if (score === null || score === undefined) {
    return { text: { ar: "غير مُقيَّم", en: "Unscored" }, tone: "muted", trustworthy: false };
  }
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  if (scoredBy === "human") {
    return { text: { ar: `${pct}٪ — تقييم بشري`, en: `${pct}% — human` }, tone: pct >= 60 ? "ok" : "warn", trustworthy: true };
  }
  if (scoredBy === "rubric") {
    return { text: { ar: `${pct}٪ — معيار`, en: `${pct}% — rubric` }, tone: "info", trustworthy: true };
  }
  return {
    text: { ar: `${pct}٪ — تقييم ذاتي`, en: `${pct}% — self-assessed` },
    tone: "muted",
    trustworthy: false,
  };
}

/**
 * Confidence, worded so nobody reads 0.55 as a promise.
 *
 * Deliberately coarse: three bands, not a decimal. A model's stated confidence
 * is not calibrated, and rendering "0.62" implies a precision that does not
 * exist.
 */
export function confidenceBand(confidence: number | null | undefined): Labelled {
  // An unstated confidence must NOT fall back to a middle band. Rendering
  // "medium confidence" for a proposal whose agent never claimed one puts a
  // fabricated signal in front of someone making a decision — and it is
  // indistinguishable from a genuine 0.5.
  if (confidence === null || confidence === undefined || Number.isNaN(confidence)) {
    return { ar: "ثقة غير مذكورة", en: "Confidence not stated", tone: "muted" };
  }
  const c = Math.min(1, Math.max(0, confidence));
  if (c >= 0.7) return { ar: "ثقة عالية", en: "High confidence", tone: "ok" };
  if (c >= 0.4) return { ar: "ثقة متوسطة", en: "Medium confidence", tone: "warn" };
  return { ar: "ثقة منخفضة", en: "Low confidence", tone: "muted" };
}

/** Money, or an explicit "not quantified" — never a silent zero. */
export function valueLabel(v: number | null | undefined, locale: "ar" | "en"): string {
  if (v === null || v === undefined) return locale === "ar" ? "غير مُقدَّر" : "Not quantified";
  return `${Math.round(v).toLocaleString(locale === "ar" ? "ar-JO" : "en-US")} ${locale === "ar" ? "د.أ" : "JOD"}`;
}

/**
 * Did a proposal beat its own estimate?
 *
 * Returns null while the outcome is still unknown, so the UI can say "awaiting
 * outcome" instead of implying a result. This is the only non-circular signal
 * the system has; overstating it would poison the one honest metric.
 */
export function realizedDelta(
  estimated: number | null | undefined,
  realized: number | null | undefined,
): { pct: number; tone: Tone } | null {
  if (realized === null || realized === undefined) return null;
  if (estimated === null || estimated === undefined || estimated === 0) return null;
  const pct = Math.round(((realized - estimated) / Math.abs(estimated)) * 100);
  return { pct, tone: pct >= 0 ? "ok" : pct >= -25 ? "warn" : "crit" };
}
