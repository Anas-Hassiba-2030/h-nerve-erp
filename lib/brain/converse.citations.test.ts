// lib/brain/converse.citations.test.ts
import { describe, it, expect } from "vitest";
import { buildCitationsFromToolCalls, reconcileCitations, type Citation } from "./converse";

const chip = (id: string): Citation => ({ id, source: "DOCUMENT", label: id, value: "DOC", href: `/documents/${id}` });

describe("buildCitationsFromToolCalls", () => {
  it("turns retrieveDocuments output into DOCUMENT citations (computed id fallback)", () => {
    const cites = buildCitationsFromToolCalls(
      [{ name: "retrieveDocuments", output: { documents: [{ documentId: "d1", title: "Lease", kind: "CONTRACT" }] } }],
      0,
    );
    expect(cites).toEqual([{ id: "c1", source: "DOCUMENT", label: "Lease", value: "CONTRACT", href: "/documents/d1" }]);
  });

  it("uses the loop-assigned citationId when present (aligns with the model's [cN] markers)", () => {
    const cites = buildCitationsFromToolCalls(
      [
        { name: "retrieveDocuments", output: { documents: [{ documentId: "d1", title: "A", kind: "CONTRACT", citationId: "c1" }] } },
        { name: "retrieveDocuments", output: { documents: [{ documentId: "d2", title: "B", kind: "INVOICE", citationId: "c2" }] } },
      ],
      0,
    );
    expect(cites.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(cites[1].href).toBe("/documents/d2");
  });

  it("ignores non-document tool calls", () => {
    expect(buildCitationsFromToolCalls([{ name: "pullFacts", output: {} }], 0)).toEqual([]);
  });
});

describe("reconcileCitations", () => {
  it("drops a chip the answer never references (no orphan chip)", () => {
    const { citations } = reconcileCitations("Occupancy is up [c1].", [chip("c1"), chip("c2")]);
    expect(citations.map((c) => c.id)).toEqual(["c1"]);
  });

  it("strips an orphan marker the model hallucinated (no chip to land on)", () => {
    const { text, citations } = reconcileCitations("Revenue rose [c1] sharply [c9].", [chip("c1")]);
    expect(text).toBe("Revenue rose [c1] sharply.");
    expect(citations.map((c) => c.id)).toEqual(["c1"]);
  });

  it("keeps a clean answer untouched", () => {
    const { text, citations } = reconcileCitations("A [c1] and B [c2].", [chip("c1"), chip("c2")]);
    expect(text).toBe("A [c1] and B [c2].");
    expect(citations).toHaveLength(2);
  });

  it("safety valve: keeps all chips when the answer has no parseable markers", () => {
    const { text, citations } = reconcileCitations("Answer with no markers at all.", [chip("c1"), chip("c2")]);
    expect(text).toBe("Answer with no markers at all.");
    expect(citations).toHaveLength(2); // not nuked to empty
  });

  it("tidies the space before an Arabic question mark ؟ after stripping an orphan marker", () => {
    const { text } = reconcileCitations("هل الإشغال مرتفع [c9]؟ نعم [c1].", [chip("c1")]);
    expect(text).toBe("هل الإشغال مرتفع؟ نعم [c1].");
  });
});
