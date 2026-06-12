// Smoke tests for council agents' stubVoice — the deterministic position
// they produce when no LLM is configured (used in CI/tests/offline demos).
//
// Each specialist should produce a thesis in BOTH locales, a valid position
// string, and at least one piece of evidence — across a range of topics.

import { describe, it, expect } from "vitest";
import {
  HospitalityExpert, DairyExpert, AgriExpert, FinanceBrain, RiskOfficer,
  SPECIALIST_AGENTS,
} from "./index";
import type { AgentInput } from "./base";

const POSITIONS = new Set(["support", "oppose", "qualify", "moderate"]);

function inputFor(topic: string, locale: "ar" | "en" = "en"): AgentInput {
  return {
    topic,
    context: { summary: "test", metrics: {}, relevantNodes: [] },
    locale,
  };
}

const TOPICS = [
  "Should we ramp Maha cheese production for Q3?",
  "Arena Sofia occupancy is forecast to drop 15%",
  "Loran greenhouse moisture has been below 35% for 72 hours",
  "Two labneh batches expire in 3 days",
  "Should we open a side cohort at The Tank?",
];

describe("Council specialist roster", () => {
  it("exports exactly 5 specialists", () => {
    expect(SPECIALIST_AGENTS).toHaveLength(5);
  });

  it("every specialist has a unique id, both labels, and a stubVoice", () => {
    const ids = new Set(SPECIALIST_AGENTS.map((a) => a.id));
    expect(ids.size).toBe(SPECIALIST_AGENTS.length);
    for (const a of SPECIALIST_AGENTS) {
      expect(a.id).toBeTruthy();
      expect(a.speakerLabelAr).toBeTruthy();
      expect(a.speakerLabelEn).toBeTruthy();
      expect(typeof a.stubVoice).toBe("function");
    }
  });
});

describe("stubVoice — every specialist × every topic × both locales", () => {
  const agents = [HospitalityExpert, DairyExpert, AgriExpert, FinanceBrain, RiskOfficer];
  for (const agent of agents) {
    for (const topic of TOPICS) {
      for (const locale of ["ar", "en"] as const) {
        it(`${agent.id} / ${locale} / "${topic.slice(0, 28)}…"`, () => {
          const v = agent.stubVoice(inputFor(topic, locale));
          expect(POSITIONS.has(v.position)).toBe(true);
          expect(v.thesis).toBeTruthy();
          expect(v.thesis.length).toBeGreaterThan(20);
          // Arabic locale → thesis contains at least one Arabic char.
          if (locale === "ar") {
            expect(/[؀-ۿ]/.test(v.thesis)).toBe(true);
          }
          expect(Array.isArray(v.evidence)).toBe(true);
          expect((v.evidence ?? []).length).toBeGreaterThanOrEqual(1);
        });
      }
    }
  }
});

describe("stubVoice is deterministic — same input, same output", () => {
  it("identical input produces identical thesis (no randomness leaked)", () => {
    const inp = inputFor("Should we ramp Maha cheese production?", "en");
    const a = DairyExpert.stubVoice(inp);
    const b = DairyExpert.stubVoice(inp);
    expect(a.thesis).toBe(b.thesis);
    expect(a.position).toBe(b.position);
  });
});
