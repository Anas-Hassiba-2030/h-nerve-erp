// Tests for the Phase RAG-3 pure helpers: shaping retrieved documents into
// agent/narrator context, and merging the top document in as voice evidence.

import { describe, it, expect } from "vitest";
import { docHitsToContext, type DocHit } from "./documents.retrieve";
import { withDocumentEvidence } from "./agents/base";

const HIT: DocHit = {
  documentId: "d1",
  title: "عقد توريد المها",
  titleEn: "Maha supply contract",
  kind: "contract",
  score: 0.42,
  snippet: { text: "تُسترجَع الدفعات قرب انتهاء الصلاحية", textEn: "Near-expiry batches are returned", kind: "info" },
};

describe("docHitsToContext", () => {
  it("returns [] for no hits", () => {
    expect(docHitsToContext([])).toEqual([]);
  });

  it("assigns stable doc refs and prefers Arabic by default", () => {
    const ctx = docHitsToContext([HIT, { ...HIT, documentId: "d2" }]);
    expect(ctx.map((c) => c.ref)).toEqual(["doc1", "doc2"]);
    expect(ctx[0].title).toBe("عقد توريد المها");
    expect(ctx[0].snippet).toBe("تُسترجَع الدفعات قرب انتهاء الصلاحية");
    expect(ctx[0].kind).toBe("contract");
  });

  it("uses English title/snippet when locale is en", () => {
    const ctx = docHitsToContext([HIT], "en");
    expect(ctx[0].title).toBe("Maha supply contract");
    expect(ctx[0].snippet).toBe("Near-expiry batches are returned");
  });

  it("drops a hit with neither title nor snippet", () => {
    const empty: DocHit = { documentId: "x", title: "", kind: "other", score: 0.1, snippet: null };
    expect(docHitsToContext([empty])).toEqual([]);
  });

  it("truncates long snippets to 240 chars", () => {
    const long = "x".repeat(500);
    const ctx = docHitsToContext([{ ...HIT, snippet: { text: long, kind: "info" } }]);
    expect(ctx[0].snippet.length).toBe(240);
  });
});

describe("withDocumentEvidence", () => {
  const docs = docHitsToContext([HIT], "en");

  it("returns the base evidence unchanged when there are no documents", () => {
    const ev = [{ ref: "m1", label: "metric", weight: 0.9 }];
    expect(withDocumentEvidence(ev, undefined)).toEqual(ev);
    expect(withDocumentEvidence(ev, [])).toEqual(ev);
  });

  it("appends the top document as an evidence item", () => {
    const ev = [{ ref: "m1", label: "metric", weight: 0.9 }];
    const merged = withDocumentEvidence(ev, docs);
    expect(merged).toHaveLength(2);
    expect(merged[1].ref).toBe("doc1");
    expect(merged[1].label).toContain("Maha supply contract");
  });

  it("never exceeds 3 evidence items", () => {
    const ev = [
      { ref: "m1", label: "a", weight: 0.9 },
      { ref: "m2", label: "b", weight: 0.8 },
      { ref: "m3", label: "c", weight: 0.7 },
    ];
    expect(withDocumentEvidence(ev, docs)).toHaveLength(3);
  });

  it("does not duplicate an already-cited doc ref", () => {
    const ev = [{ ref: "doc1", label: "already cited", weight: 0.6 }];
    const merged = withDocumentEvidence(ev, docs);
    expect(merged.filter((e) => e.ref === "doc1")).toHaveLength(1);
  });

  it("handles non-array evidence defensively", () => {
    const merged = withDocumentEvidence(undefined as any, docs);
    expect(merged).toHaveLength(1);
    expect(merged[0].ref).toBe("doc1");
  });
});
