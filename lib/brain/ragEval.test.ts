// Tests for the Phase RAG-6 decomposed RAG evaluation (the triad). Pure.

import { describe, it, expect } from "vitest";
import { scoreFaithfulness, scoreAnswerRelevance, evaluateRagTriad } from "./ragEval";

describe("scoreFaithfulness", () => {
  it("scores 1 when every claim appears in the context", () => {
    expect(scoreFaithfulness("Revenue rose to 84,000 JOD.", "annual rent 84,000 JOD term 36 months")).toBe(1);
  });

  it("scores 0 when claims are absent from the context (hallucinated)", () => {
    expect(scoreFaithfulness("Occupancy hit 92% this week.", "the contract covers cold chain handling")).toBe(0);
  });

  it("scores 1 for an answer with no checkable claims", () => {
    expect(scoreFaithfulness("We should review the supplier terms.", "anything")).toBe(1);
  });

  it("is partial when some claims ground and others don't", () => {
    const s = scoreFaithfulness("Rent is 84,000 and occupancy is 92%.", "annual rent 84,000 JOD");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe("scoreAnswerRelevance", () => {
  it("scores high when the answer uses the query's terms", () => {
    const s = scoreAnswerRelevance("dairy expiry handling", "The dairy expiry handling routes near-expiry stock to retail.");
    expect(s).toBe(1);
  });

  it("scores low when the answer ignores the query", () => {
    const s = scoreAnswerRelevance("dairy expiry handling", "Hotel occupancy is strong this quarter.");
    expect(s).toBeLessThan(0.4);
  });

  it("ignores stopwords (scores 1 for a stopword-only query)", () => {
    expect(scoreAnswerRelevance("what is the", "anything at all")).toBe(1);
  });
});

describe("evaluateRagTriad", () => {
  it("rewards a grounded, on-topic answer with a strong context score", () => {
    const t = evaluateRagTriad({
      query: "Maha dairy near-expiry handling",
      answer: "Maha near-expiry dairy batches are routed to retail within 5 days.",
      contextText: "Maha supply contract: batches with less than 5 days of shelf life are routed to retail.",
      contextRelevance: 0.9,
    });
    expect(t.faithfulness).toBe(1);
    expect(t.answerRelevance).toBeGreaterThan(0.6);
    expect(t.contextRelevance).toBe(0.9);
    expect(t.overall).toBeGreaterThan(0.8);
  });

  it("punishes a confident but ungrounded answer via faithfulness", () => {
    const grounded = evaluateRagTriad({
      query: "rent", answer: "Rent is 84,000.", contextText: "annual rent 84,000", contextRelevance: 0.8,
    });
    const ungrounded = evaluateRagTriad({
      query: "rent", answer: "Rent is 120,000.", contextText: "annual rent 84,000", contextRelevance: 0.8,
    });
    expect(ungrounded.faithfulness).toBe(0);
    expect(ungrounded.overall).toBeLessThan(grounded.overall);
  });

  it("falls back to lexical context-relevance when none is provided", () => {
    const t = evaluateRagTriad({
      query: "greenhouse irrigation",
      answer: "Irrigation runs when soil moisture drops.",
      contextText: "greenhouse irrigation cycle and soil moisture thresholds",
    });
    expect(t.contextRelevance).toBeGreaterThan(0);
    expect(t.overall).toBeGreaterThan(0);
    expect(t.overall).toBeLessThanOrEqual(1);
  });
});
