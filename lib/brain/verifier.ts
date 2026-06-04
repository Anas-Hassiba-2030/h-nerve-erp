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

  // Digit classes cover ASCII (0-9), Arabic-Indic (٠-٩) and Extended Arabic-Indic
  // (۰-۹) numerals, so the verifier also grounds claims written in Arabic prose —
  // otherwise an Arabic-numeral figure escapes verification entirely. Separators:
  // thousands , ٬ ، and decimal . ٫.
  const D = "[0-9\\u0660-\\u0669\\u06F0-\\u06F9]";
  const THOU = "[,\\u066C\\u060C]";
  const DEC = "[.\\u066B]";
  const NUMCHARS = "[0-9\\u0660-\\u0669\\u06F0-\\u06F9,\\u066C\\u060C]";
  const CUR = "(?:JOD|د\\.?أ\\.?|USD|EUR)";

  // Numbers with optional grouping + decimals: "49,822", "٤٩٬٨٢٢", "3.4", "٠٫٢١"
  const numberRe = new RegExp(
    `(?<![A-Za-z])(${D}{1,3}(?:${THOU}${D}{3})+(?:${DEC}${D}+)?|${D}+(?:${DEC}${D}+)?)(?![A-Za-z])`,
    "g",
  );
  // Percentages — "23%", "−14%", "+8%", "12.5%", "١٢٪"
  const percentRe = new RegExp(`([+\\-\\u2212]?${D}+(?:${DEC}${D}+)?)\\s*[%\\u066A]`, "g");
  // Currency markers — JOD 12,500 / 12,500 د.أ, on either side, ASCII or Arabic numerals
  const currencyRe = new RegExp(
    `${CUR}\\s*(${NUMCHARS}+(?:${DEC}${D}+)?)|(${NUMCHARS}+(?:${DEC}${D}+)?)\\s*${CUR}`,
    "g",
  );

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
  // Normalize Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits to ASCII and
  // the Arabic decimal mark ٫ to ".", then strip thousands separators (, ٬ ،), the
  // RTL mark, and whitespace.
  const cleaned = token
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/[,،٬‏\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function numericMatch(a: number, b: number): boolean {
  if (a === b) return true;
  const mag = Math.max(Math.abs(a), Math.abs(b));
  if (mag === 0) return true; // both zero (already caught by === ); guards div-by-zero
  const delta = Math.abs(a - b);
  // The ±1 absolute floor exists to tolerate rounding of integer-scale values
  // (e.g. 49,800 ↔ 49,822, or 3 ↔ 4). It is meaningless for sub-unit fractions —
  // a ±1 slack would make 0.78 "match" 0.30 — so gate it to magnitudes ≥ 1 and
  // rely on the percentage tolerance for fractions/ratios/rates.
  if (mag >= 1 && delta <= NUMERIC_TOLERANCE_ABS) return true;
  return delta / mag <= NUMERIC_TOLERANCE_PCT;
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
