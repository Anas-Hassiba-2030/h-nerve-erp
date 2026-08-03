import { describe, it, expect } from "vitest";
import { extractProposals, stripProposalBlock, PROPOSAL_OUTPUT_CONTRACT } from "./proposals";

const block = (obj: unknown) => "```json\n" + JSON.stringify(obj) + "\n```";

describe("extractProposals", () => {
  it("parses a well-formed envelope", () => {
    const res = extractProposals(
      "بعض التحليل هنا.\n\n" +
        block({ proposals: [{ title: "Divert batch 12", rationale: "Expiry in 4 days", estimatedValueJod: 900, confidence: 0.7 }] }),
    );
    expect(res.parseError).toBeNull();
    expect(res.proposals).toHaveLength(1);
    expect(res.proposals[0].estimatedValueJod).toBe(900);
  });

  it("accepts an explicitly empty list — 'nothing worth your attention' is a valid answer", () => {
    const res = extractProposals("Nothing actionable this week.\n" + block({ proposals: [] }));
    expect(res.parseError).toBeNull();
    expect(res.proposals).toEqual([]);
  });

  it("accepts a proposal with no value — unquantified is allowed, just ranked lower", () => {
    const res = extractProposals(block({ proposals: [{ title: "T", rationale: "R", confidence: 0.5 }] }));
    expect(res.parseError).toBeNull();
    expect(res.proposals[0].estimatedValueJod).toBeUndefined();
  });

  it("takes the LAST block, so a revised answer wins over an earlier draft", () => {
    const text =
      block({ proposals: [{ title: "draft", rationale: "r", confidence: 0.2 }] }) +
      "\n\nOn reflection:\n" +
      block({ proposals: [{ title: "final", rationale: "r", confidence: 0.9 }] });
    expect(extractProposals(text).proposals[0].title).toBe("final");
  });

  it("NEVER salvages a proposal from prose when the contract was not honoured", () => {
    // A parser-invented proposal would carry a confidence nobody assigned and
    // reach a manager looking exactly like one the agent stood behind.
    const res = extractProposals("I suggest we divert batch 12, worth about 900 JOD, high confidence.");
    expect(res.proposals).toEqual([]);
    expect(res.parseError).toMatch(/contract was not honoured/i);
  });

  it("reports malformed JSON rather than silently returning nothing", () => {
    const res = extractProposals("```json\n{proposals: [oops}\n```");
    expect(res.proposals).toEqual([]);
    expect(res.parseError).toMatch(/not valid JSON/i);
  });

  it("rejects an out-of-range confidence and names the field", () => {
    const res = extractProposals(block({ proposals: [{ title: "T", rationale: "R", confidence: 4 }] }));
    expect(res.proposals).toEqual([]);
    expect(res.parseError).toMatch(/confidence/);
  });

  it("rejects a negative value", () => {
    const res = extractProposals(
      block({ proposals: [{ title: "T", rationale: "R", confidence: 0.5, estimatedValueJod: -5 }] }),
    );
    expect(res.proposals).toEqual([]);
    expect(res.parseError).toBeTruthy();
  });

  it("rejects a proposal missing its rationale — an unexplained ask is not actionable", () => {
    const res = extractProposals(block({ proposals: [{ title: "T", confidence: 0.5 }] }));
    expect(res.proposals).toEqual([]);
    expect(res.parseError).toMatch(/rationale/);
  });

  it("handles empty and null input without throwing", () => {
    for (const input of ["", "   ", null, undefined]) {
      const res = extractProposals(input);
      expect(res.proposals).toEqual([]);
      expect(res.parseError).toBeTruthy();
    }
  });

  it("caps the envelope so one run cannot flood the queue", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ title: `T${i}`, rationale: "R", confidence: 0.5 }));
    expect(extractProposals(block({ proposals: many })).proposals).toEqual([]);
  });
});

describe("stripProposalBlock", () => {
  it("leaves the manager reading prose, not JSON", () => {
    const text = "التحليل هنا.\n\n" + block({ proposals: [] });
    expect(stripProposalBlock(text)).toBe("التحليل هنا.");
  });

  it("is a no-op when there is no block", () => {
    expect(stripProposalBlock("just prose")).toBe("just prose");
  });
});

describe("PROPOSAL_OUTPUT_CONTRACT", () => {
  it("tells the model that an empty list is acceptable", () => {
    // Without this the model invents work to look useful, which is exactly
    // what the proposal cap exists to prevent.
    expect(PROPOSAL_OUTPUT_CONTRACT).toMatch(/empty list is a valid/i);
  });

  it("forbids guessing a value", () => {
    expect(PROPOSAL_OUTPUT_CONTRACT).toMatch(/Do not guess/i);
  });
});
