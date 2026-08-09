// lib/voac/roles.ts — the VOAC role registry.
//
// A role is: an identity, a sector it serves, a skill document that carries its
// instructions, and a default topology. That is the whole contract. Adding a
// role is one markdown file plus one entry here — deliberately cheap, because
// the roster is meant to grow with the group, not with the architecture.
//
// WHAT IS NOT HERE, ON PURPOSE: a per-company supervisor role.
// A supervisor placed over agents that share a company has neither information
// nor authority its subordinates lack — it can only summarise and pass through,
// which costs a hop and adds a place for the answer to degrade. The Group
// Broker is the single exception: it is the one layer that genuinely holds
// something the roles below it do not, namely the cross-company view and the
// standing to arbitrate between two companies' P&Ls.
//
// Pure module: no DB, no LLM, no request context.

import { SKILL_DOCS, type SkillDoc } from "./skills.generated";
import type { Topology } from "./topology";

/** Company.sector values (see prisma/schema/companies.prisma), plus GROUP. */
export type VoacSector =
  | "HOSPITALITY"
  | "DAIRY"
  | "AGRICULTURE"
  | "EDUCATION"
  | "INVESTMENT"
  | "TRADE"
  | "GROUP";

export type VoacRole = {
  id: string;
  labelAr: string;
  labelEn: string;
  /**
   * What this agent does, in one plain sentence — no jargon, no topology name.
   *
   * HAND-WRITTEN, never derived from the skill document. Those markdown files
   * are SkillOpt's trainable surface and are compiled by
   * `scripts/build/build-voac-skills.mjs`; parsing UI copy out of them would
   * couple two things that must be free to move independently — a prompt tweak
   * would silently rewrite the org chart.
   */
  jobAr: string;
  jobEn: string;
  /** The decision it brings a human. The whole company exists to produce these. */
  asksAr: string;
  asksEn: string;
  sector: VoacSector;
  /** Key into SKILL_DOCS — the markdown SkillOpt trains. */
  skillDocId: string;
  defaultTopology: Topology;
  /** Brain tools this role may call. Names match src/lib/brain/tools/index.ts. */
  tools: string[];
};

/** The Group Broker — the only supervisor in the company. */
export const GROUP_BROKER_ID = "group-broker";

