// lib/docintel/match.ts — Phase NS-8, Document → Graph entity matching.
//
// Pure + DB-free: given the names a parser extracted from a document
// (vendor, parties, …) and a list of candidate entities (the tenant's
// Supplier/Customer rows), find the best name match. No API, no Prisma —
// cheap and unit-testable. The /documents upload action calls this to
// auto-link a freshly-parsed document to a Supplier or Customer.
//
// Matching is bilingual-aware: Arabic diacritics + alef/ya/ta-marbuta
// variants are normalized, and common company suffixes (Ltd, B.V., شركة…)
// are dropped before comparison so "MENA Pack Ltd." matches "MENA Pack".

// NOTE: Arabic entries are stored in their POST-normalization form — the
// ta-marbuta fold (ة→ه) in normalizeName() runs before this filter, so the
// suffix tokens must already be folded (شركه, not شركة) to be dropped.
const COMPANY_SUFFIXES = new Set([
  // English / Latin
  "ltd", "llc", "inc", "co", "corp", "company", "gmbh", "bv", "plc",
  "sa", "limited", "holdings", "group", "intl", "international",
  // Arabic (folded)
  "شركه", "مؤسسه", "المحدوده", "للتجاره", "للصناعه", "القابضه", "ومشاركوه",
]);

/** Normalize a name for comparison: lowercase, de-diacritic, de-suffix. */
export function normalizeName(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().trim();
  // Strip Arabic tashkeel (diacritics).
  s = s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, "");
  // Fold alef/ya/ta-marbuta variants.
  s = s.replace(/[إأآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  // Punctuation → space.
  s = s.replace(/[._,\-/\\()«»"'’`&]/g, " ");
  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();
  // Drop company-suffix tokens and bare single-char initials ("B.V."→"b v").
  const toks = s.split(" ").filter((t) => t.length > 1 && !COMPANY_SUFFIXES.has(t));
  return toks.join(" ");
}

export function tokenize(name: string): string[] {
  const n = normalizeName(name);
  return n ? n.split(" ").filter(Boolean) : [];
}

/**
 * Similarity 0..1 between two entity names. Exact (normalized) equality
 * scores 1; otherwise the max of token Jaccard and containment (so a short
 * candidate fully contained in a longer extracted name still scores high).
 */
export function scoreMatch(a: string, b: string): number {
  if (normalizeName(a) === normalizeName(b) && normalizeName(a) !== "") return 1;
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  if (inter === 0) return 0;
  const union = ta.size + tb.size - inter;
  const jaccard = inter / union;
  const containment = inter / Math.min(ta.size, tb.size);
  return Math.max(jaccard, containment * 0.95);
}

export type Candidate = { id: string; name: string };
export type Match = { id: string; name: string; score: number };

/** Best candidate at or above `threshold`, or null. */
export function matchEntity(
  query: string,
  candidates: Candidate[],
  threshold = 0.5,
): Match | null {
  let best: Match | null = null;
  for (const c of candidates) {
    const score = scoreMatch(query, c.name);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: c.id, name: c.name, score };
    }
  }
  return best;
}

/** Candidate entity names lifted out of a parser's `fields` dictionary. */
export function extractEntityNames(
  fields: Record<string, unknown> | null | undefined,
): string[] {
  if (!fields || typeof fields !== "object") return [];
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  };
  push(fields.vendor);
  push(fields.supplier);
  push(fields.customer);
  push(fields.lab);
  if (Array.isArray(fields.parties)) fields.parties.forEach(push);
  if (Array.isArray(fields.counterparties)) fields.counterparties.forEach(push);
  return Array.from(new Set(out));
}

/**
 * Best Supplier + Customer match across every name extracted from a
 * parsed document. Returns the highest-scoring match per side (or null).
 */
export function matchDocumentEntities(
  fields: Record<string, unknown> | null | undefined,
  suppliers: Candidate[],
  customers: Candidate[],
  threshold = 0.5,
): { supplier: Match | null; customer: Match | null } {
  const names = extractEntityNames(fields);
  let supplier: Match | null = null;
  let customer: Match | null = null;
  for (const name of names) {
    const s = matchEntity(name, suppliers, threshold);
    if (s && (!supplier || s.score > supplier.score)) supplier = s;
    const c = matchEntity(name, customers, threshold);
    if (c && (!customer || c.score > customer.score)) customer = c;
  }
  return { supplier, customer };
}
