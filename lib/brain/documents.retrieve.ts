// lib/brain/documents.retrieve.ts — Phase RAG-2: DB-backed document retrieval.
//
// The "retrieve" stage of retrieve-augment-generate for the tenant's uploaded
// documents (contracts, invoices, lab reports). Loads READY, non-deleted
// Documents (optionally scope-filtered), flattens each into a single text
// blob — title + summary + extraction headline + every clause quote/note —
// and ranks them against the query with the pure embedder core in
// ./retriever (rankByRelevance). Returns lightweight hits carrying provenance
// (documentId, title, kind) and the single best-matching snippet, so the
// narrator/council can cite a real clause rather than hallucinate one.
//
// Read-only: this never mutates. It respects the brain's read-mostly boundary.
// Uses the scoped `prisma` client, so it stays tenant-safe by default.

import { prisma } from "@/lib/db";
import { rankByRelevance, type RetrievalHit } from "./retriever";
import { getEmbedder, cosineSim } from "./embeddings";
import { sanitizeForPrompt } from "./ragGuard";

export type DocSnippet = {
  /** Verbatim quote (or summary line) most relevant to the query. */
  text: string;
  textEn?: string;
  kind: string;
  severity?: string;
};

export type DocHit = {
  documentId: string;
  title: string;
  titleEn?: string;
  kind: string;
  /** Whole-document relevance score (0..1 cosine). */
  score: number;
  /** The single most relevant snippet within the document. */
  snippet: DocSnippet | null;
};

/** Compact, prompt-ready shape handed to council agents / narrator. */
export type DocContext = {
  /** Citation tag the model can reference, e.g. "doc1". */
  ref: string;
  title: string;
  kind: string;
  snippet: string;
};

/**
 * Turn ranked document hits into a compact, locale-aware context list for
 * prompting (council agents, narrator). Pure — no DB, no network — so it
 * unit-tests directly. Drops hits with no usable snippet/title.
 */
export function docHitsToContext(hits: DocHit[], locale: "ar" | "en" = "ar"): DocContext[] {
  const out: DocContext[] = [];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const title = (locale === "en" ? h.titleEn || h.title : h.title) || h.titleEn || "";
    const snippet =
      (locale === "en" ? h.snippet?.textEn || h.snippet?.text : h.snippet?.text) ||
      h.snippet?.textEn ||
      "";
    if (!title && !snippet) continue;
    // Phase RAG-7 — neutralize any prompt-injection markers in the
    // user-uploaded snippet before it becomes LLM/agent prompt context.
    const safe = sanitizeForPrompt(snippet, 240);
    out.push({ ref: `doc${i + 1}`, title: sanitizeForPrompt(title, 120).text, kind: h.kind, snippet: safe.text });
  }
  return out;
}

export type DocRetrieveOptions = {
  /** Restrict to one document scope (company/module). Omit for all in-tenant. */
  scope?: string;
  /** Max documents to return (default 4). */
  k?: number;
  /** Drop documents below this cosine score (default 0.06). */
  minScore?: number;
  /** Cap how many documents we pull from the DB before ranking (default 200). */
  maxCandidates?: number;
  /** Query language — selects the clause text snippet selection scores against (default "ar"). */
  locale?: "ar" | "en";
};

type LoadedDoc = {
  id: string;
  title: string | null;
  titleEn: string | null;
  summary: string | null;
  summaryEn: string | null;
  kind: string;
  extraction: { headline: string | null; headlineEn: string | null } | null;
  clauses: {
    quote: string;
    quoteEn: string | null;
    note: string | null;
    noteEn: string | null;
    kind: string;
    severity: string;
  }[];
};

