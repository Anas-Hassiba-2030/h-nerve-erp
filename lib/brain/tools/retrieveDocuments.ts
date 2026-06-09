// lib/brain/tools/retrieveDocuments.ts
import { z } from "zod";
import { retrieveDocuments } from "../documents.retrieve";
import { evaluateRetrieval } from "../crag";
import { sanitizeForPrompt } from "../ragGuard";
import type { BrainTool } from "./types";

export const retrieveDocumentsInput = z.object({
  query: z.string().min(1),
  scope: z.string().optional(),
  k: z.number().int().positive().max(10).optional(),
  locale: z.enum(["ar", "en"]).optional(),
});
export type RetrieveDocumentsInput = z.infer<typeof retrieveDocumentsInput>;

export const retrieveDocumentsTool: BrainTool<
  RetrieveDocumentsInput,
  {
    quality: "correct" | "ambiguous" | "incorrect";
    groundingConfidence: number;
    documents: Array<{ documentId: string; title: string; kind: string; score: number; snippet: string }>;
  }
> = {
  name: "retrieveDocuments",
  description:
    "Semantic search over the tenant's uploaded documents (contracts, invoices, reports). Returns graded, prompt-sanitized snippets; Corrective-RAG drops irrelevant hits. Cite these for any document-grounded claim.",
  inputSchema: retrieveDocumentsInput,
  run: async (input) => {
    const hits = await retrieveDocuments(input.query, { scope: input.scope, k: input.k ?? 3, locale: input.locale });
    const verdict = evaluateRetrieval(hits);
    return {
      quality: verdict.quality,
      groundingConfidence: verdict.groundingConfidence,
      documents: verdict.keep.map((h) => ({
        documentId: h.documentId,
        // Title is user-controllable (derived from the uploaded filename /
        // extraction) and reaches the model + the citation chip, so it must
        // pass ragGuard too — not just the snippet. Mirrors docHitsToContext.
        title: sanitizeForPrompt(h.title ?? "", 120).text,
        kind: h.kind,
        score: h.score,
        snippet: sanitizeForPrompt(h.snippet?.text ?? "", 280).text,
      })),
    };
  },
};
