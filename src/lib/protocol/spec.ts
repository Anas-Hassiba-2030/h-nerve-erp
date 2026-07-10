// lib/protocol/spec.ts
//
// The Living Protocol — H-Nerve as an open intelligence layer.
//
// Phase 20 of docs/governance/PHASES-INTELLIGENCE.md. The final phase.
//
// This file defines the public surface that lets anyone build:
//   1. Agents — small, single-purpose deciders that return votes/proposals
//   2. Packs — bundles of nodes/edges/seeds for an industry vertical
//   3. Themes — JSON theme objects defining brand palette + typography
//
// It also exports the marketplace seed (24 community-built agents) and
// the OpenAPI document the explorer renders.
//
// The 12-line agent registration shape matches `examples/MIN_AGENT` below.
// The 30-line pack registration matches `examples/MIN_PACK`. Themes are
// JSON objects shaped like `examples/MIN_THEME`.

export const PROTOCOL_VERSION = "1.0.0";
export const PROTOCOL_NAME = "h-nerve-protocol";

// ===========================================================================
// CORE TYPES
// ===========================================================================

/**
 * AgentSpec — a small unit of judgment. Given a `topic` and a
 * `context` snapshot of the relevant subgraph + recent memory, returns
 * a vote (`+1` advocate, `-1` skeptic, `0` abstain) plus a 1-3 sentence
 * rationale and optional citations.
 *
 * Agents are stateless and deterministic given the same input — replays
 * must reproduce. Side effects belong in workflows (Phase 12), not agents.
 */
export type AgentSpec = {
  /** Globally unique slug — kebab-case, e.g. "loran:expiry-watcher". */
  slug: string;
  /** Bilingual display names. */
  name: string;
  nameAr?: string;
  /** Industry packs this agent makes sense inside ("dairy", "agri", "hospitality"). */
  packs: string[];
  /** Topics the agent claims authority on — e.g. ["expiry-risk", "yield-margin"]. */
  topics: string[];
  /** SemVer of the agent. */
  version: string;
  /** Author / org. */
  author: string;
  /** The actual function. Always async; always pure. */
  decide: (input: AgentInput) => Promise<AgentDecision>;
};

export type AgentInput = {
  topic: string;
  /** A subgraph cut: nodes + edges relevant to the topic. */
  context: {
    nodes: Array<{ id: string; kind: string; label: string; value?: number }>;
    edges: Array<{ from: string; to: string; weight: number }>;
    memory: Array<{ summary: string; ts: string }>;
  };
  scope?: string;
};

export type AgentDecision = {
  vote: -1 | 0 | 1;
  /** 1-3 sentence rationale. */
  rationale: string;
  /** Citation refs the consumer can drill into. */
  citations?: Array<{ id: string; label: string; href: string }>;
  /** Confidence in [0,1]. */
  confidence: number;
};

/**
 * PackSpec — an industry pack. Bundles brain nodes, edges, default
 * insights, default workflows, and recommended agents.
 */
export type PackSpec = {
  slug: string;
  name: string;
  nameAr?: string;
  description: string;
  version: string;
  author: string;
  /** Domain the pack covers. */
  industry: "dairy" | "agri" | "hospitality" | "edu" | "logistics" | "finance" | "manufacturing" | "retail" | "other";
  /** Brain seed — added to the graph when the pack is installed. */
  graph: {
    nodes: Array<{ id: string; kind: "metric" | "driver" | "outcome" | "risk"; label: string }>;
    edges: Array<{ from: string; to: string; weight: number; reason: string }>;
  };
  /** Default agents bundled with the pack. */
  agents: AgentSpec[];
  /** Workflow templates (Phase 12) installed alongside the pack. */
  workflows: string[];
};

/**
 * ThemeSpec — pure JSON, deserializable from a single .json file. The
 * white-label layer (Phase 11) consumes this when a tenant picks a theme.
 */
export type ThemeSpec = {
  slug: string;
  name: string;
  vocabulary:
    | "heritage"
    | "industrial"
    | "quiet-authority"
    | "calm-clinical"
    | "sleek-operator"
    | "warm-editorial"
    | "brutalist"
    | "ember";
  palette: {
    bg: string;
    bg2: string;
    ink: string;
    ink2: string;
    rule: string;
    accent: string;
    success: string;
    warn: string;
    critical: string;
  };
  typography: {
    displayLatin: string;
    displayArabic: string;
    body: string;
    mono: string;
  };
  /** Optional logo — data: URI or absolute URL. */
  logo?: string;
};

