// Maps a design "star" href (from the ported Orrery hub) to a real app route.
// The Orrery engine emits hrefs in three shapes:
//   1. explicit:   "sections/arena.html", "sections/brain.html", ...
//   2. dashboard:  "ui_kits/dashboard/index.html"
//   3. generated:  "sections/section.html?s=<arName>&g=<group>&a=<amb>"  (kids w/o explicit href)
// See docs/design/orrery/PORT-MAP.md for the full table.

// stem (filename without "sections/" prefix, ".html" suffix, query) -> real route
const STEM_MAP: Record<string, string> = {
  arena: "/hotels",
  maha: "/dairy",
  loran: "/farms",
  ahliyya: "/education",
  supply: "/supply-chain",
  brain: "/brain",
  insights: "/insights",
  alerts: "/alerts",
  plans: "/plans",
  documents: "/documents",
  causal: "/brain/graph",
  whatif: "/brain/scenarios",
  council: "/brain/council",
  memory: "/brain/memory",
  learning: "/brain/learning",
  benchmarks: "/brain/benchmarks",
  brainiq: "/brain/iq",
  narrate: "/brain", // TODO: no dedicated narrate route yet
  finance: "/finance",
  analytics: "/analytics",
  compare: "/compare",
  markets: "/markets",
  reports: "/reports",
  messages: "/messages",
  tasks: "/tasks",
  inbox: "/inbox",
  digest: "/digest",
  employees: "/employees",
  team: "/employees",
  admin: "/admin/tenants",
  holding: "/admin/empire",
  workspace: "/workspace",
  workflows: "/workflows",
  integrations: "/integrations",
  audit: "/audit-360",
  system: "/system",
  search: "/search",
  pinned: "/pinned",
  trash: "/trash",
  info: "/help",
};

// generated kids carry the Arabic section name in ?s= — map those names to routes
const NAME_MAP: Record<string, string> = {
  "العرض": "/dashboard", // TODO: Board Presentation mode
  "البحث": "/search",
  "المثبّت": "/pinned",
  "الشركات": "/companies",
  "التحليلات المتقدمة": "/analytics",
  "المقارنة": "/compare",
  "مكتبة المكوّنات": "/showcase",
  "مسارات العمل": "/workflows",
  "الاستدامة": "/sustainability",
  "المشاريع المستقبلية": "/projects",
  "الإنجازات": "/achievements",
  "الفريق": "/users",
  "الإدارة ERP": "/admin/products",
  "الإعدادات": "/settings",
  "خارطة الطريق": "/roadmap",
  "صحة النظام": "/system",
  "مساحة العمل": "/workspace",
  "التدقيق الشامل": "/audit-360",
  "سجل النشاط": "/activity",
  "المساعدة": "/help",
  "المحذوفات": "/trash",
  "المستأجرون": "/admin/tenants",
  "الإمبراطورية": "/admin/empire",
};

export const ORRERY_FALLBACK_ROUTE = "/dashboard";

export function mapOrreryHref(rawHref: string): string {
  if (!rawHref) return ORRERY_FALLBACK_ROUTE;
  const href = rawHref.trim();

  // already a real route
  if (href.startsWith("/")) return href;

  // dashboard kit
  if (href.includes("ui_kits/dashboard")) return "/dashboard";

  // generated kids: sections/section.html?s=<name>
  if (href.includes("section.html") && href.includes("?")) {
    const qs = href.slice(href.indexOf("?") + 1);
    const params = new URLSearchParams(qs);
    const name = params.get("s");
    if (name && NAME_MAP[name]) return NAME_MAP[name];
  }

  // explicit: strip dir + query + extension -> stem
  const noQuery = href.split("?")[0];
  const file = noQuery.split("/").pop() ?? noQuery;
  const stem = file.replace(/\.html$/i, "");
  if (STEM_MAP[stem]) return STEM_MAP[stem];

  return ORRERY_FALLBACK_ROUTE;
}
