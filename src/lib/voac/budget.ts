// lib/voac/budget.ts — the proposal budget.
//
// This module exists because of the single sharpest finding against the VOAC:
// "agents propose, humans commit" converts every mediocre proposal into a
// claim on finite manager attention. An uncapped queue has exactly two
// outcomes, and both are failures:
//
//   1. managers ignore it  → the feature dies, and it looks like low
//                            engagement rather than the wrong product;
//   2. managers rubber-stamp it → you have shipped autonomous mutation with a
//                            human fig leaf, and the first blind-approved
//                            purchase order ends the pilot.
//
// So precision is the product and recall is a liability. The VOAC is allowed
// to think as much as its cost caps permit, but it may only put a bounded
// number of things in front of a human per day — and it must say what it
// held back, because a silent truncation reads as "there was nothing else".
//
// Pure. No DB, no clock: the caller passes `usedToday` and the floors, so the
// ranking logic is testable without a database or a frozen timer.

/** The minimum a candidate must carry to be ranked at all. */
export type ProposalCandidate = {
  id: string;
  title: string;
  /** Modelled value in JOD. Undefined means "not quantified", which is
   *  treated as zero for ranking — an unquantified proposal must never
   *  outrank a quantified one. */
  estimatedValueJod?: number;
  /** 0..1. How much the agent believes its own estimate. */
  confidence: number;
};

export type SuppressedProposal = {
  id: string;
  title: string;
  reason: string;
};

export type BudgetDecision<T extends ProposalCandidate> = {
  /** What a human will actually see, best first. */
  surfaced: T[];
  /** What was held back and why. Never dropped silently. */
  suppressed: SuppressedProposal[];
  /** Slots left after this batch. */
  remaining: number;
};

export type BudgetPolicy = {
  /** Hard ceiling of proposals per human per day (VoacRoster.dailyProposalCap). */
  dailyCap: number;
  /** Already surfaced to this human today. */
  usedToday: number;
  /** Candidates below this confidence never surface, however valuable they claim to be. */
  minConfidence?: number;
  /** Candidates below this expected value never surface, however confident. */
  minExpectedValueJod?: number;
};

/**
 * Expected value = modelled value × confidence.
 *
 * Ranking on raw estimated value alone would let a wildly speculative
 * 50,000 JOD guess outrank a near-certain 4,000 JOD saving, which is precisely
 * the failure that trains managers to stop reading the queue.
 */
export function expectedValue(p: ProposalCandidate): number {
  const value = Number.isFinite(p.estimatedValueJod) ? (p.estimatedValueJod as number) : 0;
  const confidence = Number.isFinite(p.confidence) ? p.confidence : 0;
  // Clamp rather than trust: a confidence of 3 (or -1) is a bug upstream,
  // and it must not be able to buy its way to the top of a manager's list.
  const clamped = Math.min(1, Math.max(0, confidence));
  return Math.max(0, value) * clamped;
}

export function remainingBudget(policy: Pick<BudgetPolicy, "dailyCap" | "usedToday">): number {
  return Math.max(0, policy.dailyCap - Math.max(0, policy.usedToday));
}

/**
 * Apply the floors, rank by expected value, clip to the remaining budget.
 *
 * Ties break on id so the ordering is stable — an unstable queue that
 * reshuffles between page loads reads as a broken system.
 */
export function clipToBudget<T extends ProposalCandidate>(
  candidates: T[],
  policy: BudgetPolicy,
): BudgetDecision<T> {
  const suppressed: SuppressedProposal[] = [];
  const minConfidence = policy.minConfidence ?? 0;
  const minValue = policy.minExpectedValueJod ?? 0;

  const eligible = candidates.filter((c) => {
    if (c.confidence < minConfidence) {
      suppressed.push({
        id: c.id,
        title: c.title,
        reason: `Confidence ${c.confidence.toFixed(2)} is below the floor of ${minConfidence.toFixed(2)}.`,
      });
      return false;
    }
    if (expectedValue(c) < minValue) {
      suppressed.push({
        id: c.id,
        title: c.title,
        reason: `Expected value ${expectedValue(c).toFixed(0)} JOD is below the floor of ${minValue.toFixed(0)} JOD.`,
      });
      return false;
    }
    return true;
  });

  const ranked = [...eligible].sort((a, b) => {
    const diff = expectedValue(b) - expectedValue(a);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const budget = remainingBudget(policy);
  const surfaced = ranked.slice(0, budget);

  for (const over of ranked.slice(budget)) {
    suppressed.push({
      id: over.id,
      title: over.title,
      reason:
        budget === 0
          ? `The daily proposal budget of ${policy.dailyCap} is already spent.`
          : `Ranked below the top ${budget} within today's proposal budget.`,
    });
  }

  return { surfaced, suppressed, remaining: budget - surfaced.length };
}