// ===========================================================================
// 12-LINE / 30-LINE / JSON EXAMPLES
// ===========================================================================

/**
 * The canonical 12-line agent. The protocol invariant: any agent with
 * exactly this shape, stripped of imports, is exactly 12 lines.
 */
export const MIN_AGENT_SOURCE = `import { defineAgent } from "h-nerve";

export default defineAgent({
  slug: "dairy:expiry-watcher",
  name: "Expiry Watcher",
  packs: ["dairy"],
  topics: ["expiry-risk"],
  version: "1.0.0",
  author: "you@example.com",
  async decide({ context }) {
    const risky = context.nodes.filter(n => n.kind === "metric" && (n.value ?? 0) > 0.7);
    return { vote: risky.length ? 1 : 0, rationale: \`\${risky.length} batches at risk.\`, confidence: 0.82 };
  },
});`;

/**
 * The canonical 30-line pack. Same invariant.
 */
export const MIN_PACK_SOURCE = `import { definePack } from "h-nerve";
import expiryWatcher from "./agents/expiry-watcher";

export default definePack({
  slug: "dairy",
  name: "Dairy Operations",
  description: "Production · QC · distribution.",
  version: "1.0.0",
  author: "h-nerve",
  industry: "dairy",
  graph: {
    nodes: [
      { id: "yield",       kind: "metric",  label: "Yield" },
      { id: "expiry",      kind: "risk",    label: "Expiry risk" },
      { id: "margin",      kind: "outcome", label: "Margin" },
      { id: "qc-pass",     kind: "metric",  label: "QC pass rate" },
    ],
    edges: [
      { from: "yield",   to: "margin", weight:  0.62, reason: "more output, lower unit cost" },
      { from: "expiry",  to: "margin", weight: -0.71, reason: "near-expiry erodes margin" },
      { from: "qc-pass", to: "expiry", weight: -0.40, reason: "tighter QC catches risk early" },
    ],
  },
  agents: [expiryWatcher],
  workflows: ["dairy/expiry-alert", "dairy/qc-failure-route"],
});`;

/**
 * The canonical JSON theme.
 */
export const MIN_THEME_SOURCE = JSON.stringify(
  {
    slug: "ocean-modern",
    name: "Ocean Modern",
    vocabulary: "heritage",
    palette: {
      bg:        "#f3f6f7",
      bg2:       "#e6ecee",
      ink:       "#0d2731",
      ink2:      "#3a5560",
      rule:      "#cfd9dc",
      accent:    "#1f6f79",
      success:   "#37856a",
      warn:      "#c98c2a",
      critical:  "#a8473a",
    },
    typography: {
      displayLatin:  "GT Sectra",
      displayArabic: "Reem Kufi",
      body:          "IBM Plex Sans Arabic",
      mono:          "JetBrains Mono",
    },
  },
  null,
  2,
);

// ===========================================================================
// MARKETPLACE — top community-built agents (seeded for the demo)
// ===========================================================================

export type MarketplaceEntry = {
  slug: string;
  name: string;
  nameAr: string;
  pack: string;
  topic: string;
  author: string;
  version: string;
  /** Number of orgs that have installed this agent. */
  installs: number;
  /** Average rating, 0-5. */
  rating: number;
  /** Hex color used in the orbit visualization. */
  color: string;
  /** One-line tagline. */
  tagline: string;
  taglineAr: string;
  /** Vote distribution from the council (Phase 3) when this agent has
      participated — used as a quick health signal. */
  voteHealth: number; // -1..1
};

