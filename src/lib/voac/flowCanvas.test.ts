import { describe, it, expect } from "vitest";
import { buildCanvas, canvasRoles, kindLabel, ungraphedTools, type CanvasNodeKind } from "./flowCanvas";
import { VOAC_ROLES, GROUP_BROKER_ID, getRole } from "./roles";
import { COUNCIL_VOICES } from "./orgMap";

const ALL = VOAC_ROLES.map((r) => r.id);

describe("buildCanvas", () => {
  it("draws a canvas for every role in the roster", () => {
    // A role the canvas cannot draw is a role an owner cannot inspect.
    for (const id of ALL) {
      const c = buildCanvas(id);
      expect(c.nodes.length, id).toBeGreaterThan(5);
      expect(c.edges.length, id).toBeGreaterThan(5);
    }
  });

  it("never points an edge at a node that does not exist", () => {
    // The builder drops such edges rather than rendering half of one, so the
    // only way to catch a broken link is to count what survived.
    for (const id of ALL) {
      const c = buildCanvas(id);
      const ids = new Set(c.nodes.map((n) => n.id));
      for (const e of c.edges) {
        expect(ids.has(e.from), `${id}: ${e.id} from`).toBe(true);
        expect(ids.has(e.to), `${id}: ${e.id} to`).toBe(true);
      }
    }
  });

  it("keeps every node id unique", () => {
    for (const id of ALL) {
      const ids = buildCanvas(id).nodes.map((n) => n.id);
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });

  it("gives every node a real box and a bilingual title", () => {
    for (const n of buildCanvas("dairy-yield-controller").nodes) {
      expect(n.w).toBeGreaterThan(0);
      expect(n.h).toBeGreaterThan(0);
      expect(n.titleAr.length, n.id).toBeGreaterThan(0);
      expect(n.titleEn.length, n.id).toBeGreaterThan(0);
    }
  });

  it("starts at a trigger and always reaches a human", () => {
    // The whole company exists to put a decision in front of a person. A
    // canvas that can be read without finding one would be selling automation
    // this system deliberately does not do.
    for (const id of ALL) {
      const kinds = buildCanvas(id).nodes.map((n) => n.kind);
      expect(kinds, id).toContain("trigger");
      expect(kinds, id).toContain("human");
      expect(kinds, id).toContain("end");
    }
  });

  it("draws all three brakes, on every role", () => {
    for (const id of ALL) {
      const brakes = buildCanvas(id).nodes.filter((n) => n.kind === "brake");
      // scope, shape ceiling, tenant budget, plus the daily proposal cap
      expect(brakes.length, id).toBeGreaterThanOrEqual(4);
    }
  });

  it("fans the broker into the real council, by name", () => {
    const c = buildCanvas(GROUP_BROKER_ID);
    const voices = c.nodes.filter((n) => n.kind === "voice");
    expect(voices).toHaveLength(COUNCIL_VOICES.filter((v) => !v.moderator).length);
    // Every voice must be fed by the convene node and feed the moderator —
    // a fan drawn with a missing leg is a lie about who was consulted.
    for (const v of voices) {
      expect(c.edges.some((e) => e.from === "convene" && e.to === v.id), v.id).toBe(true);
      expect(c.edges.some((e) => e.from === v.id && e.to === "moderator"), v.id).toBe(true);
    }
  });

  it("stacks a parallel gather stage in one column", () => {
    // The fan is the claim the picture makes. If those nodes ended up in
    // different columns they would read as sequential steps.
    const c = buildCanvas("dairy-yield-controller");
    const tools = c.nodes.filter((n) => n.kind === "tool");
    expect(tools.length).toBeGreaterThan(1);
    expect(new Set(tools.map((n) => n.x)).size).toBe(1);
    expect(new Set(tools.map((n) => n.y)).size).toBe(tools.length);
  });

  it("draws the revise loop as a BACKWARD edge on evaluate", () => {
    const c = buildCanvas("dairy-yield-controller", [
      { ...getRole("dairy-yield-controller")!, defaultTopology: "evaluate" },
    ]);
    const loop = c.edges.find((e) => e.from === "grade-grade" && e.to === "draft-draft");
    expect(loop).toBeDefined();
    expect(loop!.conditional).toBe(true);
    const from = c.nodes.find((n) => n.id === "grade-grade")!;
    const to = c.nodes.find((n) => n.id === "draft-draft")!;
    expect(to.x).toBeLessThan(from.x); // genuinely backward
  });

  it("labels every conditional edge — an unlabelled branch is a fork with no reason", () => {
    for (const id of ALL) {
      for (const e of buildCanvas(id).edges.filter((x) => x.conditional)) {
        expect(e.labelEn?.length, `${id}: ${e.id}`).toBeGreaterThan(0);
        expect(e.labelAr?.length, `${id}: ${e.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("shows the quiet exit — the outcome that costs less than it could have", () => {
    for (const id of ALL) {
      const c = buildCanvas(id);
      expect(c.nodes.some((n) => n.id === "quiet"), id).toBe(true);
      expect(c.edges.some((e) => e.to === "quiet" && e.conditional), id).toBe(true);
    }
  });

  it("emits a precomputed path for every edge, so the view does no geometry", () => {
    for (const e of buildCanvas(GROUP_BROKER_ID).edges) {
      expect(e.path).toMatch(/^M [\d.-]+,[\d.-]+ C /);
    }
  });

  it("is deterministic — same input, same coordinates", () => {
    const a = buildCanvas("expiry-routing-officer");
    const b = buildCanvas("expiry-routing-officer");
    expect(a).toEqual(b);
  });

  it("sizes the canvas to fit everything it drew", () => {
    for (const id of ALL) {
      const c = buildCanvas(id);
      for (const n of c.nodes) {
        expect(n.x + n.w, `${id}:${n.id}`).toBeLessThanOrEqual(c.width);
        expect(n.y + n.h, `${id}:${n.id}`).toBeLessThanOrEqual(c.height);
      }
    }
  });

  it("falls back to a real role rather than throwing on an unknown id", () => {
    // The role comes off a URL. A 500 on a typo is not an acceptable answer.
    expect(() => buildCanvas("no-such-role")).not.toThrow();
    expect(buildCanvas("no-such-role").nodes.length).toBeGreaterThan(0);
  });
});

describe("canvas metadata", () => {
  it("offers every role in the picker", () => {
    expect(canvasRoles().map((r) => r.id).sort()).toEqual(ALL.slice().sort());
  });

  it("labels every node kind in both languages", () => {
    const kinds: CanvasNodeKind[] =
      ["trigger", "brake", "router", "agent", "tool", "model", "voice", "check", "human", "end"];
    for (const k of kinds) {
      expect(kindLabel(k).ar.length, k).toBeGreaterThan(0);
      expect(kindLabel(k).en.length, k).toBeGreaterThan(0);
    }
  });

  it("names the tools a graphed role holds but never binds", () => {
    // `simulate` is excluded from gather stages on purpose. Saying so is the
    // difference between an honest diagram and one that quietly omits a tool.
    const role = getRole("hospitality-revenue-controller")!;
    expect(ungraphedTools(role)).toContain("simulate");
    // A loop role binds nothing statically, so it has no such gap to report.
    expect(ungraphedTools({ ...role, defaultTopology: "orchestrate" })).toEqual([]);
  });
});
