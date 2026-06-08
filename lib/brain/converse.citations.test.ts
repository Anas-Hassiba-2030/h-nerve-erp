// lib/brain/converse.citations.test.ts
import { describe, it, expect } from "vitest";
import { buildCitationsFromToolCalls } from "./converse";

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