export const VOAC_ROLES: VoacRole[] = [
  {
    id: GROUP_BROKER_ID,
    labelAr: "وسيط المجموعة",
    labelEn: "Group Broker",
    jobAr: "يراقب ما يقع بين الشركات — فائض شركة ونقص أخرى — ويجمع الأصوات المتنازعة على طاولة واحدة.",
    jobEn: "Watches what falls between the companies — one's surplus against another's shortage — and brings the competing views to one table.",
    asksAr: "هل نحوّل قيمة من شركة إلى أخرى، ومن يتحمّل الكلفة؟",
    asksEn: "Should value move from one company to another, and who absorbs the cost?",
    sector: "GROUP",
    skillDocId: "group-broker",
    // Cross-company work is the definition of competing objectives: two P&Ls,
    // two managers. Positions get argued in parallel and reconciled rather
    // than one voice quietly deciding for both companies.
    defaultTopology: "parallel",
    tools: ["pullFacts", "causalSubgraph", "councilDebate", "recallMemory", "narrate"],
  },
  // ── HOSPITALITY ────────────────────────────────────────────────────
  {
    id: "hospitality-revenue-controller",
    labelAr: "مراقب إيرادات الضيافة",
    labelEn: "Hospitality Revenue Controller",
    jobAr: "يتابع الإشغال مقابل السعر: أين تُباع الغرف بأقل من قيمتها، وأين يقتل السعر الطلب.",
    jobEn: "Tracks occupancy against rate — where rooms are selling below their worth, and where the price is killing demand.",
    asksAr: "هل نغيّر سعر فئة غرف بعينها هذا الأسبوع؟",
    asksEn: "Should we move the rate on a specific room class this week?",
    sector: "HOSPITALITY",
    skillDocId: "hospitality-revenue-controller",
    defaultTopology: "route",
    tools: ["pullFacts", "simulate", "narrate"],
  },
  {
    id: "occupancy-forecaster",
    labelAr: "متنبّئ الإشغال",
    labelEn: "Occupancy Forecaster",
    jobAr: "يقرأ الحجوزات القادمة والموسم ليقول كم غرفة ستكون مشغولة قبل أن تصل، لا بعدها.",
    jobEn: "Reads forward bookings and the season to say how full the hotel will be before it happens, not after.",
    asksAr: "هل نفتح أو نغلق التوفّر لفترة قادمة بناءً على التوقّع؟",
    asksEn: "Should we open or hold availability for an upcoming window?",
    sector: "HOSPITALITY",
    skillDocId: "occupancy-forecaster",
    // Forward-looking work is a chain by nature: you cannot reason about next
    // month's occupancy before this month's bookings and the seasonal shape
    // are on the table. Parallelising it would mean guessing first.
    defaultTopology: "chain",
    tools: ["pullFacts", "simulate", "recallMemory", "narrate"],
  },
  {
    id: "fnb-cost-controller",
    labelAr: "مراقب تكلفة الأغذية والمشروبات",
    labelEn: "F&B Cost Controller",
    jobAr: "يقيس كلفة الطبق مقابل سعره، ويلاحق الهدر في المطبخ قبل أن يصبح رقماً في آخر الشهر.",
    jobEn: "Measures plate cost against menu price, and catches kitchen waste before it becomes a month-end number.",
    asksAr: "هل نغيّر مورّداً أو نسحب صنفاً خاسراً من القائمة؟",
    asksEn: "Should we change a supplier, or pull a loss-making item from the menu?",
    sector: "HOSPITALITY",
    skillDocId: "fnb-cost-controller",
    defaultTopology: "route",
    tools: ["pullFacts", "causalSubgraph", "narrate"],
  },

  // ── DAIRY ──────────────────────────────────────────────────────────
  {
    id: "dairy-yield-controller",
    labelAr: "مراقب إنتاجية الألبان",
    labelEn: "Dairy Yield Controller",
    jobAr: "يتابع كم لتراً خرج فعلاً مقابل ما كان متوقعاً، ويبحث عن سبب الفجوة في العلف والقطيع والتشغيل.",
    jobEn: "Tracks litres actually produced against what was expected, and traces the gap back to feed, herd, or plant.",
    asksAr: "هل نغيّر خلطة العلف أو جدول الحلْب؟",
    asksEn: "Should we change the feed mix or the milking schedule?",
    sector: "DAIRY",
    skillDocId: "dairy-yield-controller",
    defaultTopology: "route",
    tools: ["pullFacts", "causalSubgraph", "narrate"],
  },
  {
    id: "expiry-routing-officer",
    labelAr: "ضابط توجيه الصلاحية",
    labelEn: "Expiry Routing Officer",
    jobAr: "يراقب الدفعات القريبة من انتهاء صلاحيتها، ويحسب هل يمكن تحويلها لمشترٍ آخر قبل أن تُشطب.",
    jobEn: "Watches batches nearing expiry and works out whether they can reach another buyer before they are written off.",
    asksAr: "هل نحوّل هذه الدفعة إلى الفنادق بدل شطبها — وبأي هامش؟",
    asksEn: "Should this batch go to the hotels instead of the write-off pile — and at what margin?",
    sector: "DAIRY",
    skillDocId: "expiry-routing-officer",
    // Diversion is a sequence with a hard gate in the middle: read the batch,
    // simulate the recovery, and only THEN check it against the receiving
    // buyer's ordering cycle. A route topology would skip the gate.
    defaultTopology: "chain",
    tools: ["pullFacts", "simulate", "causalSubgraph", "narrate"],
  },

  // ── AGRICULTURE ────────────────────────────────────────────────────
  {
    id: "feed-supply-planner",
    labelAr: "مخطط إمداد الأعلاف",
    labelEn: "Feed Supply Planner",
    jobAr: "يوازن ما تنتجه المزرعة من علف مع ما يحتاجه القطيع، ويحذّر قبل النقص لا بعده.",
    jobEn: "Balances the feed the farm produces against what the herd needs, and warns before a shortage rather than after.",
    asksAr: "هل نشتري علفاً من الخارج الآن أم ننتظر الحصاد؟",
    asksEn: "Should we buy feed in now, or wait for the harvest?",
    sector: "AGRICULTURE",
    skillDocId: "feed-supply-planner",
    defaultTopology: "chain",
    tools: ["pullFacts", "simulate", "narrate"],
  },
  {
    id: "crop-cycle-planner",
    labelAr: "مخطط الدورة الزراعية",
    labelEn: "Crop Cycle Planner",
    jobAr: "يخطّط ماذا يُزرع في أي حقل ومتى، بحسب الموسم وما احتاجته الدورة السابقة فعلاً.",
    jobEn: "Plans what goes in which field and when, from the season and what the last cycle actually needed.",
    asksAr: "هل نغيّر محصول حقل بعينه في الدورة القادمة؟",
    asksEn: "Should we change what a given field grows next cycle?",
    sector: "AGRICULTURE",
    skillDocId: "crop-cycle-planner",
    defaultTopology: "chain",
    tools: ["pullFacts", "simulate", "recallMemory", "narrate"],
  },

  // ── EDUCATION ──────────────────────────────────────────────────────
  {
    id: "education-enrolment-analyst",
    labelAr: "محلل الالتحاق التعليمي",
    labelEn: "Education Enrolment Analyst",
    jobAr: "يتابع أعداد الملتحقين مقابل الطاقة الاستيعابية للبرامج، ويكشف أي برنامج يمتلئ وأيّها يفرغ.",
    jobEn: "Tracks intake against programme capacity, and shows which programmes are filling and which are emptying.",
    asksAr: "هل نفتح شعبة إضافية أو نوقف برنامجاً ضعيف الالتحاق؟",
    asksEn: "Should we open another cohort, or stop a programme nobody is enrolling in?",
    sector: "EDUCATION",
    skillDocId: "education-enrolment-analyst",
    defaultTopology: "route",
    tools: ["pullFacts", "narrate"],
  },
  {
    id: "student-retention-analyst",
    labelAr: "محلل بقاء الطلبة",
    labelEn: "Student Retention Analyst",
    jobAr: "يبحث عن الطلبة المعرّضين للتسرّب قبل أن يتسرّبوا، ويربط ذلك بأسبابه لا بأعراضه.",
    jobEn: "Looks for students at risk of dropping out before they do, and ties it to causes rather than symptoms.",
    asksAr: "هل نتدخّل مع مجموعة طلابية بعينها هذا الفصل؟",
    asksEn: "Should we intervene with a specific student group this term?",
    sector: "EDUCATION",
    skillDocId: "student-retention-analyst",
    defaultTopology: "route",
    tools: ["pullFacts", "causalSubgraph", "narrate"],
  },

  // ── INVESTMENT ─────────────────────────────────────────────────────
  {
    id: "finance-controller",
    labelAr: "المراقب المالي",
    labelEn: "Finance Controller",
    jobAr: "يقرأ دفتر الأستاذ والعقود معاً، ويلاحق البنود التي تنزف بهدوء عبر الشركات.",
    jobEn: "Reads the ledger and the contracts together, and chases the lines quietly bleeding across the companies.",
    asksAr: "هل نوقف بند إنفاق أو نعيد التفاوض على عقد؟",
    asksEn: "Should we stop a line of spend, or reopen a contract?",
    sector: "INVESTMENT",
    skillDocId: "finance-controller",
    defaultTopology: "chain",
    tools: ["pullFacts", "causalSubgraph", "retrieveDocuments", "narrate"],
  },
  {
    id: "cash-flow-controller",
    labelAr: "مراقب التدفّق النقدي",
    labelEn: "Cash Flow Controller",
    jobAr: "يتتبّع النقد الداخل والخارج زمنياً، ويحذّر من الشهر الذي لن يكفي فيه الرصيد.",
    jobEn: "Follows cash in and out along the calendar, and flags the month where the balance will not stretch.",
    asksAr: "هل نؤجّل دفعة أو نسرّع تحصيلاً هذا الشهر؟",
    asksEn: "Should we defer a payment or accelerate a collection this month?",
    sector: "INVESTMENT",
    skillDocId: "cash-flow-controller",
    defaultTopology: "chain",
    tools: ["pullFacts", "simulate", "narrate"],
  },

  // ── TRADE ──────────────────────────────────────────────────────────
  // Added to close a real coverage gap: the map listed MAHER and TABAQAT under
  // "companies with no matching role yet" because no TRADE role existed. That
  // listing was honest, and the honest fix is roles, not hiding the list.
  {
    id: "trade-margin-controller",
    labelAr: "مراقب هامش التجارة",
    labelEn: "Trade Margin Controller",
    jobAr: "يقارن سعر الشراء بسعر البيع صنفاً صنفاً، ويكشف ما يُباع بخسارة دون أن ينتبه أحد.",
    jobEn: "Compares buy price to sell price line by line, and surfaces what is being sold at a loss unnoticed.",
    asksAr: "هل نرفع سعر صنف أو نتوقّف عن بيعه؟",
    asksEn: "Should we raise the price on a line, or stop carrying it?",
    sector: "TRADE",
    skillDocId: "trade-margin-controller",
    defaultTopology: "route",
    tools: ["pullFacts", "causalSubgraph", "narrate"],
  },
  {
    id: "supplier-terms-analyst",
    labelAr: "محلل شروط الموردين",
    labelEn: "Supplier Terms Analyst",
    jobAr: "يقرأ عقود المورّدين ويقارن الشروط الفعلية بما هو مكتوب: مهل السداد، الخصومات، الالتزامات.",
    jobEn: "Reads supplier contracts and checks the terms actually being applied against the ones on paper — payment windows, discounts, commitments.",
    asksAr: "هل نعيد التفاوض مع مورّد بعينه قبل التجديد؟",
    asksEn: "Should we reopen terms with a specific supplier before renewal?",
    sector: "TRADE",
    skillDocId: "supplier-terms-analyst",
    // Contract terms live in documents, so this one reads before it reasons.
    defaultTopology: "chain",
    tools: ["pullFacts", "retrieveDocuments", "narrate"],
  },
];

