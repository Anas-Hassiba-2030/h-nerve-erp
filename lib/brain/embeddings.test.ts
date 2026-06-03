// Tests for the RAG embedding seam (Phase RAG-1).
// The local embedder must be deterministic, dense, L2-normalized, and
// cosine-comparable — the contract the real provider will also satisfy.

import { describe, it, expect } from "vitest";
import {
  localEmbed,
  localEmbedder,
  cosineSim,
  getEmbedder,
  EMBED_DIM,
} from "./embeddings";

describe("localEmbed", () => {
  it(`produces a vector of EMBED_DIM (${EMBED_DIM})`, () => {
    expect(localEmbed("Maha cheese production").length).toBe(EMBED_DIM);
  });

  it("is deterministic — same text, identical vector", () => {
    const a = localEmbed("Arena Sofia occupancy forecast");
    const b = localEmbed("Arena Sofia occupancy forecast");
    expect(a).toEqual(b);
  });

  it("is L2-normalized (magnitude ~1 for non-empty text)", () => {
    const v = localEmbed("dairy margin expiry waste");
    let sumSq = 0;
    for (const x of v) sumSq += x * x;
    expect(Math.sqrt(sumSq)).toBeCloseTo(1, 5);
  });

  it("empty / stopword-only text → zero vector", () => {
    const v = localEmbed("the of and في من");
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("cosineSim", () => {
  it("identical text → ~1.0", () => {
    const a = localEmbed("ramp Maha cheese for Q3 conferences");
    const b = localEmbed("ramp Maha cheese for Q3 conferences");
    expect(cosineSim(a, b)).toBeCloseTo(1, 5);
  });

  it("related text scores higher than unrelated text", () => {
    const q = localEmbed("hotel occupancy dropped at Arena");
    const related = localEmbed("Arena hotel occupancy fell sharply this month");
    const unrelated = localEmbed("greenhouse irrigation moisture sensor reading");
    expect(cosineSim(q, related)).toBeGreaterThan(cosineSim(q, unrelated));
  });

  it("is symmetric", () => {
    const a = localEmbed("loran feed orders");
    const b = localEmbed("feed orders at loran farm");
    expect(cosineSim(a, b)).toBeCloseTo(cosineSim(b, a), 10);
  });
});

describe("getEmbedder / localEmbedder contract", () => {
  it("getEmbedder returns an Embedder with the right dim", () => {
    const e = getEmbedder();
    expect(e.dim).toBe(EMBED_DIM);
    expect(typeof e.name).toBe("string");
  });

  it("embed() batches texts into one vector each", async () => {
    const out = await localEmbedder.embed(["first text here", "second text there"]);
    expect(out.length).toBe(2);
    expect(out[0].length).toBe(EMBED_DIM);
    expect(out[1].length).toBe(EMBED_DIM);
  });
});
