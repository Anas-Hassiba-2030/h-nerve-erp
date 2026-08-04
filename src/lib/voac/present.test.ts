import { describe, it, expect } from "vitest";
import {
  runStatusLabel,
  proposalStatusLabel,
  stepKindLabel,
  scoreLabel,
  confidenceBand,
  valueLabel,
  realizedDelta,
} from "./present";

describe("runStatusLabel", () => {
  it("never paints a REFUSED run as a failure — refusal is the safety boundary working", () => {
    // Painting correct refusals red teaches operators to treat them as incidents.
    expect(runStatusLabel("REFUSED").tone).not.toBe("crit");
    expect(runStatusLabel("STUB").tone).not.toBe("crit");
    expect(runStatusLabel("BUDGET_EXHAUSTED").tone).not.toBe("crit");
  });

  it("reserves crit for a genuine fault", () => {
    expect(runStatusLabel("FAILED").tone).toBe("crit");
  });

  it("labels every known status in both languages", () => {
    for (const s of ["RUNNING", "SUCCEEDED", "FAILED", "BUDGET_EXHAUSTED", "REFUSED", "STUB"]) {
      const l = runStatusLabel(s);
      expect(l.ar.length, s).toBeGreaterThan(0);
      expect(l.en.length, s).toBeGreaterThan(0);
      expect(l.ar, s).not.toBe(s); // actually translated, not echoed
    }
  });

  it("echoes an unknown status rather than throwing", () => {
    expect(runStatusLabel("WAT").en).toBe("WAT");
  });
});

describe("proposalStatusLabel", () => {
  it("marks PENDING as needing attention", () => {
    expect(proposalStatusLabel("PENDING").tone).toBe("warn");
  });
  it("does not paint a rejection as an error", () => {
    expect(proposalStatusLabel("REJECTED").tone).not.toBe("crit");
  });
});

describe("stepKindLabel", () => {
  it("translates the known kinds", () => {
    for (const k of ["plan", "tool", "debate", "verify", "narrate"]) {
      expect(stepKindLabel(k).ar).not.toBe(k);
    }
  });
});

describe("scoreLabel", () => {
  it("says UNSCORED rather than implying zero", () => {
    const l = scoreLabel(null, null);
    expect(l.text.en).toBe("Unscored");
    expect(l.trustworthy).toBe(false);
  });

  it("names a self-assessed score as self-assessed and marks it untrustworthy", () => {
    // Surfacing a self-score with the same weight as a human score is how a
    // circular reward loop gets built by accident.
    const l = scoreLabel(0.9, "self");
    expect(l.text.en).toMatch(/self-assessed/);
    expect(l.trustworthy).toBe(false);
    expect(l.tone).toBe("muted");
  });

  it("treats a human score as trustworthy", () => {
    const l = scoreLabel(0.8, "human");
    expect(l.trustworthy).toBe(true);
    expect(l.text.en).toMatch(/human/);
  });

  it("clamps a nonsense score instead of rendering 400%", () => {
    expect(scoreLabel(4, "human").text.en).toMatch(/^100%/);
    expect(scoreLabel(-2, "human").text.en).toMatch(/^0%/);
  });
});

describe("confidenceBand", () => {
  it("is coarse — three bands, never a decimal", () => {
    // A model's stated confidence is not calibrated; "0.62" implies precision
    // that does not exist.
    expect(confidenceBand(0.9).en).toBe("High confidence");
    expect(confidenceBand(0.5).en).toBe("Medium confidence");
    expect(confidenceBand(0.1).en).toBe("Low confidence");
    for (const c of [0, 0.39, 0.4, 0.69, 0.7, 1]) {
      expect(confidenceBand(c).en).not.toMatch(/\d/);
    }
  });

  it("clamps out-of-range input", () => {
    expect(confidenceBand(9).en).toBe("High confidence");
    expect(confidenceBand(-1).en).toBe("Low confidence");
  });

  it("NEVER invents a band for an unstated confidence", () => {
    // The original page hardcoded confidenceBand(0.5), so every proposal showed
    // "medium confidence" whether or not the agent claimed one — a fabricated
    // signal in front of someone making a decision, indistinguishable from a
    // genuine 0.5.
    for (const missing of [null, undefined, NaN]) {
      const b = confidenceBand(missing);
      expect(b.en, String(missing)).toBe("Confidence not stated");
      expect(b.tone, String(missing)).toBe("muted");
    }
    expect(confidenceBand(0.5).en).toBe("Medium confidence");
  });
});

describe("valueLabel", () => {
  it("says NOT QUANTIFIED rather than showing a silent zero", () => {
    expect(valueLabel(null, "en")).toBe("Not quantified");
    expect(valueLabel(undefined, "ar")).toBe("غير مُقدَّر");
  });

  it("renders a real figure with its currency", () => {
    expect(valueLabel(1234.6, "en")).toMatch(/1,235 JOD/);
  });

  it("distinguishes an actual zero from an absent value", () => {
    expect(valueLabel(0, "en")).not.toBe("Not quantified");
  });
});

describe("realizedDelta", () => {
  it("returns null while the outcome is unknown — never implies a result", () => {
    expect(realizedDelta(1000, null)).toBeNull();
    expect(realizedDelta(1000, undefined)).toBeNull();
  });

  it("returns null when there was no estimate to beat", () => {
    expect(realizedDelta(null, 500)).toBeNull();
    expect(realizedDelta(0, 500)).toBeNull();
  });

  it("computes the delta against the estimate", () => {
    expect(realizedDelta(1000, 1200)?.pct).toBe(20);
    expect(realizedDelta(1000, 800)?.pct).toBe(-20);
  });

  it("escalates tone as the miss widens", () => {
    expect(realizedDelta(1000, 1100)?.tone).toBe("ok");
    expect(realizedDelta(1000, 900)?.tone).toBe("warn");
    expect(realizedDelta(1000, 400)?.tone).toBe("crit");
  });
});
