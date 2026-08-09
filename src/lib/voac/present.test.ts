import { describe, it, expect } from "vitest";
import {
  runStatusLabel,
  proposalStatusLabel,
  stepKindLabel,
  scoreLabel,
  confidenceBand,
  valueLabel,
  realizedDelta,
  traceLanes,
  parallelSaving,
  type TraceStep,
} from "./present";

const step = (over: Partial<TraceStep> & { seq: number }): TraceStep => ({
  id: `s${over.seq}`, kind: "tool", roleId: "r", input: "", output: null,
  error: null, latencyMs: 10, ...over,
});

describe("traceLanes", () => {
  it("rebuilds the exact lanes a graphed run executed", () => {
    const lanes = traceLanes([
      step({ seq: 0, kind: "reason", input: "0·plan — think" }),
      step({ seq: 1, kind: "tool", input: "1·gather — pullFacts({})", latencyMs: 40 }),
      step({ seq: 2, kind: "tool", input: "1·gather — recallMemory({})", latencyMs: 90 }),
      step({ seq: 3, kind: "narrate", input: "2·narrate — write" }),
    ]);
    expect(lanes.map((l) => l.id)).toEqual(["plan", "gather", "narrate"]);
    expect(lanes[1].steps).toHaveLength(2);
    expect(lanes[1].parallel).toBe(true);
    // A parallel lane costs its SLOWEST node — summing would report a fan-out
    // as slower than the serial version it replaced.
    expect(lanes[1].latencyMs).toBe(90);
    expect(lanes[1].steps[0].input).toBe("pullFacts({})");
  });

  it("draws what RAN, not what was meant to run", () => {
    // A failed node must show as a failed node. Drawing from the spec would
    // keep the chart pretty while the run was broken.
    const lanes = traceLanes([
      step({ seq: 0, kind: "tool", input: "0·gather — causalSubgraph({})", error: "graph is empty" }),
    ]);
    expect(lanes[0].failed).toBe(true);
  });

  it("collapses a council's voices into one parallel lane", () => {
    const lanes = traceLanes([
      step({ seq: 0, kind: "plan", input: "topology parallel" }),
      step({ seq: 1, kind: "debate", input: "q", roleId: "dairy-expert" }),
      step({ seq: 2, kind: "debate", input: "q", roleId: "risk-officer" }),
      step({ seq: 3, kind: "narrate", input: "synthesis" }),
    ]);
    expect(lanes.map((l) => l.id)).toEqual(["s0", "debate", "s3"]);
    expect(lanes[1].steps).toHaveLength(2);
    expect(lanes[1].parallel).toBe(true);
  });

  it("orders by seq, not by array order", () => {
    const lanes = traceLanes([
      step({ seq: 2, kind: "narrate", input: "1·narrate — b" }),
      step({ seq: 0, kind: "reason", input: "0·plan — a" }),
    ]);
    expect(lanes.map((l) => l.id)).toEqual(["plan", "narrate"]);
  });

  it("handles a refused run with no steps at all", () => {
    expect(traceLanes([])).toEqual([]);
    expect(parallelSaving([])).toBeNull();
  });
});

describe("parallelSaving", () => {
  it("reports nothing when nothing ran in parallel", () => {
    // Claiming a saving of zero is noise; claiming any saving on a serial run
    // would be a lie.
    expect(parallelSaving(traceLanes([step({ seq: 0, input: "0·plan — a" })]))).toBeNull();
  });

  it("says nothing when the parallel nodes recorded no latency", () => {
    // Council voices are the live case: council.live.ts appends its per-voice
    // steps with no latencyMs, so the arithmetic is exactly zero. Printing
    // "0 ms saved" beside a real five-way fan-out reads as "the parallelism did
    // nothing" — worse than staying quiet.
    const lanes = traceLanes([
      step({ seq: 0, kind: "debate", latencyMs: 0 }),
      step({ seq: 1, kind: "debate", latencyMs: 0 }),
    ]);
    expect(lanes[0].parallel).toBe(true);
    expect(parallelSaving(lanes)).toBeNull();
  });

  it("counts the saving as sum-minus-slowest per lane", () => {
    const lanes = traceLanes([
      step({ seq: 0, input: "0·gather — a", latencyMs: 100 }),
      step({ seq: 1, input: "0·gather — b", latencyMs: 300 }),
      step({ seq: 2, kind: "narrate", input: "1·narrate — c", latencyMs: 50 }),
    ]);
    expect(parallelSaving(lanes)).toEqual({ serialMs: 450, actualMs: 350, savedMs: 100 });
  });
});

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
