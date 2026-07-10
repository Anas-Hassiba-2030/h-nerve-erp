// lib/brain/meta.iq.ts — the PURE Brain-IQ math.
//
// Deliberately has ZERO imports (no Prisma, no LLM, no next/*): it is
// plain arithmetic over four [0,1] components, so it can be unit-tested
// with no database, no server, no API. `meta.reflector.ts` reads the
// DB, derives the four components, then calls in here — this file holds
// the scoring logic so the headline number is *provable*.
//
// Same pattern as lib/workspaceScope.ts (logic) ↔ lib/db.ts (wiring):
// the pitch-critical math must not be welded to a Prisma import.
//
// `score` is THE public Brain-IQ number (Phase 10,
// docs/governance/PHASES-INTELLIGENCE.md). If this drifts or goes non-monotone,
// the pitch breaks — see meta.reflector.test.ts for the pinned contract.

export type IQComponents = {
  accuracy: number; // [0,1] — accept ratio over feedback
  decisionVelocity: number; // [0,1] — committed plans / created artefacts
  outcomeQuality: number; // [0,1] — completed plans / committed plans
  userTrust: number; // [0,1] — patterns enabled / total patterns
};

export function scoreFromComponents(c: IQComponents): number {
  // Base 80, max ~160 in normal usage. Sales-friendly.
  return Math.round(
    80 +
      c.accuracy * 25 +
      c.decisionVelocity * 15 +
      c.outcomeQuality * 25 +
      c.userTrust * 15,
  );
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