export const MARKETPLACE_AGENTS: MarketplaceEntry[] = [
  { slug: "dairy:expiry-watcher", name: "Expiry Watcher", nameAr: "حارس الصلاحية", pack: "dairy", topic: "expiry-risk", author: "h-nerve", version: "1.4.2", installs: 318, rating: 4.8, color: "#b3733e", tagline: "Routes near-expiry batches to retail before they spoil.", taglineAr: "يحوّل الدفعات القريبة من الانتهاء إلى التجزئة قبل التلف.", voteHealth: 0.82 },
  { slug: "agri:soil-moisture", name: "Soil Moisture Sentinel", nameAr: "حارس رطوبة التربة", pack: "agri", topic: "irrigation", author: "loran-labs", version: "2.1.0", installs: 287, rating: 4.7, color: "#5a7d4a", tagline: "Auto-escalates sub-30% moisture readings within 24h.", taglineAr: "تصعيد فوري للقراءات تحت ٣٠٪ خلال ٢٤ ساعة.", voteHealth: 0.74 },
  { slug: "hotel:demand-pulse", name: "Demand Pulse", nameAr: "نبض الطلب", pack: "hospitality", topic: "occupancy", author: "kasbah-tools", version: "1.3.1", installs: 254, rating: 4.6, color: "#7d6f95", tagline: "Predicts heat-driven occupancy shifts 5+ days out.", taglineAr: "يتنبأ بتحوّلات الإشغال بسبب الحرارة قبل ٥ أيام أو أكثر.", voteHealth: 0.71 },
  { slug: "finance:cashflow-vigil", name: "Cashflow Vigil", nameAr: "حارس السيولة", pack: "finance", topic: "liquidity", author: "h-nerve", version: "3.0.0", installs: 241, rating: 4.9, color: "#1f4e4a", tagline: "Flags liquidity gaps 14 days before they bite.", taglineAr: "يرصد فجوات السيولة قبل ١٤ يوماً من ضيق الموقف.", voteHealth: 0.88 },
  { slug: "agri:yield-arbiter", name: "Yield Arbiter", nameAr: "حكم الإنتاجية", pack: "agri", topic: "yield-margin", author: "sahara-co", version: "1.2.5", installs: 219, rating: 4.5, color: "#a5666a", tagline: "Reconciles forecasted vs. realized yield, weekly.", taglineAr: "يطابق التوقّع بالإنتاج الفعلي أسبوعياً.", voteHealth: 0.67 },
  { slug: "hotel:brand-guard", name: "Brand Guard", nameAr: "حارس العلامة", pack: "hospitality", topic: "review-quality", author: "northbay", version: "1.1.0", installs: 198, rating: 4.4, color: "#b85c38", tagline: "Triages negative-leaning reviews before they spread.", taglineAr: "يصنّف المراجعات السلبية قبل أن تنتشر.", voteHealth: 0.62 },
  { slug: "dairy:qc-arbiter", name: "QC Arbiter", nameAr: "حكم الجودة", pack: "dairy", topic: "qc-pass", author: "blue-meadow", version: "1.5.0", installs: 184, rating: 4.6, color: "#4a6f80", tagline: "Cross-checks lab results against ISTA + JS 1112.", taglineAr: "يطابق نتائج المختبر مع ISTA و JS 1112.", voteHealth: 0.79 },
  { slug: "edu:cohort-pulse", name: "Cohort Pulse", nameAr: "نبض الكوهورت", pack: "edu", topic: "engagement", author: "olive-tree", version: "0.9.4", installs: 162, rating: 4.3, color: "#c89b3c", tagline: "Tracks engagement decay across program cohorts.", taglineAr: "يرصد تراجع التفاعل في كوهورتات البرامج.", voteHealth: 0.55 },
  { slug: "logistics:eta-arbiter", name: "ETA Arbiter", nameAr: "حكم وقت الوصول", pack: "logistics", topic: "delivery-eta", author: "northbay-ops", version: "2.0.1", installs: 159, rating: 4.5, color: "#8c7250", tagline: "Reconciles route ETAs against driver realities.", taglineAr: "يطابق وقت وصول المسار مع الواقع الميداني.", voteHealth: 0.71 },
  { slug: "retail:promo-watcher", name: "Promo Watcher", nameAr: "حارس العروض", pack: "retail", topic: "promo-roi", author: "rivermint", version: "1.0.6", installs: 147, rating: 4.2, color: "#cf9d9d", tagline: "Kills underperforming promos within 48h.", taglineAr: "يوقف العروض الضعيفة خلال ٤٨ ساعة.", voteHealth: 0.51 },
  { slug: "finance:fx-arbiter", name: "FX Arbiter", nameAr: "حكم العملة", pack: "finance", topic: "fx-exposure", author: "h-nerve", version: "2.3.0", installs: 138, rating: 4.7, color: "#6b1d23", tagline: "Hedges JOD/USD/EUR exposure rolling 90-day.", taglineAr: "يحوّط مخاطر JOD/USD/EUR على نافذة ٩٠ يوماً.", voteHealth: 0.74 },
  { slug: "manufacturing:quality-arbiter", name: "Quality Arbiter", nameAr: "حكم التصنيع", pack: "manufacturing", topic: "yield-margin", author: "highland-mfg", version: "1.4.0", installs: 124, rating: 4.4, color: "#9bb2c4", tagline: "Routes line defects to root-cause graph nodes.", taglineAr: "يربط عيوب الخط بعقد الأسباب الجذرية.", voteHealth: 0.6 },
  { slug: "agri:weather-prophet", name: "Weather Prophet", nameAr: "نبيّ الطقس", pack: "agri", topic: "irrigation", author: "sahara-co", version: "1.7.2", installs: 117, rating: 4.3, color: "#1f4e4a", tagline: "Couples 7-day forecasts to greenhouse irrigation.", taglineAr: "يربط توقع ٧ أيام بجدولة ري الدفيئة.", voteHealth: 0.66 },
  { slug: "hotel:ladr-coach", name: "LADR Coach", nameAr: "مدرب LADR", pack: "hospitality", topic: "occupancy", author: "kasbah-tools", version: "0.8.0", installs: 108, rating: 4.0, color: "#7d5a3a", tagline: "Suggests rate moves to hit weekly LADR target.", taglineAr: "يقترح تعديلات سعرية لبلوغ هدف LADR.", voteHealth: 0.45 },
  { slug: "edu:dropout-watcher", name: "Dropout Watcher", nameAr: "حارس التسرّب", pack: "edu", topic: "engagement", author: "olive-tree", version: "1.1.0", installs: 96, rating: 4.5, color: "#cf9d9d", tagline: "Flags students at high dropout risk 21 days early.", taglineAr: "يرصد طلاب التسرّب قبل ٢١ يوماً من الانفصال.", voteHealth: 0.61 },
  { slug: "logistics:fuel-arbiter", name: "Fuel Arbiter", nameAr: "حكم الوقود", pack: "logistics", topic: "fuel-spend", author: "northbay-ops", version: "1.0.3", installs: 89, rating: 4.2, color: "#5a7d4a", tagline: "Audits fuel spend per route per driver weekly.", taglineAr: "يدقّق إنفاق الوقود لكل مسار وسائق أسبوعياً.", voteHealth: 0.58 },
  { slug: "retail:sku-arbiter", name: "SKU Arbiter", nameAr: "حكم المخزون", pack: "retail", topic: "stock-velocity", author: "rivermint", version: "0.7.1", installs: 81, rating: 4.0, color: "#b3733e", tagline: "Auto-archives slow-moving SKUs.", taglineAr: "يؤرشف المنتجات بطيئة الحركة تلقائياً.", voteHealth: 0.42 },
  { slug: "finance:reconciliation-arbiter", name: "Reconciliation Arbiter", nameAr: "حكم التسوية", pack: "finance", topic: "reconciliation", author: "h-nerve", version: "1.2.0", installs: 74, rating: 4.6, color: "#0d2731", tagline: "Reconciles bank lines against ledger nightly.", taglineAr: "يطابق حركات البنك مع الدفاتر يومياً.", voteHealth: 0.69 },
  { slug: "manufacturing:downtime-watcher", name: "Downtime Watcher", nameAr: "حارس التعطّل", pack: "manufacturing", topic: "downtime", author: "highland-mfg", version: "0.9.0", installs: 68, rating: 4.1, color: "#a5666a", tagline: "Predicts cell downtime from vibration patterns.", taglineAr: "يتنبأ بتعطّل الخلية من أنماط الاهتزاز.", voteHealth: 0.55 },
  { slug: "dairy:supplier-arbiter", name: "Supplier Arbiter", nameAr: "حكم الموردين", pack: "dairy", topic: "supplier-quality", author: "blue-meadow", version: "1.0.0", installs: 61, rating: 4.0, color: "#7d6f95", tagline: "Ranks raw-milk suppliers on rolling QC pass rate.", taglineAr: "يرتّب موردي الحليب الخام بنسبة اجتياز QC.", voteHealth: 0.49 },
  { slug: "hotel:upsell-coach", name: "Upsell Coach", nameAr: "مدرّب الترقية", pack: "hospitality", topic: "upsell", author: "kasbah-tools", version: "0.6.0", installs: 53, rating: 3.9, color: "#c89b3c", tagline: "Suggests upgrade offers at check-in based on stay history.", taglineAr: "يقترح ترقيات عند الوصول بناء على تاريخ الإقامة.", voteHealth: 0.4 },
  { slug: "edu:rubric-arbiter", name: "Rubric Arbiter", nameAr: "حكم المعايير", pack: "edu", topic: "grading", author: "olive-tree", version: "0.5.2", installs: 47, rating: 4.0, color: "#9bb2c4", tagline: "Cross-checks grader rubrics for drift.", taglineAr: "يطابق معايير المصحّحين للحدّ من الانحراف.", voteHealth: 0.46 },
  { slug: "logistics:port-arbiter", name: "Port Arbiter", nameAr: "حكم الموانئ", pack: "logistics", topic: "port-eta", author: "northbay-ops", version: "0.4.0", installs: 41, rating: 3.8, color: "#6b1d23", tagline: "Tracks port congestion vs. promised berth windows.", taglineAr: "يرصد ازدحام الموانئ مقابل نوافذ الإرساء.", voteHealth: 0.38 },
  { slug: "retail:basket-arbiter", name: "Basket Arbiter", nameAr: "حكم السلال", pack: "retail", topic: "basket-mix", author: "rivermint", version: "0.3.5", installs: 35, rating: 3.7, color: "#cf9d9d", tagline: "Surfaces basket-mix anomalies before stockout.", taglineAr: "يكتشف شذوذ تركيبة السلال قبل النفاد.", voteHealth: 0.32 },
];

