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
    sector: "GROUP",
    skillDocId: "group-broker",
    // Cross-company work is the definition of competing objectives: two P&Ls,
    // two managers. Positions get argued in parallel and reconciled rather
    // than one voice quietly deciding for both companies.
    defaultTopology: "parallel",
    tools: ["pullFacts", "causalSubgraph", "councilDebate", "recallMemory", "narrate"],
  },
  {
    id: "hospitality-revenue-controller",
    labelAr: "مراقب إيرادات الضيافة",
    labelEn: "Hospitality Revenue Controller",
    sector: "HOSPITALITY",
    skillDocId: "hospitality-revenue-controller",
    defaultTopology: "route",
    tools: ["pullFacts", "simulate", "narrate"],
  },
  {
    id: "dairy-yield-controller",
    labelAr: "مراقب إنتاجية الألبان",
    labelEn: "Dairy Yield Controller",
    sector: "DAIRY",
    skillDocId: "dairy-yield-controller",
    defaultTopology: "route",
    tools: ["pullFacts", "causalSubgraph", "narrate"],
  },
  {
    id: "feed-supply-planner",
    labelAr: "مخطط إمداد الأعلاف",
    labelEn: "Feed Supply Planner",
    sector: "AGRICULTURE",
    skillDocId: "feed-supply-planner",
    defaultTopology: "chain",
    tools: ["pullFacts", "simulate", "narrate"],
  },
  {
    id: "education-enrolment-analyst",
    labelAr: "محلل الالتحاق التعليمي",
    labelEn: "Education Enrolment Analyst",
    sector: "EDUCATION",
    skillDocId: "education-enrolment-analyst",
    defaultTopology: "route",
    tools: ["pullFacts", "narrate"],
  },
  {
    id: "finance-controller",
    labelAr: "المراقب المالي",
    labelEn: "Finance Controller",
    sector: "INVESTMENT",
    skillDocId: "finance-controller",
    defaultTopology: "chain",
    tools: ["pullFacts", "causalSubgraph", "retrieveDocuments", "narrate"],
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
