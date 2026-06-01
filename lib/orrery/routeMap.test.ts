import { describe, it, expect } from "vitest";
import { mapOrreryHref, ORRERY_FALLBACK_ROUTE } from "./routeMap";

describe("mapOrreryHref", () => {
  it("maps explicit sector section files to real routes", () => {
    expect(mapOrreryHref("sections/arena.html")).toBe("/hotels");
    expect(mapOrreryHref("sections/maha.html")).toBe("/dairy");
    expect(mapOrreryHref("sections/loran.html")).toBe("/farms");
    expect(mapOrreryHref("sections/ahliyya.html")).toBe("/education");
    expect(mapOrreryHref("sections/supply.html")).toBe("/supply-chain");
  });

  it("maps brain sub-sections", () => {
    expect(mapOrreryHref("sections/causal.html")).toBe("/brain/graph");
    expect(mapOrreryHref("sections/whatif.html")).toBe("/brain/scenarios");
    expect(mapOrreryHref("sections/council.html")).toBe("/brain/council");
    expect(mapOrreryHref("sections/brainiq.html")).toBe("/brain/iq");
    expect(mapOrreryHref("sections/memory.html")).toBe("/brain/memory");
    expect(mapOrreryHref("sections/learning.html")).toBe("/brain/learning");
    expect(mapOrreryHref("sections/benchmarks.html")).toBe("/brain/benchmarks");
    // narrate has no dedicated page; it must still land on a REAL route (the
    // brain hub), never a dead mock.
    expect(mapOrreryHref("sections/narrate.html")).toBe("/brain");
  });

  it("maps team + utility + admin sections to real routes (no design mocks)", () => {
    expect(mapOrreryHref("sections/team.html")).toBe("/employees");
    expect(mapOrreryHref("sections/workspace.html")).toBe("/workspace");
    expect(mapOrreryHref("sections/trash.html")).toBe("/trash");
    expect(mapOrreryHref("sections/search.html")).toBe("/search");
    expect(mapOrreryHref("sections/integrations.html")).toBe("/integrations");
    expect(mapOrreryHref("sections/holding.html")).toBe("/admin/empire");
    // Achievements must go to /achievements, not /tasks (was mistakenly pointing
    // to sections/tasks.html in the orrery HTML — now fixed to sections/achievements.html)
    expect(mapOrreryHref("sections/achievements.html")).toBe("/achievements");
  });

  it("maps the dashboard kit", () => {
    expect(mapOrreryHref("ui_kits/dashboard/index.html")).toBe("/dashboard");
  });

  it("maps generated kids via the Arabic ?s= name", () => {
    expect(
      mapOrreryHref("sections/section.html?s=" + encodeURIComponent("الشركات") + "&g=x&a=finance"),
    ).toBe("/companies");
    expect(
      mapOrreryHref("sections/section.html?s=" + encodeURIComponent("الإعدادات") + "&g=x&a=holding"),
    ).toBe("/settings");
    expect(
      mapOrreryHref("sections/section.html?s=" + encodeURIComponent("الاستدامة")),
    ).toBe("/sustainability");
  });

  it("passes through values that are already real routes", () => {
    expect(mapOrreryHref("/dashboard")).toBe("/dashboard");
    expect(mapOrreryHref("/brain/graph")).toBe("/brain/graph");
  });

  it("falls back safely for unknown hrefs", () => {
    expect(mapOrreryHref("sections/does-not-exist.html")).toBe(ORRERY_FALLBACK_ROUTE);
    expect(mapOrreryHref("")).toBe(ORRERY_FALLBACK_ROUTE);
  });
});
