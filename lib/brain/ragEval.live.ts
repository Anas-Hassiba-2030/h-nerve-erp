// lib/brain/ragEval.live.ts — DB-backed fleet RAG-quality (Phase RAG-6).
//
// Every narrative the brain writes is already verified and persisted with
// trust telemetry (Narrative.claimsMatched / claimsTotal / trustScore — see
// narrator.claude.ts). This rolls that telemetry up into a fleet-level RAG
// faithfulness/quality reading that feeds the Brain-IQ report
// (meta.reflector.ts), so the trust dashboard shows a real, earned number
// instead of a guess.
//
// Read-only. Degrades to a neutral reading on an empty/missing table so
// callers never special-case "no narratives yet".

import { prisma } from "@/lib/db";

export type RagQuality = {
  /** Mean fraction of narrative claims that grounded in their facts (faithfulness). */
  faithfulness: number;
  /** Mean persisted trust score across recent narratives. */
  avgTrust: number;
  /** Aggregate RAG quality in [0,1]. */
  overall: number;
  /** How many narratives informed this reading. */
  sampleSize: number;
};

const NEUTRAL: RagQuality = { faithfulness: 0.5, avgTrust: 0.5, overall: 0.5, sampleSize: 0 };

/**
 * Compute fleet RAG quality for a scope from recent verified narratives.
 * Returns a neutral 0.5 reading when there's nothing to measure yet.
 */
export async function computeRagQuality(scope = "default", sample = 100): Promise<RagQuality> {
  let rows: Array<{ claimsTotal: number; claimsMatched: number; trustScore: number | null }>;
  try {
    rows = await prisma.narrative.findMany({
      where: { scope },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, sample),
      select: { claimsTotal: true, claimsMatched: true, trustScore: true },
    });
  } catch {
    return NEUTRAL;
  }
  if (rows.length === 0) return NEUTRAL;

  // Faithfulness: aggregate matched/total across narratives that made claims.
  let totalClaims = 0;
  let matchedClaims = 0;
  let trustSum = 0;
  let trustN = 0;
  for (const r of rows) {
    if (r.claimsTotal > 0) {
      totalClaims += r.claimsTotal;
      matchedClaims += r.claimsMatched;
    }
    if (typeof r.trustScore === "number") {
      trustSum += r.trustScore;
      trustN += 1;
    }
  }

  const faithfulness = totalClaims > 0 ? matchedClaims / totalClaims : 0.5;
  const avgTrust = trustN > 0 ? trustSum / trustN : 0.5;
  const overall = Number((0.6 * faithfulness + 0.4 * avgTrust).toFixed(4));

  return {
    faithfulness: Number(faithfulness.toFixed(4)),
    avgTrust: Number(avgTrust.toFixed(4)),
    overall,
    sampleSize: rows.length,
  };
}
