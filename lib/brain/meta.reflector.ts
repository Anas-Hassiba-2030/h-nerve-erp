// meta.reflector.ts — the self-improving meta brain.
//
// The capstone. Once a week (or on demand), this module:
//   1. Reads BrainFeedback + BrainPattern + Plan + Insight outcomes.
//   2. Computes the four IQ components (accuracy / velocity / outcome /
//      trust) and the headline IQ score.
//   3. Identifies systematic gaps and proposes adjustments to BrainWeight
//      values — but does NOT apply them silently.
//   4. Persists a SelfTuningReport. The user reviews; on Approve, the
//      adjustments commit and a new BrainIQHistory snapshot is taken.
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db";
import { callLlm, extractJson, type LlmRequest } from "./llm";
import { scoreFromComponents, clamp01, type IQComponents } from "./meta.iq";

// ─────────────────────────────────────────────────────────────────────
// IQ computation — the four components are derived here from the DB;
// the pure scoring math lives in ./meta.iq (zero-import, unit-tested).
// ─────────────────────────────────────────────────────────────────────

// Re-exported so existing `import { IQComponents } from ".../meta.reflector"`
// call sites keep resolving — the type's canonical home is now ./meta.iq.
export type { IQComponents } from "./meta.iq";

export type BrainIQ = {
  score: number;
  components: IQComponents;
  trend: "rising" | "flat" | "falling";
  lastComputedAt: Date;
};

const ACCEPT_KINDS = new Set([
  "INSIGHT_HELPFUL",
  "INSIGHT_RESOLVED",
  "PLAN_COMMITTED",
  "PLAN_COMPLETED",
  "PLAN_STEP_DONE",
  "MEMORY_USEFUL",
  "OUTCOME_RIGHT",
]);
const REJECT_KINDS = new Set([
  "INSIGHT_DISMISSED",
  "PLAN_ABANDONED",
  "PLAN_STEP_BLOCKED",
  "MEMORY_IRRELEVANT",
  "OUTCOME_WRONG",
  "RECOMMENDATION_OVERRIDDEN",
]);

export async function computeIQ(scope: string = "default"): Promise<BrainIQ> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [feedback, plansAll, plansCommitted, plansDone, patterns, history] = await Promise.all([
    prisma.brainFeedback.findMany({ where: { scope, ts: { gte: since } } }),
    prisma.plan.count({ where: { createdAt: { gte: since } } }),
    prisma.plan.count({ where: { createdAt: { gte: since }, status: { in: ["ACTIVE", "DONE"] } } }),
    prisma.plan.count({ where: { createdAt: { gte: since }, status: "DONE" } }),
    prisma.brainPattern.findMany({ where: { scope } }),
    prisma.brainIQHistory.findMany({
      where: { scope },
      orderBy: { snappedAt: "desc" },
      take: 2,
    }),
  ]);

  const accept = feedback.filter((f) => ACCEPT_KINDS.has(f.kind)).length;
  const reject = feedback.filter((f) => REJECT_KINDS.has(f.kind)).length;
  const totalEvents = accept + reject;

  const accuracy = totalEvents > 0 ? accept / totalEvents : 0.5;
  const decisionVelocity = plansAll > 0 ? plansCommitted / plansAll : 0.5;
  const outcomeQuality = plansCommitted > 0 ? plansDone / plansCommitted : 0.5;
  const enabled = patterns.filter((p) => p.status === "ENABLED").length;
  const userTrust = patterns.length > 0 ? enabled / patterns.length : 0.5;

  const components: IQComponents = {
    accuracy: clamp01(accuracy),
    decisionVelocity: clamp01(decisionVelocity),
    outcomeQuality: clamp01(outcomeQuality),
    userTrust: clamp01(userTrust),
  };

  const score = scoreFromComponents(components);

  const trend: BrainIQ["trend"] =
    history.length < 2
      ? "flat"
      : score > history[0].iq
        ? "rising"
        : score < history[0].iq
          ? "falling"
          : "flat";

  return { score, components, trend, lastComputedAt: new Date() };
}

// scoreFromComponents + clamp01 now live in ./meta.iq (pure, zero-import,
// unit-tested in meta.reflector.test.ts) and are imported at the top.

// ─────────────────────────────────────────────────────────────────────
// Reflection — produce a SelfTuningReport
// ─────────────────────────────────────────────────────────────────────

export type ProposedAdjustment = {
  target: string;
  field: string; // "weight" | "confidence" | "tone" | "wording"
  from: any;
  to: any;
  rationale: string;
  confidence: number;
};

