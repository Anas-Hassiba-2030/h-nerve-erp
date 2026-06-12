// Unit tests for the brain's recall vectorizer (Phase 6 memory lake).
// These are the pure bag-of-words TF + cosine functions that decide which
// past situations the council/brain recalls as analogous. No DB, no I/O.

import { describe, it, expect } from "vitest";
import { vectorize, cosine, serialize, deserialize } from "./memory.live";

describe("memory vectorizer — vectorize()", () => {
  it("returns an empty map for empty / stopword-only text", () => {
    expect(vectorize("").size).toBe(0);
    expect(vectorize("the and of to in on").size).toBe(0);
  });

  it("L2-normalizes: the vector's magnitude is 1 for non-empty text", () => {
    const v = vectorize("Arena occupancy dropped sharply in March");
    let sumSq = 0;
    for (const w of v.values()) sumSq += w * w;
    expect(Math.sqrt(sumSq)).toBeCloseTo(1, 5);
  });

  it("drops short tokens and stopwords", () => {
    const v = vectorize("the dairy a is margin");
    // "the","a","is" are stopwords; single-char dropped — only dairy, margin remain
    expect([...v.keys()].sort()).toEqual(["dairy", "margin"]);
  });

  it("applies sublinear TF (repetition is dampened, not linear)", () => {
    // A term repeated 4x should not get 4x the weight of a 1x term in the
    // same doc — sublinear 1+log2(c) curve. Compare pre-normalization ratio.
    const v = vectorize("margin margin margin margin occupancy");
    const margin = v.get("margin")!;
    const occ = v.get("occupancy")!;
    // raw weights: margin = 1+log2(4)=3, occupancy = 1 → ratio 3, far below 4
    expect(margin / occ).toBeCloseTo(3, 5);
  });
});

describe("memory vectorizer — cosine()", () => {
  it("identical text scores ~1.0", () => {
    const a = vectorize("Maha cheese production ramp for Q3 conferences");
    const b = vectorize("Maha cheese production ramp for Q3 conferences");
    expect(cosine(a, b)).toBeCloseTo(1, 5);
  });

  it("disjoint vocabularies score 0", () => {
    const a = vectorize("hotel occupancy booking revenue");
    const b = vectorize("greenhouse moisture irrigation crop");
    expect(cosine(a, b)).toBe(0);
  });

  it("partial overlap scores strictly between 0 and 1", () => {
    const a = vectorize("dairy margin expiry waste risk");
    const b = vectorize("dairy margin double production capacity");
    const sim = cosine(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("is symmetric", () => {
    const a = vectorize("loran feed orders shrink");
    const b = vectorize("feed orders rise at loran farm");
    expect(cosine(a, b)).toBeCloseTo(cosine(b, a), 10);
  });
});

describe("memory vectorizer — serialize() / deserialize() round-trip", () => {
  it("round-trips a vector with preserved similarity", () => {
    const v = vectorize("Arena Sofia occupancy forecast drop next month");
    const restored = deserialize(serialize(v));
    // same terms
    expect([...restored.keys()].sort()).toEqual([...v.keys()].sort());
    // cosine of original vs restored is ~1 (weights preserved to 6 dp)
    expect(cosine(v, restored)).toBeCloseTo(1, 4);
  });

  it("deserialize tolerates empty / malformed input", () => {
    expect(deserialize("").size).toBe(0);
    expect(deserialize("not json").size).toBe(0);
    expect(deserialize("{}").size).toBe(0);
  });
});
