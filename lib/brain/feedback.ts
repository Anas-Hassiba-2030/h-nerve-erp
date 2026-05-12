// feedback.ts — the brain's training signal.
//
// Every time a user dismisses an alert, overrides a recommendation,
// abandons a plan, or marks an outcome wrong → it becomes a Feedback
// record. The feedback loop reweights the brain's signals so it learns
// the org's actual decision style over time.
//
// Concrete behaviors:
//   - margin alerts < 5%: org dismisses 9/10 → suppress unless > 5%
//   - dairy ramp recommendations on Sundays: org never accepts → defer
//   - council recommendations from "finance-brain" override more often
//     than "dairy-expert" → reweight the synthesis
//
// The feedback loop is also the input to the Meta brain (Phase 10) — it
// runs weekly self-reflection over the feedback table.
//
// See docs/PHASES-INTELLIGENCE.md — Phase 7.

export type FeedbackKind =
  | "INSIGHT_DISMISSED"
  | "INSIGHT_HELPFUL"
  | "INSIGHT_RESOLVED"
  | "RECOMMENDATION_OVERRIDDEN"
  | "PLAN_COMMITTED"
  | "PLAN_ABANDONED"
  | "PLAN_COMPLETED"
  | "PLAN_STEP_DONE"
  | "PLAN_STEP_BLOCKED"
  | "OUTCOME_WRONG"
  | "OUTCOME_RIGHT"
  | "MEMORY_USEFUL"
  | "MEMORY_IRRELEVANT";

export type FeedbackRecord = {
  id: string;
  ts: Date;
  userId: string;
  orgId: string;
  kind: FeedbackKind;
  targetRef: string;
  note?: string;
  signalDelta?: number;
};

export interface FeedbackLoop {
  record(r: Omit<FeedbackRecord, "id" | "ts">): Promise<void>;
  weights(scope: { orgId: string; tag?: string }): Promise<Record<string, number>>;
  digest(window: "day" | "week" | "month"): Promise<{
    accepted: number;
    rejected: number;
    learnedPatterns: string[];
  }>;
}