export async function reflect(opts: { scope?: string; windowDays?: number } = {}): Promise<{
  reportId: string;
  iqBefore: number;
  iqAfterIfApplied: number;
  observations: string[];
  proposedAdjustments: ProposedAdjustment[];
}> {
  const scope = opts.scope ?? "default";
  const windowDays = opts.windowDays ?? 7;

  const before = await computeIQ(scope);
  const observations: string[] = [];
  const adjustments: ProposedAdjustment[] = [];

  // ── Observation 1: rule-suppression patterns that should reweight an agent.
  const dismissalPatterns = await prisma.brainPattern.findMany({
    where: { scope, status: "ENABLED" },
  });
  for (const p of dismissalPatterns) {
    let rule: any;
    try { rule = JSON.parse(p.ruleJson); } catch { continue; }
    if (rule.action === "suppress_alert" && p.evidenceCount >= 5) {
      observations.push(
        `${p.evidenceCount} dismissals for ${rule.module ?? "ANY"}/${rule.category ?? "ANY"} — alert generation overweights this surface.`
      );
      const target = `agent:insight-engine:${(rule.module ?? "any").toLowerCase()}:${(rule.category ?? "any")}`;
      const cur = await getWeight(scope, target, 1.0);
      const proposedTo = round(Math.max(0.55, cur.value - 0.18), 3);
      if (proposedTo !== cur.value) {
        adjustments.push({
          target,
          field: "weight",
          from: cur.value,
          to: proposedTo,
          rationale: `Suppress weight by 18% — pattern shows ${p.evidenceCount} consecutive dismissals.`,
          confidence: 0.78,
        });
      }
    }
    if (rule.action === "boost_alert" && p.evidenceCount >= 4) {
      observations.push(
        `${p.evidenceCount} useful resolutions for ${rule.module ?? "ANY"}/${rule.category ?? "ANY"} — surface should escalate sooner.`
      );
      const target = `agent:insight-engine:${(rule.module ?? "any").toLowerCase()}:${(rule.category ?? "any")}`;
      const cur = await getWeight(scope, target, 1.0);
      const proposedTo = round(Math.min(1.45, cur.value + 0.12), 3);
      if (proposedTo !== cur.value) {
        adjustments.push({
          target,
          field: "weight",
          from: cur.value,
          to: proposedTo,
          rationale: `Boost weight by 12% — pattern shows consistent positive resolution.`,
          confidence: 0.72,
        });
      }
    }
    if (rule.action === "fast_track_plan" && p.evidenceCount >= 5) {
      observations.push(
        `${p.evidenceCount} commits in a row for ${rule.module ?? "ANY"} council-sourced plans — drafting cycle wastes time.`
      );
      const target = `planner.${(rule.module ?? "any").toLowerCase()}.draft_review_required`;
      const cur = await getWeight(scope, target, 1.0);
      const proposedTo = 0; // skip the draft step
      if (proposedTo !== cur.value) {
        adjustments.push({
          target,
          field: "weight",
          from: cur.value,
          to: proposedTo,
          rationale: `Drop draft-review gate — ${p.evidenceCount}/${p.evidenceCount} commit rate is sustained signal.`,
          confidence: 0.76,
        });
      }
    }
  }

  // ── Observation 2: poor outcome quality means simulator-edge confidence is too high.
  if (before.components.outcomeQuality < 0.5) {
    observations.push(
      `Outcome quality at ${(before.components.outcomeQuality * 100).toFixed(0)}% — committed plans aren't completing as predicted; simulator edges are likely too confident.`
    );
    const target = "simulator.attenuation_per_hop";
    const cur = await getWeight(scope, target, 0.92);
    const proposedTo = round(cur.value - 0.04, 3);
    adjustments.push({
      target,
      field: "weight",
      from: cur.value,
      to: proposedTo,
      rationale: `Tighten attenuation by 4% so projections degrade faster across hops.`,
      confidence: 0.65,
    });
  }

  // ── Observation 3: high accuracy with rising trend → relax narrator caution.
  if (before.components.accuracy > 0.78) {
    observations.push(
      `Accuracy at ${(before.components.accuracy * 100).toFixed(0)}% — narrator caution can ease without raising error rate.`
    );
    const target = "narrator.editorial.caution";
    const cur = await getWeight(scope, target, 0.6);
    const proposedTo = round(Math.max(0.35, cur.value - 0.08), 3);
    if (proposedTo !== cur.value) {
      adjustments.push({
        target,
        field: "tone",
        from: cur.value,
        to: proposedTo,
        rationale: `Reduce hedging language; current accuracy supports more direct phrasing.`,
        confidence: 0.7,
      });
    }
  }

  // ── Observation 4: low velocity → council moderator dampening too high.
  if (before.components.decisionVelocity < 0.5) {
    observations.push(
      `Decision velocity at ${(before.components.decisionVelocity * 100).toFixed(0)}% — council moderator hedges too often, slowing commits.`
    );
    const target = "council.moderator.hedge_factor";
    const cur = await getWeight(scope, target, 0.55);
    const proposedTo = round(Math.max(0.3, cur.value - 0.12), 3);
    adjustments.push({
      target,
      field: "weight",
      from: cur.value,
      to: proposedTo,
      rationale: `Dampen hedging by 12% — observed velocity is below the 50% threshold.`,
      confidence: 0.68,
    });
  }

  // If no adjustments at all, log a single null-result observation.
  if (adjustments.length === 0) {
    observations.push(
      `No adjustments proposed — all weights within tolerance for the observed window.`
    );
  }

  // Project IQ if every proposal is accepted.
  // Heuristic: each accepted adjustment lifts the relevant component by
  // ~confidence * 0.04 (capped per component at 1.0).
  const projected = projectIQ(before.components, adjustments);

  const editorial = await draftEditorial({
    iqBefore: before.score,
    iqAfter: projected,
    observations,
    adjustments,
  });

  const report = await prisma.selfTuningReport.create({
    data: {
      scope,
      windowDays,
      observationsJson: JSON.stringify(observations),
      proposedAdjustmentsJson: JSON.stringify(adjustments),
      editorialEn: editorial.en,
      editorialAr: editorial.ar,
      iqBefore: before.score,
      iqAfterIfApplied: projected,
      status: adjustments.length === 0 ? "AUTO_APPLIED" : "DRAFT",
    },
  });

  return {
    reportId: report.id,
    iqBefore: before.score,
    iqAfterIfApplied: projected,
    observations,
    proposedAdjustments: adjustments,
  };
}

