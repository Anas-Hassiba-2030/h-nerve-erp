// lib/protocol/spec.ts — the public "Living Protocol" surface the /dev
// portal advertises. The 12-line-agent claim and the OpenAPI doc are
// developer-facing promises; a drift here is a broken pitch demo. Pure data.

import { describe, it, expect } from "vitest";
import {
  PROTOCOL_VERSION,
  PROTOCOL_NAME,
  MIN_AGENT_SOURCE,
  MIN_PACK_SOURCE,
  MIN_THEME_SOURCE,
  MARKETPLACE_AGENTS,
  OPENAPI_DOC,
} from "./spec";

describe("protocol identity", () => {
  it("name + semver version", () => {
    expect(PROTOCOL_NAME).toBe("h-nerve-protocol");
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("canonical examples", () => {
  it("the agent, stripped of imports + blanks, is EXACTLY 12 lines (the advertised invariant)", () => {
    const lines = MIN_AGENT_SOURCE.split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("import "));
    expect(lines).toHaveLength(12);
  });
  it("the pack example is a definePack block for the dairy industry", () => {
    expect(MIN_PACK_SOURCE).toContain("definePack({");
    expect(MIN_PACK_SOURCE).toContain('industry: "dairy"');
  });
  it("the theme example is valid JSON with the documented palette + typography", () => {
    const t = JSON.parse(MIN_THEME_SOURCE);
    expect(t.vocabulary).toBe("heritage");
    expect(Object.keys(t.palette)).toEqual(
      ["bg", "bg2", "ink", "ink2", "rule", "accent", "success", "warn", "critical"],
    );
    expect(Object.keys(t.typography)).toEqual(
      ["displayLatin", "displayArabic", "body", "mono"],
    );
  });
});

describe("MARKETPLACE_AGENTS — seeded community catalog", () => {
  it("ships 24 entries with unique slugs", () => {
    expect(MARKETPLACE_AGENTS).toHaveLength(24);
    expect(new Set(MARKETPLACE_AGENTS.map((a) => a.slug)).size).toBe(24);
  });
  it("every entry has sane rating / voteHealth / installs ranges", () => {
    for (const a of MARKETPLACE_AGENTS) {
      expect(a.rating).toBeGreaterThanOrEqual(0);
      expect(a.rating).toBeLessThanOrEqual(5);
      expect(a.voteHealth).toBeGreaterThanOrEqual(-1);
      expect(a.voteHealth).toBeLessThanOrEqual(1);
      expect(a.installs).toBeGreaterThan(0);
      expect(a.pack).toBeTruthy();
      expect(a.nameAr).toBeTruthy();
    }
  });
});

describe("OPENAPI_DOC — what the explorer renders", () => {
  it("is OpenAPI 3.1 and its version tracks PROTOCOL_VERSION", () => {
    expect(OPENAPI_DOC.openapi).toBe("3.1.0");
    expect(OPENAPI_DOC.info.version).toBe(PROTOCOL_VERSION);
  });
  it("documents the core /agents surface", () => {
    expect(OPENAPI_DOC.paths["/agents"]).toHaveProperty("get");
    expect(OPENAPI_DOC.paths["/agents"]).toHaveProperty("post");
    expect(OPENAPI_DOC.paths["/agents/{slug}/decide"]).toHaveProperty("post");
  });
  it("AgentDecision schema requires vote, rationale, confidence", () => {
    expect(OPENAPI_DOC.components.schemas.AgentDecision.required).toEqual(
      ["vote", "rationale", "confidence"],
    );
  });
});
