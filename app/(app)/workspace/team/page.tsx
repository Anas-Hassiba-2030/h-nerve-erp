// /workspace/team — the unit's people, roles, performance.

import { redirect } from "next/navigation";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { assignProjectOwner } from "../actions";
import "../../daylight.css";
import { getUserIfRole } from "@/lib/auth/authz";
import { prisma, prismaUnscoped } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatNumber } from "@/lib/utils/utils";

export const dynamic = "force-dynamic";

const ROLE_TONE: Record<string, "critical" | "warn" | "success" | "info" | "neutral"> = {
  ADMIN: "critical",
  EXECUTIVE: "warn",
  MANAGER: "success",
  STAFF: "info",
};

export default async function WorkspaceTeamPage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { employees: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";

  const team = await prismaUnscoped.user.findMany({
    where: { companyId: workspaceId },
    select: { name: true, email: true, role: true, title: true, rank: true, xp: true },
    orderBy: { xp: "desc" },
  });

  const byRole = team.reduce<Record<string, number>>((m, u) => {
    m[u.role] = (m[u.role] ?? 0) + 1;
    return m;
  }, {});

  // Scoped read — only this unit's live pipeline projects are
  // assignable, so a manager can't reassign another company's work.
  const projects = await prisma.futureProject.findMany({
    where: { deletedAt: null, stage: { not: "DONE" } },
    orderBy: [{ priority: "asc" }, { budgetJod: "desc" }],
    select: { id: true, title: true, stage: true, ownerName: true, budgetJod: true },
  });
  const memberNames = Array.from(
    new Set(team.map((u) => u.name).filter(Boolean)),
  );
  // W6 — STAFF see ownership read-only; only MANAGER+ may reassign.
  const canMutate = !!(await getUserIfRole("MANAGER"));

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق" : "Team"}
        title={ar ? "فريق الوحدة" : "Unit team"}
        subtitle={ar ? "من له حساب على H-Nerve في هذه الوحدة" : "Who has an H-Nerve seat in this unit"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "أعضاء النظام" : "Platform members"} value={formatNumber(team.length)} />
        <DaylightKpi label={ar ? "إجمالي الموظفين" : "Total headcount"} value={formatNumber(company.employees)} />
        <DaylightKpi label={ar ? "مدراء" : "Managers"} value={formatNumber(byRole["MANAGER"] ?? 0)} />
        <DaylightKpi label={ar ? "تنفيذيون" : "Executives"} value={formatNumber(byRole["EXECUTIVE"] ?? 0)} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "فريق الوحدة" : "Unit team"} aside={ar ? "من له حساب على H-Nerve في هذه الوحدة" : "Who has an H-Nerve seat in this unit"}>
        {team.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
            {ar ? "لا أعضاء معيّنون لهذه الشركة بعد." : "No members assigned to this company yet."}
          </p>
        ) : (
          <ul className="ws-list">
            {team.map((u, i) => (
              <li key={i} className="ws-list-row">
                <span className="ws-avatar" aria-hidden>
                  {u.name.trim().slice(0, 2)}
                </span>
                <div className="ws-list-main">
                  <div className="ws-list-title">{u.name}</div>
                  <div className="ws-list-sub ws-mono">
                    {u.title ?? u.role}
                    {u.rank ? ` · ${u.rank}` : ""}
                    {u.xp ? ` · ${formatNumber(u.xp)} XP` : ""}
                  </div>
                </div>
                <span className={`tag ${ROLE_TONE[u.role] === "critical" || ROLE_TONE[u.role] === "warn" ? "gold" : "ok"}`} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DaylightPanel>

      <DaylightPanel title={ar ? "إسناد ملكية المشاريع" : "Project ownership"} aside={ar ? "من يملك ماذا في خط مشاريع هذه الوحدة" : "Who owns what in this unit's pipeline"}>
        {projects.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
            {ar ? "لا مشاريع حيّة لإسنادها." : "No live projects to assign."}
          </p>
        ) : (
          <ul className="ws-list">
            {projects.map((p) => {
              // If the stored owner has since left the unit, keep them
              // selectable so the select doesn't silently lie.
              const orphanOwner =
                p.ownerName && !memberNames.includes(p.ownerName)
                  ? p.ownerName
                  : null;
              return (
              <li key={p.id} className="ws-owner-row">
                <div className="ws-list-main">
                  <div className="ws-list-title">{p.title}</div>
                  <div className="ws-list-sub ws-mono">
                    {p.stage} · {formatMoney(p.budgetJod)} ·{" "}
                    {p.ownerName
                      ? p.ownerName +
                        (orphanOwner ? (ar ? " (خارج الفريق)" : " (left team)") : "")
                      : ar ? "بدون مالك" : "Unassigned"}
                  </div>
                </div>
                {canMutate ? (
                  <form action={assignProjectOwner} className="ws-owner-form">
                    <input type="hidden" name="id" value={p.id} />
                    <select
                      name="owner"
                      defaultValue={p.ownerName ?? ""}
                      className="ws-owner-select"
                      aria-label={ar ? "مالك المشروع" : "Project owner"}
                    >
                      <option value="">
                        {ar ? "— بدون مالك —" : "— Unassigned —"}
                      </option>
                      {orphanOwner ? (
                        <option value={orphanOwner}>
                          {orphanOwner}
                          {ar ? " (خارج الفريق)" : " (left team)"}
                        </option>
                      ) : null}
                      {memberNames.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="dl-btn dl-btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
                      {ar ? "إسناد" : "Assign"}
                    </button>
                  </form>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