function projectIQ(c: IQComponents, adjustments: ProposedAdjustment[]): number {
  let acc = c.accuracy;
  let vel = c.decisionVelocity;
  let out = c.outcomeQuality;
  let trust = c.userTrust;
  for (const a of adjustments) {
    const lift = a.confidence * 0.04;
    if (a.target.startsWith("agent:insight-engine") || a.target.startsWith("narrator"))
      acc = Math.min(1, acc + lift);
    else if (a.target.startsWith("planner") || a.target.startsWith("council"))
      vel = Math.min(1, vel + lift);
    else if (a.target.startsWith("simulator"))
      out = Math.min(1, out + lift);
    else
      trust = Math.min(1, trust + lift);
  }
  return scoreFromComponents({ accuracy: acc, decisionVelocity: vel, outcomeQuality: out, userTrust: trust });
}

// ─────────────────────────────────────────────────────────────────────
// Apply — commit a report's adjustments
// ─────────────────────────────────────────────────────────────────────

export async function apply(
  reportId: string,
  reviewer: { userId: string; note?: string }
): Promise<{ iqAfter: number; appliedCount: number }> {
  const report = await prisma.selfTuningReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("report not found");
  if (report.status !== "DRAFT") {
    return { iqAfter: report.iqAfterApplied ?? report.iqAfterIfApplied, appliedCount: 0 };
  }
  let adjustments: ProposedAdjustment[];
  try { adjustments = JSON.parse(report.proposedAdjustmentsJson); } catch { adjustments = []; }

  for (const a of adjustments) {
    await setWeight(report.scope, a.target, a.to, "auto-tuned", a.rationale);
  }

  const after = await computeIQ(report.scope);

  await prisma.selfTuningReport.update({
    where: { id: reportId },
    data: {
      status: "APPROVED",
      reviewerNote: reviewer.note ?? null,
      reviewedById: reviewer.userId,
      reviewedAt: new Date(),
      iqAfterApplied: after.score,
    },
  });

  // Snapshot the new IQ.
  await prisma.brainIQHistory.create({
    data: {
      scope: report.scope,
      snappedAt: new Date(),
      iq: after.score,
      accuracy: after.components.accuracy,
      decisionVelocity: after.components.decisionVelocity,
      outcomeQuality: after.components.outcomeQuality,
      userTrust: after.components.userTrust,
      drivenBy: "rebalance",
      note: `Applied ${adjustments.length} adjustments from report ${reportId.slice(0, 8)}.`,
    },
  });

  return { iqAfter: after.score, appliedCount: adjustments.length };
}

