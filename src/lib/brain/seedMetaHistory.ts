// seedMetaHistory.ts — populate 8 weeks of climbing IQ history + 4
// historical SelfTuningReports so the demo opens with a credible trail.
//
// Phase 10 of docs/governance/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";

const WEEKS = 8;

// Hand-tuned trajectory — IQ climbs from 102 to 142 over 8 weeks, with
// realistic component movement.
const TRAJECTORY = [
  { iq: 102, accuracy: 0.42, decisionVelocity: 0.41, outcomeQuality: 0.36, userTrust: 0.65 },
  { iq: 109, accuracy: 0.48, decisionVelocity: 0.46, outcomeQuality: 0.41, userTrust: 0.68 },
  { iq: 117, accuracy: 0.55, decisionVelocity: 0.52, outcomeQuality: 0.47, userTrust: 0.72 },
  { iq: 122, accuracy: 0.59, decisionVelocity: 0.55, outcomeQuality: 0.51, userTrust: 0.74 },
  { iq: 128, accuracy: 0.65, decisionVelocity: 0.59, outcomeQuality: 0.56, userTrust: 0.78 },
  { iq: 134, accuracy: 0.71, decisionVelocity: 0.62, outcomeQuality: 0.63, userTrust: 0.81 },
  { iq: 138, accuracy: 0.74, decisionVelocity: 0.65, outcomeQuality: 0.66, userTrust: 0.84 },
  { iq: 142, accuracy: 0.78, decisionVelocity: 0.68, outcomeQuality: 0.71, userTrust: 0.86 },
];

const REPORT_NOTES = [
  {
    weekIdx: 1,
    obs: [
      "Margin alerts under 5% delta dismissed 8/9 times — suppression weight needed.",
      "Memory-lake recall hit-rate 64% on dairy module.",
    ],
    editorial:
      "My IQ climbed from 102 to 109 this week. The single largest contributor was tightening alert weights on the FINANCE module — eight of nine margin alerts under 5% were dismissed, and dropping their weight by 18% will save the next executive review queue from the same noise. I'm proposing two edge-confidence tightenings on the simulator and a small caution drop in the narrator. Outcome quality is still under 50% — that's where my next reflection will focus.",
  },
  {
    weekIdx: 3,
    obs: [
      "Council-sourced plans hit a 92% commit rate — draft step is dead weight.",
      "Soil-moisture alert resolution rate at 100% for the third consecutive week.",
    ],
    editorial:
      "I'm at 122. The clearest move this week is a structural one: council-sourced plans commit at 92%, so I'm dropping the draft-review gate for that source class. Operationally, FARMS moisture alerts have a perfect resolution rate — boosting their surfacing weight by 12% will catch the next event a day earlier on average. Seven proposed adjustments in total. Projected IQ at 128 if all approved.",
  },
  {
    weekIdx: 5,
    obs: [
      "Outcome quality crossed 50% — committed plans now finish roughly half the time.",
      "Energy-hedge memory pulled into 4 of 6 finance insights this week.",
    ],
    editorial:
      "My IQ is at 134, up six from last week. The compounding effect is showing — adjusted weights from earlier reports stay in force, and the feedback loop now has cleaner training signal because the suppressed alerts no longer pollute it. I'm proposing three more changes this cycle, including a tighter attenuation on simulator hops (committed plans aren't completing as predicted, suggesting downstream confidence is too high). Outcome quality should be the next IQ unlock.",
  },
  {
    weekIdx: 7,
    obs: [
      "User trust at 86% — patterns retained at high rate, very few unlearned.",
      "Narrator caution can ease without raising error rate.",
    ],
    editorial:
      "I'm holding 138 with rising trend. User trust at 86% means the patterns I've learned are sticking — only one was unlearned this month. With accuracy crossing 78%, I'm easing narrator caution by 8 points; the prose should read more direct without losing accuracy. Two small adjustments this cycle. If approved, projected IQ at 142 — a new high.",
  },
];

export async function seedMetaHistory(): Promise<{
  iqRowsWritten: number;
  reportsWritten: number;
  durationMs: number;
}> {
  const t0 = Date.now();
  // Clear prior history so re-seeding gives a clean trajectory.
  await prisma.brainIQHistory.deleteMany({ where: { scope: "default" } });
  await prisma.selfTuningReport.deleteMany({ where: { scope: "default" } });

  const now = Date.now();
  let iqRowsWritten = 0;
  for (let i = 0; i < WEEKS; i++) {
    const t = TRAJECTORY[i];
    const snappedAt = new Date(now - (WEEKS - 1 - i) * 7 * 24 * 3600 * 1000);
    await prisma.brainIQHistory.create({
      data: {
        scope: "default",
        snappedAt,
        iq: t.iq,
        accuracy: t.accuracy,
        decisionVelocity: t.decisionVelocity,
        outcomeQuality: t.outcomeQuality,
        userTrust: t.userTrust,
        drivenBy: i === 0 ? "trust" : i < 4 ? "accuracy" : "outcome",
      },
    });
    iqRowsWritten++;
  }

  let reportsWritten = 0;
  for (const r of REPORT_NOTES) {
    const before = TRAJECTORY[r.weekIdx];
    const after = TRAJECTORY[r.weekIdx + 1] ?? before;
    const ranAt = new Date(now - (WEEKS - 1 - r.weekIdx) * 7 * 24 * 3600 * 1000);

    // Synthetic adjustments — not real BrainWeight rows, just for display
    // history. The reflect() function produces real ones for current cycle.
    const adjustments = [
      {
        target: "agent:insight-engine:finance:margin_low",
        field: "weight",
        from: 1.0,
        to: 0.82,
        rationale: "Suppress dismissed margin alerts",
        confidence: 0.78,
      },
      {
        target: "narrator.editorial.caution",
        field: "tone",
        from: 0.6,
        to: 0.52,
        rationale: "Reduce hedging — accuracy supports it",
        confidence: 0.7,
      },
    ];

    await prisma.selfTuningReport.create({
      data: {
        scope: "default",
        ranAt,
        windowDays: 7,
        observationsJson: JSON.stringify(r.obs),
        proposedAdjustmentsJson: JSON.stringify(adjustments),
        editorialEn: r.editorial,
        iqBefore: before.iq,
        iqAfterIfApplied: after.iq,
        iqAfterApplied: after.iq,
        status: "APPROVED",
        reviewedAt: new Date(ranAt.getTime() + 4 * 3600 * 1000),
      },
    });
    reportsWritten++;
  }

  return { iqRowsWritten, reportsWritten, durationMs: Date.now() - t0 };
}
