// lib/brain/tools/retrieveDocuments.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../documents.retrieve", () => ({
  retrieveDocuments: vi.fn(async () => [
    { documentId: "d1", title: "عقد", titleEn: "Lease", kind: "CONTRACT", score: 0.9, snippet: { text: "بند الإيجار", kind: "CLAUSE" } },
  ]),
}));
vi.mock("../crag", () => ({
  evaluateRetrieval: vi.fn((hits) => ({ quality: "correct", action: "use", topScore: 0.9, margin: 0.4, groundingConfidence: 0.95, keep: hits })),
}));
vi.mock("../ragGuard", () => ({ sanitizeForPrompt: vi.fn((t: string) => ({ text: t, flagged: false })) }));

import { retrieveDocumentsTool, retrieveDocumentsInput } from "./retrieveDocuments";

describe("retrieveDocuments tool", () => {
  it("requires a query", () => {
    expect(retrieveDocumentsInput.safeParse({ query: "" }).success).toBe(false);
  });
  it("returns CRAG-graded, sanitized documents", async () => {
    const out = await retrieveDocumentsTool.run({ query: "rent clause" });
    expect(out.quality).toBe("correct");
    expect(out.documents[0]).toMatchObject({ documentId: "d1", title: "عقد", snippet: "بند الإيجار" });
  });
});
