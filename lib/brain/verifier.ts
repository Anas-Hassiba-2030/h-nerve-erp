// verifier.ts — Brain Trustworthiness Layer (Phase 22).
//
// Every claim the Narrator (Phase 4) / Council (Phase 3) / Planner (Phase 5)
// makes is run through this verifier before it reaches an operator. The
// contract is simple:
//
//   A claim is VERIFIED iff the number/entity it mentions appears in the
//   structured `facts` payload that was passed to the writer.
//
// If a claim cannot be traced to the facts, it is downgraded to
// `confidence: "low"` and surfaced with a ⚠ badge. The operator can still
// see the prose, but they know what to trust.
//
// This is pure logic — no I/O, no DB. Deterministic, unit-testable.
// See docs/PHASES-INTELLIGENCE.md § Phase 22.

export type FactClaim = {
  // The verbatim numeric or entity token that appeared in the narrative.
  token: string;
  // Where in the narrative the claim sits (0-based char offset).
  index: number;
  // The shape we extracted: a number, a percentage, or a named entity.
  shape: "number" | "percent" | "currency" | "entity";
};

export type Verification = {
  claim: FactClaim;
  verified: boolean;
  // Which fact in the payload matched — undefined when the claim is unverified.
  matchedKey?: string;
  matchedValue?: number | string;
};

export type VerificationReport = {
  total: number;
  verified: number;
  unverified: number;
  // 0..1 — fraction of claims that matched the facts.
  coverage: number;
  // The granular per-claim breakdown (drives the UI badge tooltip).
  claims: Verification[];
  // Computed downstream confidence label.
  trustLevel: "high" | "medium" | "low";
};

// Tolerance for numeric matches. Narrator rounds numbers (49,822 → 49,800),
// so we accept a ±2% delta plus a fixed ±1 unit floor for very small values.
const NUMERIC_TOLERANCE_PCT = 0.02;
const NUMERIC_TOLERANCE_ABS = 1;

/**
 * Extract every numeric/entity claim from a narrative paragraph.
 * The goal is to find every assertion that *could* be wrong.
 */
export function extractClaims(narrative: string): FactClaim[] {
  const claims: FactClaim[] = [];

  // Pattern: numbers with optional comma separators and decimals.
  // Captures: "49,822", "49822", "3.4", "0.21", "1,400.5"
  const numberRe = /(?<![A-Za-z])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![A-Za-z])/g;

  // Pattern: percentages — "23%", "−14%", "+8%", "12.5%"
  const percentRe = /([+\-−]?\d+(?:\.\d+)?)\s*[%٪]/g;

  // Pattern: currency markers — JOD 12,500 or 12,500 د.أ
  const currencyRe = /(?:JOD|د\.?أ\.?|USD|EUR)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:JOD|د\.?أ\.?|USD|EUR)/g;

  // Currency first (otherwise the number regex would double-match).
  let m: RegExpExecArray | null;
  const seenIndices = new Set<number>();
  while ((m = currencyRe.exec(narrative)) !== null) {
    const token = m[1] ?? m[2] ?? "";
    if (!token) continue;
    claims.push({ token, index: m.index, shape: "currency" });
    for (let i = m.index; i < m.index + m[0].length; i++) seenIndices.add(i);
  }

  while ((m = percentRe.exec(narrative)) !== null) {
    claims.push({ token: m[1], index: m.index, shape: "percent" });
    for (let i = m.index; i < m.index + m[0].length; i++) seenIndices.add(i);
  }

  while ((m = numberRe.exec(narrative)) !== null) {
    // Skip numbers already counted as currency or percent.
    if (seenIndices.has(m.index)) continue;
    claims.push({ token: m[1], index: m.index, shape: "number" });
  }

  return claims.sort((a, b) => a.index - b.index);
}

/**
 * Try to match a single claim against the facts payload.
 * Returns the matched key/value if a match is found.
 */
export function matchClaim(
  claim: FactClaim,
  facts: Record<string, any>,
): { key: string; value: number | string } | null {
  const parsedToken = parseNumeric(claim.token);

  for (const [key, raw] of flatten(facts)) {
    // Numeric / percent / currency match
    if (parsedToken !== null && typeof raw === "number") {
      // Percent claims compare against fractional facts (e.g. 0.23 ↔ 23%).
      const candidate = claim.shape === "percent" && Math.abs(raw) <= 1
        ? raw * 100
        : raw;
      if (numericMatch(parsedToken, candidate)) {
        return { key, value: raw };
      }
    }

    // Entity (string token) match
    if (claim.shape === "entity" && typeof raw === "string") {
      if (raw.toLowerCase().includes(claim.token.toLowerCase())) {
        return { key, value: raw };
      }
    }
  }

  return null;
}

/**
 * Verify a narrative against its facts payload. Returns a structured
 * report with per-claim evidence and an overall trust level.
 */
export function verifyNarrative(
  narrative: string,
  facts: Record<string, any>,
): VerificationReport {
  const claims = extractClaims(narrative);
  const verifications: Verification[] = claims.map((claim) => {
    const match = matchClaim(claim, facts);
    return {
      claim,
      verified: match !== null,
      matchedKey: match?.key,
      matchedValue: match?.value,
    };
  });

  const total = verifications.length;
  const verified = verifications.filter((v) => v.verified).length;
  const coverage = total === 0 ? 1 : verified / total;

  return {
    total,
    verified,
    unverified: total - verified,
    coverage,
    claims: verifications,
    trustLevel: coverage >= 0.8 ? "high" : coverage >= 0.5 ? "medium" : "low",
  };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function parseNumeric(token: string): number | null {
  const cleaned = token.replace(/[,،\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function numericMatch(a: number, b: number): boolean {
  if (a === b) return true;
  if (a === 0 || b === 0) return Math.abs(a - b) <= NUMERIC_TOLERANCE_ABS;
  const delta = Math.abs(a - b);
  return delta <= NUMERIC_TOLERANCE_ABS || delta / Math.max(Math.abs(a), Math.abs(b)) <= NUMERIC_TOLERANCE_PCT;
}

/** Flatten a nested facts object into [path, leaf] pairs. */
function* flatten(
  obj: Record<string, any>,
  prefix = "",
): Generator<[string, number | string]> {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (typeof v === "number" || typeof v === "string") {
      yield [path, v];
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const item = v[i];
        if (typeof item === "number" || typeof item === "string") {
          yield [`${path}[${i}]`, item];
        } else if (item && typeof item === "object") {
          yield* flatten(item, `${path}[${i}]`);
        }
      }
    } else if (typeof v === "object") {
      yield* flatten(v as Record<string, any>, path);
    }
  }
}
