// Maps a real app route to its design "ambient" signature + living mode.
// Mirrors the data-ambient/data-living attributes the design's section mocks
// set on <html> (see docs/design/system/sections/*.html and PORT-MAP.md).
export type Ambient =
  | "hospitality"
  | "dairy"
  | "agriculture"
  | "university"
  | "holding"
  | "finance"
  | "cosmic";
export type Living = "work" | "night";

const RULES: { test: RegExp; ambient: Ambient; living?: Living }[] = [
  { test: /^\/hotels/, ambient: "hospitality" },
  { test: /^\/dairy/, ambient: "dairy" },
  { test: /^\/farms/, ambient: "agriculture" },
  { test: /^\/education/, ambient: "university" },
  { test: /^\/supply-chain/, ambient: "agriculture" },
  // the group / governance god-views
  { test: /^\/(admin\/empire|admin\/tenants|companies|dashboard|compare)\b/, ambient: "holding" },
  // money surfaces
  { test: /^\/(finance|markets|analytics|reports|sustainability|projects)\b/, ambient: "finance" },
  // the Brain runs in the cosmic-night register
  { test: /^\/brain/, ambient: "cosmic", living: "night" },
  { test: /^\/(insights|alerts|plans|documents|digest|narrate)\b/, ambient: "cosmic" },
];

export function ambientForPath(path: string): { ambient: Ambient; living: Living } {
  for (const r of RULES) {
    if (r.test.test(path)) return { ambient: r.ambient, living: r.living ?? "work" };
  }
  return { ambient: "holding", living: "work" };
}
