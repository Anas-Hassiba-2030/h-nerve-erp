// lib/brain/crag.ts — Phase RAG-5: Corrective RAG retrieval evaluator.
//
// Retrieval is not always right. CRAG (ch. 11) grades the *quality* of what a
// retriever returned for a query and corrects course before generation:
//
//   • CORRECT   — strong, confident match → ground the answer on it.
//   • AMBIGUOUS — a plausible-but-weak match → use it, but hedge and lower
//                 confidence so the narrator doesn't over-claim.
//   • INCORRECT — nothing cleared the bar → DROP the retrieved context so the
//                 brain falls back to its structured facts instead of citing
//                 an irrelevant document (the failure mode CRAG exists to fix).
//
// Pure + dependency-free: it scores from the retrieval hits' own similarity
// scores (plus the top/second gap), so it unit-tests with no DB/network and
// works the same for document hits, graph hits, or memory hits. The real CRAG
// paper fine-tunes an evaluator model; this is the deterministic approximation
// that plugs into the existing Phase-22 trust/confidence layer.

export type RetrievalQuality = "correct" | "ambiguous" | "incorrect";
export type RetrievalAction = "use" | "blend" | "drop";

export type CragVerdict<T extends { score: number }> = {
  quality: RetrievalQuality;
  action: RetrievalAction;
  /** Highest hit score seen (0 when nothing retrieved). */
  topScore: number;
  /**
   * Gap between the top hit and the runner-up (`topScore - secondScore`). A lone
   * hit reports its full score (gap over an empty field). A large margin means the
   * top match clearly dominates; a near-zero margin means a flat field of
   * near-ties — weaker discrimination. Feeds the ambiguous-band grounding score.
   */
  margin: number;
  /**
   * A grounding-confidence multiplier in [0,1] for the downstream answer:
   * 1 when retrieval is strong, ~0.6 when ambiguous, 0 when dropped. Multiply
   * your base confidence by this so weak retrieval visibly lowers trust.
   */
  groundingConfidence: number;
  /** The hits to actually use — full set when correct, trimmed when ambiguous, [] when incorrect. */
  keep: T[];
};

export type CragOptions = {
  /** topScore ≥ this → CORRECT. Default 0.18 (tuned for the local embedder). */
  correctAt?: number;
  /** topScore ≥ this (but below correctAt) → AMBIGUOUS. Default 0.10. */
  ambiguousAt?: number;
  /** Max hits to keep when AMBIGUOUS (the strongest few). Default 2. */
  ambiguousKeep?: number;
};

/**
 * Grade a ranked list of retrieval hits (already sorted high→low, or not —
 * we read the max defensively) and decide what to do with them.
 */
export function evaluateRetrieval<T extends { score: number }>(
  hits: T[],
  opts: CragOptions = {},
): CragVerdict<T> {
  const correctAt = opts.correctAt ?? 0.18;
  const ambiguousAt = opts.ambiguousAt ?? 0.1;
  const ambiguousKeep = Math.max(1, opts.ambiguousKeep ?? 2);

  if (!hits.length) {
    return { quality: "incorrect", action: "drop", topScore: 0, margin: 0, groundingConfidence: 0, keep: [] };
  }

  const sorted = [...hits].sort((a, b) => b.score - a.score);
  const topScore = sorted[0].score;
  const secondScore = sorted[1]?.score ?? 0;
  const margin = topScore - secondScore;

  if (topScore >= correctAt) {
    // Keep every hit that's itself reasonably strong (≥ ambiguousAt).
    const keep = sorted.filter((h) => h.score >= ambiguousAt);
    return {
      quality: "correct",
      action: "use",
      topScore,
      margin,
      groundingConfidence: 1,
      keep: keep.length ? keep : [sorted[0]],
    };
  }

  if (topScore >= ambiguousAt) {
    // Two signals decide how warm an ambiguous match reads, scaled into 0.5→0.8:
    //   • thresholdFrac — how close topScore sits to the CORRECT boundary.
    //   • marginFrac    — how strongly the top hit dominates the runner-up
    //                     (relative to its own score). A flat field of near-ties
    //                     discriminates poorly and should read cooler than a
    //                     single hit that clearly stands out at the same topScore.
    // Weighted 70/30 toward the threshold (absolute strength still leads).
    const thresholdFrac = clamp01((topScore - ambiguousAt) / Math.max(correctAt - ambiguousAt, 1e-6));
    const marginFrac = clamp01(topScore > 0 ? margin / topScore : 0);
    const groundingConfidence = 0.5 + 0.3 * (0.7 * thresholdFrac + 0.3 * marginFrac);
    return {
      quality: "ambiguous",
      action: "blend",
      topScore,
      margin,
      groundingConfidence,
      keep: sorted.slice(0, ambiguousKeep),
    };
  }

  return { quality: "incorrect", action: "drop", topScore, margin, groundingConfidence: 0, keep: [] };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
