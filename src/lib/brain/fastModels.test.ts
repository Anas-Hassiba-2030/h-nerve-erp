// Perf regression guard — the LIVE latency of "Convene the council" and
// "Generate plan" is dominated by the Anthropic model they run on. Council
// voices/moderator and the Planner must stay on the FAST model (Haiku), never
// the slow Sonnet default — that swap is the whole reason those buttons went
// from 10s+ to a few seconds. If anyone reverts the planner/council back to the
// Sonnet default, these tests fail loudly instead of silently regressing the
// pitch-critical latency.

import { describe, it, expect, afterEach } from "vitest";
import { councilModel, plannerModel } from "./llm";

const FAST_MODEL = "claude-haiku-4-5-20251001";
const SLOW_DEFAULT = "claude-sonnet-4-6"; // DEFAULT_MODEL in llm.ts

describe("brain fast-model latency guards", () => {
  afterEach(() => {
    delete process.env.BRAIN_COUNCIL_MODEL;
    delete process.env.BRAIN_PLANNER_MODEL;
  });

  it("council runs on the fast model by default (not the Sonnet default)", () => {
    delete process.env.BRAIN_COUNCIL_MODEL;
    expect(councilModel()).toBe(FAST_MODEL);
    expect(councilModel()).not.toBe(SLOW_DEFAULT);
  });

  it("planner runs on the fast model by default — kills the >10s Generate-plan hang", () => {
    delete process.env.BRAIN_PLANNER_MODEL;
    expect(plannerModel()).toBe(FAST_MODEL);
    expect(plannerModel()).not.toBe(SLOW_DEFAULT);
  });

  it("both stay overridable via env (escape hatch to restore Sonnet)", () => {
    process.env.BRAIN_COUNCIL_MODEL = SLOW_DEFAULT;
    process.env.BRAIN_PLANNER_MODEL = SLOW_DEFAULT;
    expect(councilModel()).toBe(SLOW_DEFAULT);
    expect(plannerModel()).toBe(SLOW_DEFAULT);
  });
});
