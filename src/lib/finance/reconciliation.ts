// Bank reconciliation matcher (docs/HOURANI-ERP-GAPS.md #1 🔴). Pure —
// no DB/Prisma imports — matches BankStatementLine rows against
// candidate Payment (money in) / SupplierPayment (money out) rows the
// caller has already queried for the statement's treasury. This engine
// NEVER creates a Payment: it only proposes a link between a statement
// line and a payment that already exists, so the ledger stays the one
// source of truth.
//
// Direction is inferred from the line's signed amount: positive
// (deposit) matches PAYMENT candidates, negative (withdrawal) matches
// SUPPLIER_PAYMENT candidates. Money must match exactly (bank fees are a
// separate line on a real statement, not a rounding fudge); the date
// window and the reference/description overlap are what disambiguate
// between several same-amount candidates.

export type CandidateKind = "PAYMENT" | "SUPPLIER_PAYMENT";

export interface StatementLineInput {
  id: string;
  date: Date;
  description: string;
  reference: string | null;
  /** Signed: positive = deposit, negative = withdrawal. */
  amount: number;
}

export interface PaymentCandidate {
  id: string;
  kind: CandidateKind;
  date: Date;
  /** Always a positive magnitude — Payment/SupplierPayment.amount. */
  amount: number;
  number: string;
  note: string | null;
}

export interface MatchResult {
  lineId: string;
  candidateId: string | null;
  candidateKind: CandidateKind | null;
  confidence: "HIGH" | "MED" | "AMBIGUOUS" | "NONE";
  /** Other same-scoring candidates when confidence is AMBIGUOUS. */
  alternates: string[];
}

const AMOUNT_EPSILON = 0.005;
const DEFAULT_WINDOW_DAYS = 5;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "");
}

/** True when the line's reference or description contains the candidate's
 * document number, or vice versa — catches "PAY-000042" appearing inside
 * a bank description like "TRF REF PAY-000042 CUSTOMER XYZ". */
function referenceHits(line: StatementLineInput, candidate: PaymentCandidate): boolean {
  const needle = normalize(candidate.number);
  if (!needle) return false;
  const haystacks = [line.reference, line.description].filter(Boolean).map((s) => normalize(s as string));
  return haystacks.some((h) => h.includes(needle) || (needle.length > 0 && needle.includes(h) && h.length >= 4));
}

interface Scored {
  candidate: PaymentCandidate;
  dayDiff: number;
  refHit: boolean;
}

function scoreCandidates(
  line: StatementLineInput,
  candidates: PaymentCandidate[],
  windowDays: number,
): Scored[] {
  const wantKind: CandidateKind = line.amount >= 0 ? "PAYMENT" : "SUPPLIER_PAYMENT";
  const magnitude = Math.abs(line.amount);

  return candidates
    .filter((c) => c.kind === wantKind)
    .filter((c) => Math.abs(c.amount - magnitude) <= AMOUNT_EPSILON)
    .map((c) => ({ candidate: c, dayDiff: daysBetween(line.date, c.date), refHit: referenceHits(line, c) }))
    .filter((s) => s.dayDiff <= windowDays);
}

/** Rank: reference hit first, then closest date. Returns candidates in
 * best-first order so ties are detectable by comparing the top two. */
function rank(scored: Scored[]): Scored[] {
  return [...scored].sort((a, b) => {
    if (a.refHit !== b.refHit) return a.refHit ? -1 : 1;
    return a.dayDiff - b.dayDiff;
  });
}

export function matchLine(
  line: StatementLineInput,
  candidates: PaymentCandidate[],
  windowDays: number = DEFAULT_WINDOW_DAYS,
): MatchResult {
  const scored = scoreCandidates(line, candidates, windowDays);
  if (scored.length === 0) {
    return { lineId: line.id, candidateId: null, candidateKind: null, confidence: "NONE", alternates: [] };
  }

  const ranked = rank(scored);
  const best = ranked[0];
  const runnerUp = ranked[1];

  // A tie is two candidates with the same refHit and the same day-diff
  // (within rounding) — genuinely ambiguous, don't guess.
  const isTie = !!runnerUp && runnerUp.refHit === best.refHit && Math.abs(runnerUp.dayDiff - best.dayDiff) < 0.001;
  if (isTie) {
    return {
      lineId: line.id,
      candidateId: null,
      candidateKind: null,
      confidence: "AMBIGUOUS",
      alternates: ranked.filter((s) => s.refHit === best.refHit && Math.abs(s.dayDiff - best.dayDiff) < 0.001).map((s) => s.candidate.id),
    };
  }

  const confidence = best.refHit || best.dayDiff <= 1 ? "HIGH" : "MED";
  return {
    lineId: line.id,
    candidateId: best.candidate.id,
    candidateKind: best.candidate.kind,
    confidence,
    alternates: [],
  };
}

/** Greedy auto-match across a whole statement: processes lines in the
 * order given and removes a candidate from the pool once it's claimed,
 * so two lines can never be proposed the same payment in one run (the
 * DB's @unique matchedPaymentId would reject the second write anyway —
 * this just keeps the SUGGESTIONS internally consistent too). */
export function autoMatchStatement(
  lines: StatementLineInput[],
  candidates: PaymentCandidate[],
  windowDays: number = DEFAULT_WINDOW_DAYS,
): MatchResult[] {
  const pool = [...candidates];
  const results: MatchResult[] = [];

  for (const line of lines) {
    const result = matchLine(line, pool, windowDays);
    results.push(result);
    if (result.candidateId) {
      const idx = pool.findIndex((c) => c.id === result.candidateId);
      if (idx >= 0) pool.splice(idx, 1);
    }
  }

  return results;
}
