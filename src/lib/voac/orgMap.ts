// lib/voac/orgMap.ts — the live org chart of the agent company.
//
// The ledger answers "what happened". This answers "who exists, where they sit,
// and what they are doing right now" — the question you actually ask when you
// want to understand an organisation rather than audit it.
//
// SHAPE OF THE COMPANY, restated because the picture must not drift from it:
// exactly ONE supervisor (the Group Broker, companyId=null) over per-company
// ROSTERS. A roster is data — which roles are switched on — not an org layer.
// Two hotels get the same role with a different companyId, and the map must
// show that honestly rather than inventing a per-company manager to make the
// diagram look symmetrical.
//
// Pure: no DB, no clock beyond the `now` you pass in. The live twin
// (orgMap.live.ts) fetches counts; every judgement about what a node's state
// MEANS is made here, where it can be tested.

import { VOAC_ROLES, GROUP_BROKER_ID, type VoacRole } from "./roles";

/**
 * What a node is doing, in the order a reader cares about.
 *
 * "waiting" outranks "active" deliberately: an agent holding a proposal a human
 * has not answered is the single most important state on the map — it is the
 * one asking something of a person. A busy agent nobody is blocked on is less
 * urgent than an idle one that is.
 */
export type AgentState = "waiting" | "attention" | "active" | "idle" | "dormant";

export type AgentStats = {
  runs: number;
  lastRunAt: Date | null;
  lastStatus: string | null;
  pendingProposals: number;
};

export type AgentNode = {
  roleId: string;
  labelAr: string;
  labelEn: string;
  sector: string;
  topology: string;
  tools: string[];
  skillDocId: string;
  /** null for the Group Broker — it belongs to the group, not a company. */
  companyId: string | null;
  companyCode: string | null;
  state: AgentState;
  stats: AgentStats;
};

export type CompanyBranch = {
  companyId: string;
  code: string;
  name: string;
  sector: string;
  agents: AgentNode[];
  pendingProposals: number;
  runs: number;
};

export type OrgMap = {
  broker: AgentNode;
  branches: CompanyBranch[];
  totals: {
    agents: number;
    companies: number;
    runs: number;
    pending: number;
    /** Companies with a sector we have no role for — an honest gap, not hidden. */
    uncovered: string[];
  };
};

export type CompanyInput = { id: string; code: string; name: string; sector: string };

/** Key for the stats map: `${companyId ?? "GROUP"}::${roleId}`. */
export function statKey(companyId: string | null, roleId: string): string {
  return `${companyId ?? "GROUP"}::${roleId}`;
}

const EMPTY: AgentStats = { runs: 0, lastRunAt: null, lastStatus: null, pendingProposals: 0 };

/** Statuses that mean the run did not produce a usable answer. */
const TROUBLE = new Set(["FAILED", "BUDGET_EXHAUSTED"]);

/** How long after its last run an agent still reads as "active". */
const ACTIVE_WINDOW_HOURS = 48;

/**
 * Decide what a node's state is.
 *
 * Ordered most-urgent-first. Note REFUSED and STUB are NOT trouble: a refusal
 * is the system working (it declined before spending), and STUB means no model
 * was configured. Painting either red would teach an operator that the safety
 * boundary is a fault.
 */
export function agentState(stats: AgentStats, now: Date): AgentState {
  if (stats.pendingProposals > 0) return "waiting";
  if (stats.lastStatus && TROUBLE.has(stats.lastStatus)) return "attention";
  if (stats.runs === 0) return "dormant";
  if (stats.lastRunAt) {
    const hours = (now.getTime() - stats.lastRunAt.getTime()) / 3_600_000;
    if (hours <= ACTIVE_WINDOW_HOURS) return "active";
  }
  return "idle";
}

function toNode(
  role: VoacRole,
  company: CompanyInput | null,
  stats: AgentStats,
  now: Date,
): AgentNode {
  return {
    roleId: role.id,
    labelAr: role.labelAr,
    labelEn: role.labelEn,
    sector: role.sector,
    topology: role.defaultTopology,
    tools: role.tools,
    skillDocId: role.skillDocId,
    companyId: company?.id ?? null,
    companyCode: company?.code ?? null,
    state: agentState(stats, now),
    stats,
  };
}

/**
 * Build the full org chart.
 *
 * Companies with no matching role produce NO branch and are listed in
 * `totals.uncovered` instead — a company the agent company cannot serve is a
 * real gap, and silently omitting it from both the map and the count is how
 * you end up believing coverage is complete when it is not.
 */
export function buildOrgMap(args: {
  companies: CompanyInput[];
  stats: Map<string, AgentStats>;
  now?: Date;
  roles?: VoacRole[];
}): OrgMap {
  const now = args.now ?? new Date();
  const roles = args.roles ?? VOAC_ROLES;
  const get = (companyId: string | null, roleId: string) =>
    args.stats.get(statKey(companyId, roleId)) ?? EMPTY;

  const brokerRole = roles.find((r) => r.id === GROUP_BROKER_ID);
  if (!brokerRole) throw new Error("The Group Broker role is missing from the registry.");
  const broker = toNode(brokerRole, null, get(null, GROUP_BROKER_ID), now);

  const branches: CompanyBranch[] = [];
  const uncovered: string[] = [];

  for (const company of args.companies) {
    const sectorRoles = roles.filter(
      (r) => r.sector === company.sector && r.id !== GROUP_BROKER_ID,
    );
    if (sectorRoles.length === 0) {
      uncovered.push(company.code);
      continue;
    }
    const agents = sectorRoles.map((r) => toNode(r, company, get(company.id, r.id), now));
    branches.push({
      companyId: company.id,
      code: company.code,
      name: company.name,
      sector: company.sector,
      agents,
      pendingProposals: agents.reduce((s, a) => s + a.stats.pendingProposals, 0),
      runs: agents.reduce((s, a) => s + a.stats.runs, 0),
    });
  }

  // Branches with someone waiting on a human float to the top — the map should
  // put what needs a person where the eye lands first.
  branches.sort((a, b) => {
    if (a.pendingProposals !== b.pendingProposals) return b.pendingProposals - a.pendingProposals;
    if (a.runs !== b.runs) return b.runs - a.runs;
    return a.code.localeCompare(b.code);
  });

  return {
    broker,
    branches,
    totals: {
      agents: branches.reduce((s, b) => s + b.agents.length, 0) + 1,
      companies: branches.length,
      runs: branches.reduce((s, b) => s + b.runs, 0) + broker.stats.runs,
      pending: branches.reduce((s, b) => s + b.pendingProposals, 0) + broker.stats.pendingProposals,
      uncovered,
    },
  };
}

/** Display metadata per state — colour tone and bilingual label. */
export function stateMeta(state: AgentState): {
  ar: string;
  en: string;
  tone: "waiting" | "attention" | "active" | "idle" | "dormant";
} {
  switch (state) {
    case "waiting":
      return { ar: "بانتظار قرارك", en: "Waiting on you", tone: "waiting" };
    case "attention":
      return { ar: "يحتاج انتباهاً", en: "Needs attention", tone: "attention" };
    case "active":
      return { ar: "نشِط", en: "Active", tone: "active" };
    case "idle":
      return { ar: "خامل", en: "Idle", tone: "idle" };
    case "dormant":
      return { ar: "لم يعمل بعد", en: "Never run", tone: "dormant" };
  }
}
