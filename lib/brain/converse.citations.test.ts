// lib/brain/converse.citations.test.ts
import { describe, it, expect } from "vitest";
import { buildCitationsFromToolCalls } from "./converse";

describe("buildCitationsFromToolCalls", () => {
  it("turns retrieveDocuments output into DOCUMENT citations", () => {
    const cites = buildCitationsFromToolCalls(
      [{ name: "retrieveDocuments", output: { documents: [{ documentId: "d1", title: "Lease", kind: "CONTRACT" }] } }],
      0,
    );
    expect(cites).toEqual([{ id: "c1", source: "DOCUMENT", label: "Lease", value: "CONTRACT", href: "/documents/d1" }]);
  });
  it("ignores non-document tool calls", () => {
    expect(buildCitationsFromToolCalls([{ name: "pullFacts", output: {} }], 0)).toEqual([]);
  });
});
