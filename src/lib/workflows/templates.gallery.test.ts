// lib/workflows/templates.gallery.test.ts — Phase NS-3.
// The /workflows "use this template" gallery. Every gallery node must
// reference a REAL runtime template (lib/workflows/templates.ts) of the
// matching kind, and every edge must index a node that exists — otherwise
// createWorkflowFromTemplate would persist a broken canvas. Pure registry
// checks, no DB. Guards the gallery against drift in the runtime catalog.

import { describe, it, expect } from "vitest";
import { TEMPLATE_GALLERY, getGalleryTemplate } from "./templates.gallery";
import { getTemplate } from "./templates";

describe("TEMPLATE_GALLERY shape", () => {
  it("ships 4–6 named templates (the NS-3 spec range)", () => {
    expect(TEMPLATE_GALLERY.length).toBeGreaterThanOrEqual(4);
    expect(TEMPLATE_GALLERY.length).toBeLessThanOrEqual(6);
  });

  it("has unique ids", () => {
    const ids = TEMPLATE_GALLERY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template is fully bilingual", () => {
    for (const t of TEMPLATE_GALLERY) {
      for (const f of ["nameAr", "nameEn", "descAr", "descEn", "flowAr", "flowEn"] as const) {
        expect(t[f], `${t.id}.${f}`).toBeTruthy();
        expect(typeof t[f], `${t.id}.${f}`).toBe("string");
      }
      expect(typeof t.enabledByDefault, t.id).toBe("boolean");
    }
  });

  it("starts every flow with a trigger node", () => {
    for (const t of TEMPLATE_GALLERY) {
      expect(t.nodes.length, t.id).toBeGreaterThan(0);
      expect(t.nodes[0].kind, `${t.id} first node`).toBe("trigger");
      expect(t.nodes.filter((n) => n.kind === "trigger").length, t.id).toBe(1);
    }
  });
});

describe("gallery → runtime registry integrity", () => {
  it("every node.key resolves to a registered runtime template of the same kind", () => {
    for (const t of TEMPLATE_GALLERY) {
      for (const node of t.nodes) {
        const reg = getTemplate(node.key);
        expect(reg, `${t.id}: unknown template key "${node.key}"`).toBeTruthy();
        expect(reg?.kind, `${t.id}: kind mismatch on "${node.key}"`).toBe(node.kind);
      }
    }
  });
});

describe("edge integrity", () => {
  it("every edge from/to indexes an existing node, never self-loops", () => {
    for (const t of TEMPLATE_GALLERY) {
      for (const e of t.edges) {
        expect(Number.isInteger(e.from), `${t.id} edge.from`).toBe(true);
        expect(Number.isInteger(e.to), `${t.id} edge.to`).toBe(true);
        expect(e.from, `${t.id} edge.from in range`).toBeGreaterThanOrEqual(0);
        expect(e.from, `${t.id} edge.from in range`).toBeLessThan(t.nodes.length);
        expect(e.to, `${t.id} edge.to in range`).toBeGreaterThanOrEqual(0);
        expect(e.to, `${t.id} edge.to in range`).toBeLessThan(t.nodes.length);
        expect(e.from, `${t.id} edge self-loop`).not.toBe(e.to);
      }
    }
  });

  it("only a trigger/condition node fans out (no action drives an edge)", () => {
    for (const t of TEMPLATE_GALLERY) {
      for (const e of t.edges) {
        expect(t.nodes[e.from].kind, `${t.id}: action node ${e.from} drives an edge`).not.toBe("action");
      }
    }
  });
});

describe("getGalleryTemplate", () => {
  it("resolves a known id and returns undefined otherwise", () => {
    const first = TEMPLATE_GALLERY[0];
    expect(getGalleryTemplate(first.id)?.id).toBe(first.id);
    expect(getGalleryTemplate("does-not-exist")).toBeUndefined();
  });
});
