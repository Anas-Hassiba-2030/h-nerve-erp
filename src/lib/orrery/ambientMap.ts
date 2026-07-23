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

// Living mode per Claude Design reference HTML (docs/design/system/sections/*.html):
// 19 sections set data-living="night" (cosmic emerald) — brain group, intel signals,
// team comms, workflows. The rest stay "work" (ivory daylight). This map matches the
// references 1:1 — see `grep -l data-living="night" docs/design/system/sections/`.
const RULES: { test: RegExp; ambient: Ambient; living?: Living }[] = [
  { test: /^\/hotels/, ambient: "hospitality" },
  { test: /^\/dairy/, ambient: "dairy" },
  { test: /^\/farms/, ambient: "agriculture" },
  { test: /^\/education/, ambient: "university" },
  { test: /^\/supply-chain/, ambient: "agriculture" },
  // the group / governance god-views
  { test: /^\/(admin\/empire|admin\/tenants|companies|dashboard|compare)\b/, ambient: "holding" },
  // money surfaces + audit trail (reference: data-ambient="finance")
  { test: /^\/(finance|markets|analytics|reports|sustainability|projects|audit-360)\b/, ambient: "finance" },
  // front-office ERP surfaces (Sales / Purchasing & Production / expanded
  // Finance — ERP split 2026-07-23): same money-daylight register
  { test: /^\/(invoices|estimates|pos|e-invoicing|purchase-invoices|purchase-payments|treasuries|payments|statements|customers|suppliers|assets|manufacturing|maintenance|crm)\b/, ambient: "finance" },
  // the Brain runs in the cosmic-night register
  { test: /^\/brain/, ambient: "cosmic", living: "night" },
  // intel + signal surfaces (cosmic night per reference)
  { test: /^\/(insights|alerts|plans|documents|digest|narrate)\b/, ambient: "cosmic", living: "night" },
  // team comms (cosmic night per reference)
  { test: /^\/(messages|tasks|inbox|employees|users)\b/, ambient: "cosmic", living: "night" },
  // workflow studio (cosmic night per reference)
  { test: /^\/workflows/, ambient: "cosmic", living: "night" },
];

export function ambientForPath(path: string): { ambient: Ambient; living: Living } {
  for (const r of RULES) {
    if (r.test.test(path)) return { ambient: r.ambient, living: r.living ?? "work" };
  }
  return { ambient: "holding", living: "work" };
}
