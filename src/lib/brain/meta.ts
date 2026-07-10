// meta.ts — the self-improving meta brain.
//
// THIS IS THE FINAL PHASE. The thing the user asked to be the "best
// brain in the world." Read carefully.
//
// Once a week (or on demand), the meta brain wakes up, reads its own
// performance log, and tunes the brain's own weights.
//
// What it does:
//   1. Reads every BrainAnswer.trace from the past window.
//   2. Joins each trace with the eventual outcome (from FeedbackLoop +
//      Memory.outcome + ground-truth metrics).
//   3. Identifies systematic errors:
//        - Which agents were over- or under-weighted?
//        - Which causal edges had wrong sign or magnitude?
//        - Which narrative tones got dismissed most?
//        - Which memory tags were never useful?
//   4. Proposes weight adjustments — but does NOT apply them silently.
//      It writes a "Self-tuning report" the user reviews and approves.
//   5. If approved (or auto-applied at high confidence), the new weights
//      go live and the brain starts learning under them.
//
// The meta brain is also the source of the "Brain IQ" score: a single
// public number representing the brain's accuracy + decision velocity +
// outcome quality + user trust. The number rises monotonically when
// the brain is improving.
//
// The meta brain is the only subsystem that can REWRITE the brain
// itself — every other subsystem is data-in / answer-out. This one
// reaches into prompts, weights, and edge confidences and changes them.
//
// See docs/governance/PHASES-INTELLIGENCE.md — Phase 10 (the final phase).

export type SelfTuningReport = {
  id: string;
  ranAt: Date;
  windowDays: number;

  observations: string[];          // what the meta brain noticed
  proposedAdjustments: Array<{
    target: string;                // "agent:dairy-expert" | "edge:abc-xyz" | "prompt:narrator.editorial.ar"
    field: string;                 // "weight" | "confidence" | "tone" | "wording"
    from: any;
    to: any;
    rationale: string;
    confidence: number;            // 0..1
  }>;

  iqBefore: number;
  iqAfterIfApplied: number;        // simulated IQ if the user approves
  reviewerNote?: string;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "AUTO_APPLIED";
};

export type BrainIQ = {
  score: number;                   // typically 70..200, sales-friendly
  components: {
    accuracy: number;
    decisionVelocity: number;
    outcomeQuality: number;
    userTrust: number;
  };
  trend: "rising" | "flat" | "falling";
  lastComputedAt: Date;
};

export interface MetaBrain {
  reflect(windowDays: number): Promise<SelfTuningReport>;
  apply(reportId: string, mode: "manual" | "auto"): Promise<void>;
  iq(orgId: string): Promise<BrainIQ>;
  report(ctx: any): Promise<{ healthy: boolean; iq: BrainIQ; pendingReports: number }>;
}
