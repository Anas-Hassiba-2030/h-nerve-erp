// Tests for the RAG-2 retrieval core. Pure — uses the local embedder.

import { describe, it, expect } from "vitest";
import { rankByRelevance } from "./retriever";

const DOCS = [
  { id: "lease", text: "Arena Sofia hotel lease agreement: annual rent, renewal terms, occupancy clauses" },
  { id: "dairy", text: "Maha dairy supply contract: cheese volumes, cold-chain, expiry handling, margins" },
  { id: "farm", text: "Loran greenhouse irrigation manual: soil moisture thresholds and sensor calibration" },
  { id: "hr", text: "Employee handbook: leave policy, payroll schedule, performance reviews" },
];

describe("rankByRelevance", () => {
  it("returns [] for empty query or empty items", async () => {
    expect(await rankByRelevance("", DOCS)).toEqual([]);
    expect(await rankByRelevance("hotel", [])).toEqual([]);
  });

  it("ranks the most relevant document first", async () => {
    const hits = await rankByRelevance("hotel occupancy and rent renewal at Arena", DOCS, { k: 4, minScore: 0 });
    expect(hits[0].id).toBe("lease");
  });

  it("surfaces the dairy contract for a cheese/expiry query", async () => {
    const hits = await rankByRelevance("cheese cold chain and expiry handling", DOCS, { k: 4, minScore: 0 });
    expect(hits[0].id).toBe("dairy");
  });

  it("respects k (caps the number of hits)", async () => {
    const hits = await rankByRelevance("policy contract terms", DOCS, { k: 2, minScore: 0 });
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("attaches a numeric score and preserves item fields/meta", async () => {
    const items = DOCS.map((d) => ({ ...d, meta: { src: "test" } }));
    const hits = await rankByRelevance("greenhouse soil moisture sensor", items, { k: 1, minScore: 0 });
    expect(hits[0].id).toBe("farm");
    expect(typeof hits[0].score).toBe("number");
    expect(hits[0].meta).toEqual({ src: "test" });
  });

  it("sorts strictly descending by score", async () => {
    const hits = await rankByRelevance("dairy cheese margins", DOCS, { k: 4, minScore: 0 });
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });
});
