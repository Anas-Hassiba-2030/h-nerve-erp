// planner.ts — turns insights into ordered action plans.
//
// An Insight is a finding ("dairy expiry risk in 3 days").
// A Plan is a commitment ("ship 1,180L to Maha distributor by Thursday,
// run promo at Arena F&B, revise reorder point").
//
// Plans have:
//   - a target outcome (a metric + a delta + a deadline)
//   - ordered steps, each assignable to a user/role
//   - a rollback condition (auto-revert if X)
//   - a projected impact, computed by the simulator
//   - a status: DRAFT | ACTIVE | DONE | ABANDONED | ROLLED_BACK
//
// The planner can synthesize a plan from any insight or council session,
// or accept one written by hand. Plans are first-class entities in the
// schema (see Phase 5).
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 5.

export type PlanStep = {
  order: number;
  action: { ar: string; en: string };
  ownerRole: string;
  ownerUserId?: string;
  dueAt?: Date;
  status: "PENDING" | "DONE" | "BLOCKED";
};

export type Plan = {
  id: string;
  goal: string;
  target: { metric: string; delta: number; deadline: Date };
  steps: PlanStep[];
  rollback?: { condition: string; revertSteps: PlanStep[] };
  projectedImpact?: { metric: string; delta: number; confidence: number };
  status: "DRAFT" | "ACTIVE" | "DONE" | "ABANDONED" | "ROLLED_BACK";
  sourceInsightId?: string;
  sourceCouncilSessionId?: string;
};

export interface Planner {
  fromInsight(insightId: string): Promise<Plan>;
  fromCouncil(sessionId: string): Promise<Plan>;
  commit(plan: Plan): Promise<Plan>;
  watch(planId: string): Promise<{ status: Plan["status"]; deviation?: number }>;
}
