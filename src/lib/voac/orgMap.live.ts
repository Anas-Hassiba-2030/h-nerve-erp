// lib/voac/orgMap.live.ts — the thin DB twin of orgMap.ts.
//
// Fetches the counts; every judgement about what they MEAN lives in the pure
// module. Same split as runStore / schedule.
//
// CROSS-TENANT INTENT: the org map is group-wide by definition — it exists to
// show the whole company, including the Group Broker (companyId=null) whose
// entire purpose is to sit above tenants. Reading it through the tenant-scoped
// client would empty it the moment the operator's cookie points at one company,
// which is exactly the bug that made /voac look broken (see ../../app/(app)/voac/page.tsx).
import { prismaUnscoped as prisma } from "@/lib/db/db";
import { buildOrgMap, statKey, type AgentStats, type CompanyInput, type OrgMap } from "./orgMap";

export async function loadOrgMap(now: Date = new Date()): Promise<OrgMap> {
  const [companies, runGroups, pendingGroups] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, code: true, name: true, sector: true },
      orderBy: { code: "asc" },
      take: 200,
    }),
    // Run counts per (company, role). companyId is nullable — null is the
    // Group Broker, and statKey folds that to "GROUP".
    prisma.agentRun.groupBy({
      by: ["companyId", "roleId"],
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.agentProposal.groupBy({
      by: ["companyId"],
      where: { status: "PENDING" },
      _count: { _all: true },
    }),
  ]);

  // Last status needs the actual latest row per group, which groupBy cannot
  // give directly. One bounded read of recent runs covers it — the map only
  // cares about the most recent per pair.
  const recent = await prisma.agentRun.findMany({
    select: { companyId: true, roleId: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const lastStatus = new Map<string, string>();
  for (const r of recent) {
    const k = statKey(r.companyId, r.roleId);
    if (!lastStatus.has(k)) lastStatus.set(k, r.status);
  }

  // Pending proposals are keyed by company only; attribute them to that
  // company's roles by spreading the count onto the branch, not onto one role.
  const pendingByCompany = new Map<string, number>();
  for (const p of pendingGroups) {
    pendingByCompany.set(p.companyId ?? "GROUP", p._count._all);
  }

  const stats = new Map<string, AgentStats>();
  for (const g of runGroups) {
    const key = statKey(g.companyId, g.roleId);
    stats.set(key, {
      runs: g._count._all,
      lastRunAt: g._max.createdAt ?? null,
      lastStatus: lastStatus.get(key) ?? null,
      pendingProposals: 0,
    });
  }

  // Fold company-level pending counts onto the roles that actually produced
  // them, so a company with a pending proposal lights up the agent that raised
  // it rather than every agent on the roster.
  const pendingByRun = await prisma.agentProposal.findMany({
    where: { status: "PENDING" },
    select: { companyId: true, run: { select: { roleId: true, companyId: true } } },
    take: 300,
  });
  for (const p of pendingByRun) {
    const roleId = p.run?.roleId;
    if (!roleId) continue;
    const key = statKey(p.run?.companyId ?? null, roleId);
    const existing = stats.get(key) ?? {
      runs: 0, lastRunAt: null, lastStatus: null, pendingProposals: 0,
    };
    stats.set(key, { ...existing, pendingProposals: existing.pendingProposals + 1 });
  }

  return buildOrgMap({
    companies: companies as CompanyInput[],
    stats,
    now,
  });
}
