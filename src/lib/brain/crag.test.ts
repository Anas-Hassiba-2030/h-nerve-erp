// Tests for the Phase RAG-5 Corrective RAG retrieval evaluator. Pure.

import { describe, it, expect } from "vitest";
import { evaluateRetrieval } from "./crag";

const hit = (id: string, score: number) => ({ id, score });

describe("evaluateRetrieval", () => {
  it("grades an empty retrieval as incorrect → drop, zero grounding", () => {
    const v = evaluateRetrieval([]);
    expect(v.quality).toBe("incorrect");
    expect(v.action).toBe("drop");
    expect(v.groundingConfidence).toBe(0);
    expect(v.keep).toEqual([]);
  });

  it("grades a strong top score as correct → use, full grounding", () => {
    const v = evaluateRetrieval([hit("a", 0.32), hit("b", 0.14), hit("c", 0.04)]);
    expect(v.quality).toBe("correct");
    expect(v.action).toBe("use");
    expect(v.groundingConfidence).toBe(1);
    // keeps hits ≥ ambiguousAt (0.10); drops the 0.04.
    expect(v.keep.map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("grades a mid score as ambiguous → blend, reduced grounding", () => {
    const v = evaluateRetrieval([hit("a", 0.13), hit("b", 0.11), hit("c", 0.09)]);
    expect(v.quality).toBe("ambiguous");
    expect(v.action).toBe("blend");
    expect(v.groundingConfidence).toBeGreaterThan(0.5);
    expect(v.groundingConfidence).toBeLessThan(0.8);
    expect(v.keep.length).toBe(2); // ambiguousKeep default
  });

  it("grades a weak top score as incorrect → drop", () => {
    const v = evaluateRetrieval([hit("a", 0.07), hit("b", 0.05)]);
    expect(v.quality).toBe("incorrect");
    expect(v.action).toBe("drop");
    expect(v.keep).toEqual([]);
  });

  it("reads the max defensively even if hits are unsorted", () => {
    const v = evaluateRetrieval([hit("low", 0.05), hit("high", 0.4)]);
    expect(v.quality).toBe("correct");
    expect(v.topScore).toBe(0.4);
    expect(v.keep[0].id).toBe("high");
  });

  it("respects custom thresholds", () => {
    const v = evaluateRetrieval([hit("a", 0.5)], { correctAt: 0.6, ambiguousAt: 0.4 });
    expect(v.quality).toBe("ambiguous");
  });

  it("ambiguous grounding rises toward the correct boundary", () => {
    const near = evaluateRetrieval([hit("a", 0.179)]).groundingConfidence;
    const far = evaluateRetrieval([hit("a", 0.101)]).groundingConfidence;
    expect(near).toBeGreaterThan(far);
  });

  it("reports the top/second margin", () => {
    expect(evaluateRetrieval([hit("a", 0.32), hit("b", 0.14)]).margin).toBeCloseTo(0.18, 5);
    // lone hit: gap over an empty field == its own score
    expect(evaluateRetrieval([hit("a", 0.13)]).margin).toBeCloseTo(0.13, 5);
    expect(evaluateRetrieval([]).margin).toBe(0);
  });

  it("a dominant top hit reads warmer than a flat field at the same top score", () => {
    // same topScore (0.14), same threshold fraction — only the margin differs.
    const dominant = evaluateRetrieval([hit("a", 0.14), hit("b", 0.1)]);
    const flat = evaluateRetrieval([hit("a", 0.14), hit("b", 0.135)]);
    expect(dominant.quality).toBe("ambiguous");
    expect(flat.quality).toBe("ambiguous");
    expect(dominant.groundingConfidence).toBeGreaterThan(flat.groundingConfidence);
    // both still bounded within the ambiguous band
    expect(flat.groundingConfidence).toBeGreaterThan(0.5);
    expect(dominant.groundingConfidence).toBeLessThan(0.8);
  });
});