// ===========================================================================
// OpenAPI document — served from /api/protocol/openapi
// ===========================================================================

export const OPENAPI_DOC = {
  openapi: "3.1.0",
  info: {
    title: "H-Nerve Protocol",
    version: PROTOCOL_VERSION,
    description:
      "Public surface for the H-Nerve intelligence layer. Agents, packs, themes, brain queries.",
    contact: { name: "H-Nerve", url: "https://h-nerve.dev" },
    license: { name: "Apache-2.0" },
  },
  servers: [{ url: "/api/v1", description: "Default scope" }],
  paths: {
    "/agents": {
      get: {
        summary: "List installed agents",
        responses: {
          "200": {
            description: "Agent list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Agent" } } } },
          },
        },
      },
      post: {
        summary: "Register a new agent",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AgentRegistration" } } },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/agents/{slug}/decide": {
      post: {
        summary: "Invoke an agent",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AgentInput" } } },
        },
        responses: {
          "200": {
            description: "Agent decision",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AgentDecision" } } },
          },
        },
      },
    },
    "/packs": {
      get: { summary: "List installed industry packs" },
      post: { summary: "Install a pack" },
    },
    "/themes": {
      get: { summary: "List available themes" },
      post: { summary: "Register a theme (JSON)" },
    },
    "/brain/iq": {
      get: {
        summary: "Latest brain IQ + drivers",
        responses: { "200": { description: "Current IQ snapshot" } },
      },
    },
    "/brain/insights": {
      get: { summary: "List recent brain-generated insights" },
      post: { summary: "Submit a new insight (manual or from an agent)" },
    },
    "/brain/plans": {
      get: { summary: "List active and draft plans" },
    },
  },
  components: {
    schemas: {
      Agent: { type: "object" },
      AgentRegistration: { type: "object" },
      AgentInput: { type: "object" },
      AgentDecision: {
        type: "object",
        properties: {
          vote: { type: "integer", enum: [-1, 0, 1] },
          rationale: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          citations: { type: "array", items: { type: "object" } },
        },
        required: ["vote", "rationale", "confidence"],
      },
    },
  },
};
