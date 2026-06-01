import { describe, expect, it } from "vitest";
import { extractClaims, matchClaim, verifyNarrative } from "./verifier";

describe("extractClaims", () => {
  it("extracts plain numbers", () => {
    const claims = extractClaims("Revenue closed at 49,822 against 38,400 prior.");
    expect(claims.map((c) => c.token)).toEqual(["49,822", "38,400"]);
    expect(claims.every((c) => c.shape === "number")).toBe(true);
  });

  it("extracts percentages with sign and Arabic ٪", () => {
    const en = extractClaims("Margin moved +12.5% on a −4% headwind.");
    expect(en.map((c) => c.token)).toContain("+12.5");
    expect(en.map((c) => c.token)).toContain("−4");

    const ar = extractClaims("الهامش تحرّك ١٢٪ -- لكن +23٪ في الضيافة.");
    expect(ar.map((c) => c.shape)).toContain("percent");
  });

  it("tags currency tokens", () => {
    const claims = extractClaims("Net for the period landed at JOD 49,822 on margin.");
    const currency = claims.find((c) => c.shape === "currency");
    expect(currency?.token).toBe("49,822");
  });

  it("returns empty for prose without numbers", () => {
    expect(extractClaims("The narrative is silent on numbers.")).toEqual([]);
  });
});

describe("matchClaim", () => {
  const facts = {
    revenue: 49822,
    prevRevenue: 38400,
    delta: 0.298, // 29.8% as a fraction
    occupancyPct: 0.78,
    company: "Arena Hotel",
  };

  it("matches an exact number", () => {
    const c = { token: "49,822", index: 0, shape: "number" as const };
    const m = matchClaim(c, facts);
    expect(m?.key).toBe("revenue");
    expect(m?.value).toBe(49822);
  });

  it("matches within numeric tolerance (rounding)", () => {
    const c = { token: "49,800", index: 0, shape: "number" as const };
    expect(matchClaim(c, facts)?.key).toBe("revenue");
  });

  it("matches a percent claim against a fractional fact", () => {
    const c = { token: "29.8", index: 0, shape: "percent" as const };
    expect(matchClaim(c, facts)?.key).toBe("delta");
  });

  it("matches occupancyPct against a percent token", () => {
    const c = { token: "78", index: 0, shape: "percent" as const };
    expect(matchClaim(c, facts)?.key).toBe("occupancyPct");
  });

  it("returns null for unrelated numbers", () => {
    const c = { token: "999999", index: 0, shape: "number" as const };
    expect(matchClaim(c, facts)).toBeNull();
  });

  it("flattens nested facts", () => {
    const nested = { metrics: { revenue: { value: 100 } } };
    const c = { token: "100", index: 0, shape: "number" as const };
    expect(matchClaim(c, nested)?.key).toBe("metrics.revenue.value");
  });

  it("matches inside arrays", () => {
    const arr = { history: [10, 20, 30] };
    const c = { token: "20", index: 0, shape: "number" as const };
    expect(matchClaim(c, arr)?.key).toContain("history");
  });
});

describe("verifyNarrative", () => {
  it("reports high trust when every claim is grounded", () => {
    const narrative = "Revenue closed at 49,822 against 38,400 prior.";
    const facts = { revenue: 49822, prevRevenue: 38400 };
    const report = verifyNarrative(narrative, facts);
    expect(report.verified).toBe(2);
    expect(report.unverified).toBe(0);
    expect(report.trustLevel).toBe("high");
  });

  it("flags fabricated numbers as unverified", () => {
    const narrative = "Revenue closed at 49,822 against 99,999 prior.";
    const facts = { revenue: 49822 };
    const report = verifyNarrative(narrative, facts);
    expect(report.verified).toBe(1);
    expect(report.unverified).toBe(1);
    expect(report.trustLevel).toBe("medium");
  });

  it("returns full trust for narratives with no claims", () => {
    const report = verifyNarrative("Pure prose, no numbers.", {});
    expect(report.total).toBe(0);
    expect(report.coverage).toBe(1);
    expect(report.trustLevel).toBe("high");
  });

  it("degrades to low trust when most claims are unverified", () => {
    const narrative = "10 went to 20 then to 30 then to 40 then to 50.";
    const facts = { onlyKnown: 30 };
    const report = verifyNarrative(narrative, facts);
    expect(report.trustLevel).toBe("low");
  });
});
