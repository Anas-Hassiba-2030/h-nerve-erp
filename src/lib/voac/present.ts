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
  // A graph's substantive thinking pass. Distinct from "plan" on purpose: a
  // trace that labels the reasoning as planning reads as a run that planned
  // twice and never thought.
  reason: { ar: "استنتاج", en: "Reason" },
  debate: { ar: "مداولة", en: "Debate" },
  verify: { ar: "تحقّق", en: "Verify" },
  narrate: { ar: "صياغة", en: "Narrate" },
};

export function stepKindLabel(kind: string): { ar: string; en: string } {
  return STEP_KIND[kind] ?? { ar: kind, en: kind };
}

/**
 * Why this agent runs the shape it runs, in plain language.
 *
 * chooseTopology() already returns a `reason` and its own comment says a
 * manager should be able to disagree with the choice — but nothing rendered it,
 * so the shape arrived as an unexplained keyword. Lives here rather than in one
 * page so the map and the run card cannot give different explanations of the
 * same word.
 */
export function topologyWhy(topology: string, locale: "ar" | "en"): string {
  const ar = locale === "ar";
  switch (topology) {
    case "parallel":
      return ar
        ? "عمل عابر للشركات = أهداف متنافسة. المواقف تُطرح بالتوازي ثم تُرجَّح، بدل أن يقرّر صوت واحد بهدوء عن الطرفين."
        : "Cross-company work means competing objectives. Positions are argued in parallel and reconciled, rather than one voice quietly deciding for both.";
    case "chain":
      return ar
        ? "الاستنتاج يعتمد على ما قبله، فيمشي بالتسلسل — لكن سحب الوقائع لا يعتمد على شيء، فيجري كله دفعة واحدة."
        : "The reasoning depends on what came before it, so it runs in sequence — but the fact-gathering depends on nothing, so all of it fires at once.";
    case "route":
      return ar
        ? "سؤال واحد واضح: يُصنَّف أولاً، ثم تُجلب وقائعه معاً، ثم يُكتب الجواب. أرخص نمط قابل للتحكّم."
        : "One clear question: classify it, gather its facts together, write the answer. The cheapest controllable shape.";
    case "evaluate":
      return ar
        ? "المخرج قابل للتدقيق: تُكتب مسودة، ثم تُطابَق أرقامها بالوقائع المسحوبة — بلا نموذج ثانٍ — قبل صياغة الجواب."
        : "The output can be checked: a draft is written, then its figures are matched against the facts that were pulled — with no second model — before the answer is written.";
    case "orchestrate":
      return ar
        ? "المهام لا تُعرف إلا أثناء التشغيل، فلا يمكن رسم شكل مسبق — منسّق يقرّر، وعمّال ينفّذون."
        : "The subtasks are only knowable at runtime, so no shape can be drawn in advance — a planner decides them and workers execute.";
    case "autonomous":
      return ar
        ? "لا نقطة توقّف محدّدة مسبقاً، ولهذا يتطلّب موافقة بشرية صريحة قبل أن يعمل."
        : "No predetermined stopping point, which is why it may not run without explicit human opt-in.";
    default:
      return "";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Redrawing a finished run as the graph it actually executed
// ─────────────────────────────────────────────────────────────────────

/** The subset of an AgentStep row this needs. Keeps the core free of Prisma. */
export type TraceStep = {
  id: string;
  seq: number;
  kind: string;
  roleId: string;
  input: string;
  output: string | null;
  error: string | null;
  latencyMs: number | null;
  score?: number | null;
  scoredBy?: string | null;
};

export type TraceLane = {
  /** Stage id when the run was graphed; a synthetic id otherwise. */
  id: string;
  ar: string;
  en: string;
  steps: TraceStep[];
  /** True when more than one node ran at the same time in this lane. */
  parallel: boolean;
  /** Wall-clock of the slowest node — a parallel lane costs its slowest node. */
  latencyMs: number;
  failed: boolean;
};

/** The prefix flowGraph's executor stamps on every step: `2·gather — …`. */
const STAGE_PREFIX = /^(\d+)·([A-Za-z][\w-]*) — ([\s\S]*)$/;

const LANE_LABELS: Record<string, { ar: string; en: string }> = {
  classify: { ar: "تصنيف", en: "Classify" },
  plan: { ar: "خطة", en: "Plan" },
  gather: { ar: "جمع متوازٍ", en: "Gather in parallel" },
  reason: { ar: "استنتاج", en: "Reason" },
  draft: { ar: "مسودة", en: "Draft" },
  grade: { ar: "تدقيق الأرقام", en: "Check the numbers" },
  narrate: { ar: "صياغة", en: "Write the answer" },
  debate: { ar: "أصوات متوازية", en: "Voices in parallel" },
};

function laneLabel(id: string, fallbackKind: string): { ar: string; en: string } {
  return LANE_LABELS[id] ?? stepKindLabel(fallbackKind);
}

/**
 * Rebuild the lanes a run executed, from its recorded steps alone.
 *
 * WHY FROM THE STEPS AND NOT FROM THE SPEC. The spec says what was *meant* to
 * run. The steps say what *did*. Drawing the spec would produce a chart that
 * stays pretty while a node fails, which is precisely the picture you must not
 * show an operator. If a lane is missing here, it is missing because it never
 * ran.
 *
 * Two shapes arrive:
 *   • Graphed runs carry a `N·stageId — ` prefix, so lanes are exact.
 *   • Council and loop runs carry none. Consecutive `debate` steps genuinely
 *     ran at once (council.live fans out its voices), so they collapse into one
 *     parallel lane; everything else stands alone. That is a reconstruction,
 *     not a claim about a spec that never existed.
 */
export function traceLanes(steps: TraceStep[]): TraceLane[] {
  const lanes: TraceLane[] = [];
  const byStage = new Map<string, TraceLane>();

  const push = (lane: TraceLane) => { lanes.push(lane); return lane; };
  const stamp = (lane: TraceLane, s: TraceStep) => {
    lane.steps.push(s);
    lane.parallel = lane.steps.length > 1;
    // A parallel lane's cost is its SLOWEST node, not the sum — summing would
    // report a fan-out as slower than the serial version it replaced.
    lane.latencyMs = Math.max(lane.latencyMs, s.latencyMs ?? 0);
    if (s.error) lane.failed = true;
  };

  for (const s of [...steps].sort((a, b) => a.seq - b.seq)) {
    const m = STAGE_PREFIX.exec(s.input);
    if (m) {
      const key = `${m[1]}·${m[2]}`;
      const clean = { ...s, input: m[3] };
      const existing = byStage.get(key);
      if (existing) { stamp(existing, clean); continue; }
      const lane = push({
        id: m[2], ...laneLabel(m[2], s.kind), steps: [], parallel: false, latencyMs: 0, failed: false,
      });
      byStage.set(key, lane);
      stamp(lane, clean);
      continue;
    }

    const last = lanes[lanes.length - 1];
    if (s.kind === "debate" && last && last.id === "debate") { stamp(last, s); continue; }
    stamp(push({
      id: s.kind === "debate" ? "debate" : `s${s.seq}`,
      ...laneLabel(s.kind === "debate" ? "debate" : "", s.kind),
      steps: [], parallel: false, latencyMs: 0, failed: false,
    }), s);
  }

  return lanes;
}

/**
 * The one line that makes the drawing worth showing: how much wall-clock the
 * parallel lanes saved versus running every node one after another.
 *
 * Returns null in two cases, both deliberate:
 *   • nothing ran in parallel — claiming any saving would be a lie;
 *   • the parallel nodes recorded no measurable latency, so there is nothing
 *     to compare. Council voices are the live example: council.live.ts records
 *     its per-voice steps without a latencyMs, so the arithmetic comes out at
 *     exactly zero — and printing "0 ms saved" beside a genuine five-way
 *     fan-out reads as "the parallelism did nothing", which is worse than
 *     saying nothing at all.
 */
export function parallelSaving(lanes: TraceLane[]): { serialMs: number; actualMs: number; savedMs: number } | null {
  if (!lanes.some((l) => l.parallel)) return null;
  const serialMs = lanes.reduce((n, l) => n + l.steps.reduce((m, s) => m + (s.latencyMs ?? 0), 0), 0);
  const actualMs = lanes.reduce((n, l) => n + l.latencyMs, 0);
  const savedMs = serialMs - actualMs;
  if (savedMs <= 0) return null;
  return { serialMs, actualMs, savedMs };
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