/** Flatten a document into one searchable text blob (title + summary + clauses). */
function docToText(d: LoadedDoc): string {
  const parts: string[] = [];
  if (d.title) parts.push(d.title);
  if (d.titleEn) parts.push(d.titleEn);
  if (d.summary) parts.push(d.summary);
  if (d.summaryEn) parts.push(d.summaryEn);
  if (d.extraction?.headline) parts.push(d.extraction.headline);
  if (d.extraction?.headlineEn) parts.push(d.extraction.headlineEn);
  for (const c of d.clauses) {
    if (c.quote) parts.push(c.quote);
    if (c.quoteEn) parts.push(c.quoteEn);
    if (c.note) parts.push(c.note);
    if (c.noteEn) parts.push(c.noteEn);
  }
  return parts.join(" \n ");
}

/**
 * Within a matched document, pick the single clause/summary line most similar
 * to the query. Falls back to the summary, then the title. Keeps citations
 * pointed at a concrete sentence rather than the whole blob.
 */
async function bestSnippet(
  d: LoadedDoc,
  qVec: number[],
  locale: "ar" | "en",
): Promise<DocSnippet | null> {
  const candidates: DocSnippet[] = [];
  for (const c of d.clauses) {
    if (c.quote) {
      candidates.push({ text: c.quote, textEn: c.quoteEn ?? undefined, kind: c.kind, severity: c.severity });
    }
  }
  if (d.summary) candidates.push({ text: d.summary, textEn: d.summaryEn ?? undefined, kind: "summary" });
  if (candidates.length === 0) {
    if (d.title) return { text: d.title, textEn: d.titleEn ?? undefined, kind: "title" };
    return null;
  }
  // Score against the query in the query's own language: an English query
  // matches the English clause text far better than its Arabic original.
  const scoringText = (c: DocSnippet) =>
    locale === "en" ? c.textEn || c.text : c.text;
  const vecs = await getEmbedder().embed(candidates.map(scoringText));
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const s = cosineSim(qVec, vecs[i] ?? []);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return candidates[best];
}

/**
 * Retrieve the most relevant uploaded documents for a free-text query.
 * Returns ranked hits with provenance and a best snippet each. Empty query,
 * no documents, or a zero query vector → []. Never throws on a DB miss; a
 * retrieval failure degrades to "no documents" so the narrator still answers.
 */
export async function retrieveDocuments(
  query: string,
  opts: DocRetrieveOptions = {},
): Promise<DocHit[]> {
  const k = Math.max(1, opts.k ?? 4);
  const minScore = opts.minScore ?? 0.06;
  const maxCandidates = Math.max(1, opts.maxCandidates ?? 200);
  const locale = opts.locale ?? "ar";
  if (!query.trim()) return [];

  let docs: LoadedDoc[];
  try {
    docs = await prisma.document.findMany({
      where: {
        deletedAt: null,
        status: "READY",
        ...(opts.scope ? { scope: opts.scope } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: maxCandidates,
      select: {
        id: true,
        title: true,
        titleEn: true,
        summary: true,
        summaryEn: true,
        kind: true,
        extraction: { select: { headline: true, headlineEn: true } },
        clauses: {
          orderBy: { orderIndex: "asc" },
          select: { quote: true, quoteEn: true, note: true, noteEn: true, kind: true, severity: true },
        },
      },
    });
  } catch {
    return [];
  }
  if (docs.length === 0) return [];

  const items = docs.map((d) => ({ id: d.id, text: docToText(d), meta: { doc: d } }));
  const ranked: RetrievalHit<(typeof items)[number]>[] = await rankByRelevance(query, items, { k, minScore });
  if (ranked.length === 0) return [];

  // Re-embed the query once for snippet selection (cheap; one call).
  const [qVec] = await getEmbedder().embed([query]);

  const hits: DocHit[] = [];
  for (const r of ranked) {
    const d = r.meta!.doc as LoadedDoc;
    const snippet = qVec ? await bestSnippet(d, qVec, locale) : null;
    hits.push({
      documentId: d.id,
      title: d.title ?? d.titleEn ?? "(untitled)",
      titleEn: d.titleEn ?? undefined,
      kind: d.kind,
      score: r.score,
      snippet,
    });
  }
  return hits;
}
