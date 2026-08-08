// stackManifest.ts — what this system is actually built out of.
//
// Every version here is READ FROM package.json, not typed by hand. A hand-kept
// dependency list is wrong within a month and there is no way to notice, which
// makes it worse than no list: it looks like evidence while being folklore.
//
// The import is a build-time bundle (tsconfig has resolveJsonModule), NOT a
// request-time file read — Workers have no filesystem at request time, so a
// readFile here would work in dev and 500 in production only.
//
// Pure module: no DB, no Next, no request context.

import pkg from "../../../package.json";

export type StackGroup = {
  id: string;
  ar: string;
  en: string;
  /** Why this group exists at all — the decision, not the description. */
  whyAr: string;
  whyEn: string;
  packages: { name: string; version: string }[];
};

/** Own-code pillars: the parts nobody could install, i.e. the actual product. */
export type Pillar = {
  path: string;
  ar: string;
  en: string;
  noteAr: string;
  noteEn: string;
};

const DEPS: Record<string, string> = {
  ...(pkg.dependencies as Record<string, string>),
  ...(pkg.devDependencies as Record<string, string>),
};

/** Look a package up, tolerating absence — a dropped dependency must not throw
 *  a page that exists to describe the system. */
function pick(names: string[]): { name: string; version: string }[] {
  return names
    .filter((n) => DEPS[n])
    .map((n) => ({ name: n, version: DEPS[n].replace(/^[\^~]/, "") }));
}

export const STACK_GROUPS: StackGroup[] = [
  {
    id: "runtime",
    ar: "الإطار وزمن التشغيل",
    en: "Framework & runtime",
    whyAr:
      "إطار واحد يخدم الصفحة والخادم معاً، فلا توجد طبقة API وسيطة يجب صيانتها لكل شاشة.",
    whyEn:
      "One framework serves the page and the server, so there is no intermediate API layer to maintain per screen.",
    packages: pick(["next", "react", "react-dom", "typescript"]),
  },
  {
    id: "data",
    ar: "البيانات",
    en: "Data",
    whyAr:
      "قاعدة واحدة (SQLite) محلياً وفي الإنتاج عبر Cloudflare D1 — نفس اللهجة، فلا مفاجآت عند النشر.",
    whyEn:
      "One database dialect (SQLite) locally and in production via Cloudflare D1 — no dialect surprises at deploy time.",
    packages: pick([
      "@prisma/client",
      "prisma",
      "@prisma/adapter-d1",
      "@prisma/adapter-libsql",
    ]),
  },
  {
    id: "agents",
    ar: "الوكلاء والذكاء",
    en: "Agents & intelligence",
    whyAr:
      "بروتوكول MCP القياسي يعني أن دماغ النظام يمكن استدعاؤه من أي عميل يدعمه، لا من هذا التطبيق وحده.",
    whyEn:
      "The MCP standard means the brain can be called by any client that speaks it, not only by this app.",
    packages: pick(["@modelcontextprotocol/sdk", "zod", "zod-to-json-schema"]),
  },
  {
    id: "security",
    ar: "الجلسات والحماية",
    en: "Sessions & security",
    whyAr:
      "جلسة مختومة في كوكي بدل خادم جلسات — لا حالة يجب مزامنتها بين نُسخ العامل.",
    whyEn:
      "A sealed cookie session instead of a session server — no state to synchronise between Worker instances.",
    packages: pick(["iron-session", "bcryptjs"]),
  },
  {
    id: "ui",
    ar: "الواجهة",
    en: "Interface",
    whyAr: "أدوات صغيرة ومركّبة بدل مكتبة مكوّنات كاملة تفرض لغتها البصرية.",
    whyEn:
      "Small composable utilities rather than a full component library that would impose its own visual language.",
    packages: pick([
      "tailwindcss",
      "lucide-react",
      "recharts",
      "clsx",
      "tailwind-merge",
    ]),
  },
  {
    id: "quality",
    ar: "بوابة الجودة",
    en: "Quality gate",
    whyAr:
      "اختبارات وحدة صافية + متصفّح حقيقي. كلاهما يعمل في CI على كل طلب دمج.",
    whyEn:
      "Pure unit tests plus a real browser. Both run in CI on every pull request.",
    packages: pick(["vitest", "@playwright/test", "eslint"]),
  },
  {
    id: "deploy",
    ar: "النشر",
    en: "Deployment",
    whyAr:
      "يُبنى التطبيق كعامل Cloudflare واحد مع أصوله الثابتة — لا خوادم تُدار.",
    whyEn:
      "The app builds into a single Cloudflare Worker with its static assets — no servers to manage.",
    packages: pick(["@opennextjs/cloudflare", "wrangler", "esbuild"]),
  },
];

export const PILLARS: Pillar[] = [
  {
    path: "src/lib/brain/",
    ar: "الدماغ",
    en: "The Brain",
    noteAr:
      "٧ أدوات + حلقة أدوات + خادم MCP. يقترح ولا يكتب في بيانات العمل — الحدّ الذي يجعله قابلاً للتدقيق.",
    noteEn:
      "7 tools + a tool-loop + an MCP server. It proposes and never writes to domain data — the boundary that keeps it auditable.",
  },
  {
    path: "src/lib/voac/",
    ar: "شركة الوكلاء",
    en: "The agent company",
    noteAr:
      "الأدوار، الأنماط، الميزانيات، الجدولة، وخريطة التنظيم — كلها منطق صافٍ مُختبَر.",
    noteEn:
      "Roles, topologies, budgets, scheduling and the org map — all pure, tested logic.",
  },
  {
    path: "src/lib/tenancy/",
    ar: "تعدّد المستأجرين",
    en: "Multi-tenancy",
    noteAr: "٣٣ وحدة قابلة للتفعيل لكل مستأجر، مع روابط اعتماد بينها.",
    noteEn: "33 modules switchable per tenant, with dependency edges between them.",
  },
  {
    path: "src/lib/finance/",
    ar: "المحاسبة",
    en: "Accounting",
    noteAr: "قيد مزدوج حقيقي؛ القيود تُرحَّل عبر دالة واحدة تضمن الذرّية على D1.",
    noteEn:
      "Real double-entry; entries post through one helper that guarantees atomicity on D1.",
  },
  {
    path: "src/lib/orrery/",
    ar: "التنقّل",
    en: "Navigation",
    noteAr: "مصدر واحد للأقسام يغذّي القشرتين والمركز الثابت معاً.",
    noteEn: "One section source feeding both shells and the static hub.",
  },
];

/** Totals for the page header — computed, never asserted. */
export function stackTotals(): { packages: number; groups: number; pillars: number } {
  return {
    packages: STACK_GROUPS.reduce((s, g) => s + g.packages.length, 0),
    groups: STACK_GROUPS.length,
    pillars: PILLARS.length,
  };
}
