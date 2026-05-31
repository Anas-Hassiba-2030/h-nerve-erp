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