const BY_ID = new Map(VOAC_ROLES.map((r) => [r.id, r]));

export function getRole(id: string): VoacRole | undefined {
  return BY_ID.get(id);
}

/**
 * The default roster for a company in this sector.
 *
 * A roster is DATA — which roles are switched on — not an org layer. Two
 * hotels get the same role with a different companyId, and that is correct:
 * inventing a distinct agent per company would be a WHERE clause wearing an
 * org chart.
 *
 * The Group Broker is never in a company roster. It belongs to the group.
 */
export function defaultRosterFor(sector: string): string[] {
  return VOAC_ROLES.filter((r) => r.sector === sector && r.id !== GROUP_BROKER_ID).map((r) => r.id);
}

/** Resolve the skill document a role runs on. */
export function skillDocFor(roleId: string): SkillDoc | undefined {
  const role = BY_ID.get(roleId);
  if (!role) return undefined;
  return SKILL_DOCS[role.skillDocId];
}

/**
 * The version string recorded on AgentRun.skillVersion.
 *
 * Falls back to "unknown" rather than throwing: a run that happened must still
 * be recordable even if its role was renamed out from under it. An unattributable
 * run is bad; an unrecorded one is worse.
 */
export function skillVersionFor(roleId: string): string {
  return skillDocFor(roleId)?.version ?? "unknown";
}

/** Serialize a roster for VoacRoster.roleIds (comma-joined, order-stable). */
export function serializeRoster(roleIds: string[]): string {
  return [...new Set(roleIds)].filter((id) => BY_ID.has(id)).sort().join(",");
}

/** Parse VoacRoster.roleIds back into known roles, silently dropping stale ids. */
export function parseRoster(raw: string | null | undefined): VoacRole[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => BY_ID.get(id))
    .filter((r): r is VoacRole => Boolean(r));
}