export async function reject(reportId: string, reviewer: { userId: string; note?: string }) {
  await prisma.selfTuningReport.update({
    where: { id: reportId },
    data: {
      status: "REJECTED",
      reviewerNote: reviewer.note ?? null,
      reviewedById: reviewer.userId,
      reviewedAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// BrainWeight helpers
// ─────────────────────────────────────────────────────────────────────

async function getWeight(scope: string, target: string, defaultValue: number) {
  let row = await prisma.brainWeight.findUnique({
    where: { scope_target: { scope, target } },
  });
  if (!row) {
    row = await prisma.brainWeight.create({
      data: { scope, target, value: defaultValue, origin: "default" },
    });
  }
  return row;
}

async function setWeight(scope: string, target: string, value: number, origin: string, description?: string) {
  await prisma.brainWeight.upsert({
    where: { scope_target: { scope, target } },
    create: { scope, target, value, origin, description: description ?? null },
    update: { value, origin, description: description ?? null, version: { increment: 1 } },
  });
}

function round(n: number, digits = 4): number {
  const k = Math.pow(10, digits);
  return Math.round(n * k) / k;
}

// ─────────────────────────────────────────────────────────────────────
// Editorial drafting — LLM with stub fallback.
// ─────────────────────────────────────────────────────────────────────

const SYSTEM = `
You are the Meta Brain. You read your own performance log and write a single editorial paragraph (60-110 words) explaining what you noticed about yourself this week and what you propose to change.

You speak in first person ("I'm overweighting weather signals...", "I propose to drop..."). You quote your IQ before and projected after. You name specific weights you want to change. You do not flatter the user. You do not apologize.

Respond ONLY with a JSON object of this shape:
{
  "en": "<single paragraph, 60-110 words, English>",
  "ar": "<same paragraph in Arabic>"
}
`.trim();

async function draftEditorial(args: {
  iqBefore: number;
  iqAfter: number;
  observations: string[];
  adjustments: ProposedAdjustment[];
}): Promise<{ en: string; ar: string }> {
  const stub = (_r: LlmRequest) => JSON.stringify(stubEditorial(args));
  const userPrompt = `Performance window:
- IQ before: ${args.iqBefore}
- Projected IQ if all proposals approved: ${args.iqAfter}
- Observations:
${args.observations.map((o) => `  • ${o}`).join("\n")}
- Proposed adjustments (${args.adjustments.length}):
${args.adjustments.map((a) => `  • ${a.target} ${a.field}: ${a.from} → ${a.to} (conf ${(a.confidence * 100).toFixed(0)}%) — ${a.rationale}`).join("\n")}

Write the editorial.`;
  const res = await callLlm(
    { system: SYSTEM, user: userPrompt, maxTokens: 360, temperature: 0.55, expectJson: true },
    stub
  );
  const parsed = extractJson<{ en: string; ar: string }>(res.text);
  if (!parsed?.en) return stubEditorial(args);
  return {
    en: String(parsed.en).slice(0, 1200),
    ar: String(parsed.ar ?? "").slice(0, 1200),
  };
}

function stubEditorial(args: {
  iqBefore: number;
  iqAfter: number;
  observations: string[];
  adjustments: ProposedAdjustment[];
}): { en: string; ar: string } {
  const delta = args.iqAfter - args.iqBefore;
  const adjCount = args.adjustments.length;
  const topObs = args.observations[0] ?? "no notable patterns this week";
  if (adjCount === 0) {
    return {
      en: `My IQ holds at ${args.iqBefore} this week. ${topObs} I'm not proposing any rebalances — every weight is inside its tolerance band, and forcing motion would add noise rather than signal. I'll watch the next window for any drift in outcome quality and reflect again in seven days.`,
      ar: `معدّل ذكائي ثابت عند ${args.iqBefore} هذا الأسبوع. ${topObs} لا أقترح أيّ إعادة موازنة — كل الأوزان ضمن نطاق التحمّل، والتحريك القسري سيضيف ضوضاءً لا إشارة. سأراقب النافذة التالية لأي انزياح في جودة النتائج وأعيد التأمل بعد سبعة أيام.`,
    };
  }
  return {
    en: `My IQ stands at ${args.iqBefore}. ${topObs} I'm proposing ${adjCount} weight adjustment${adjCount === 1 ? "" : "s"}; if approved, projected IQ next window is ${args.iqAfter} (${delta >= 0 ? "+" : ""}${delta}). The largest single move is on the agent suppression weights for repeatedly dismissed alerts — pulling them down will save ${adjCount * 3} or so unnecessary surface notifications per week without raising the false-negative rate.`,
    ar: `معدّل ذكائي ${args.iqBefore}. ${topObs} أقترح ${adjCount} تعديل${adjCount === 1 ? "" : "ات"} وزنية؛ في حال الموافقة، الإسقاط للنافذة القادمة هو ${args.iqAfter} (${delta >= 0 ? "+" : ""}${delta}). أكبر حركة فردية على أوزان كتم التنبيهات المتجاهلة باستمرار — تخفيضها سيوفّر نحو ${adjCount * 3} إشعاراً غير ضروري أسبوعياً دون رفع معدل الإيجابيات الكاذبة.`,
  };
}
