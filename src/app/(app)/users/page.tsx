import Link from "next/link";
import { Pencil } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { formatNumber } from "@/lib/utils/utils";
import { OrgTabsClient } from "./OrgTabsClient";
import "../daylight.css";
import "./employees.css";

export const dynamic = "force-dynamic";

// Chess-rank glyphs + bilingual labels, mirroring the reference roster design.
const RANK_GLYPH: Record<string, string> = {
  KING: "♚", QUEEN: "♛", ROOK: "♜", BISHOP: "♝", KNIGHT: "♞", PAWN: "♟",
};
const SILVER_PLUS = new Set(["KING", "QUEEN", "ROOK", "BISHOP", "KNIGHT"]);

const ROLE_AR: Record<string, string> = {
  ADMIN: "مدير النظام", EXECUTIVE: "إدارة عليا", MANAGER: "مدير وحدة", STAFF: "موظف",
};
const ROLE_EN: Record<string, string> = {
  ADMIN: "System Admin", EXECUTIVE: "Executive", MANAGER: "Unit Manager", STAFF: "Staff",
};

type Member = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  role: string;
  rank: string;
  xp: number;
  loginCount: number;
  active: boolean;
  reportsToId: string | null;
  company: { name: string } | null;
};

export default async function UsersPage() {
  const users = (await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { company: true },
    take: 500,
  })) as unknown as Member[];

  const isAr = (await getLocale()) === "ar";

  // The org chart IS the real user records (built from each user's reportsToId).
  // Editing a user — name, title, role, and "reports to" (manager) — reshapes
  // this tree. The editor lives in the admin console, so only an ADMIN sees the
  // per-card edit pencil that deep-links straight to that person's form.
  const me = await getCurrentUser();
  const canEdit = me?.role === "ADMIN";

  // ── KPIs from real data ──
  const count = users.length;
  const online = users.filter((u) => u.active).length;
  const silver = users.filter((u) => SILVER_PLUS.has(u.rank)).length;
  const totalXp = users.reduce((s, u) => s + (u.xp ?? 0), 0);

  // ── org tree: a REAL supervisor map, built from company + role ──
  // The chart must answer "who is each person's supervisor and who leads the
  // group?" — so parent selection follows the actual org signal each user
  // already carries (their company + role tier), not an index-based guess:
  //   Staff      → the MANAGER of their own company
  //   Manager    → the EXECUTIVE (group CEO)
  //   Executive  → the owner (top ADMIN)
  //   other Admin→ the owner
  // A real `reportsTo` edge overrides this, BUT only when it doesn't invert the
  // hierarchy (a higher tier can never become a child of a lower one — that
  // stale-edge inversion is what put the owner as a leaf under a staffer).
  // Everything hangs off ONE root (the owner) so it's a single clean tree.
  const ids = new Set(users.map((u) => u.id));
  const byId = new Map(users.map((u) => [u.id, u]));
  const TIER: Record<string, number> = { ADMIN: 0, EXECUTIVE: 1, MANAGER: 2, STAFF: 3 };
  const tierOf = (u: Member) => TIER[u.role] ?? 3;

  // Single root: the owner (ADMIN whose title marks them as owner), else the
  // first ADMIN, else the single highest-ranked person.
  const admins = users.filter((u) => u.role === "ADMIN");
  const owner =
    admins.find((u) => /مالك|owner/i.test(u.title ?? "")) ??
    admins[0] ??
    [...users].sort((a, b) => tierOf(a) - tierOf(b))[0];
  const rootId = owner?.id ?? null;

  // One manager per company (the company's leader), and the top executive.
  const mgrByCompany = new Map<string, Member>();
  for (const u of users) {
    const co = u.company?.name;
    if (u.role === "MANAGER" && co && !mgrByCompany.has(co)) mgrByCompany.set(co, u);
  }
  const topExec = users.find((u) => u.role === "EXECUTIVE") ?? null;

  const validEdge = (u: Member) => {
    if (!u.reportsToId || !ids.has(u.reportsToId) || u.reportsToId === u.id) return false;
    const p = byId.get(u.reportsToId);
    return !!p && tierOf(p) < tierOf(u); // parent must be strictly higher in the org
  };

  const synthParent = (u: Member): string | null => {
    if (u.id === rootId) return null;
    if (u.role === "STAFF") {
      const co = u.company?.name;
      const mgr = co ? mgrByCompany.get(co) : null;
      if (mgr && mgr.id !== u.id) return mgr.id;
      return topExec?.id ?? rootId;
    }
    if (u.role === "MANAGER") return topExec?.id ?? rootId;
    return rootId; // executives + any other admin report to the owner
  };

  // parent chains always move to a strictly higher tier (or the root), so the
  // graph is a DAG rooted at the owner — no cycle is possible.
  const parentOf = new Map<string, string | null>();
  for (const u of users) {
    if (u.id === rootId) { parentOf.set(u.id, null); continue; }
    parentOf.set(u.id, validEdge(u) ? u.reportsToId! : synthParent(u));
  }

  const byParent = new Map<string | null, Member[]>();
  for (const u of users) {
    const parent = parentOf.get(u.id) ?? null;
    const arr = byParent.get(parent) ?? [];
    arr.push(u);
    byParent.set(parent, arr);
  }

  // Guard against a cycle in real reportsTo data (A→B→A). isRealEdge already
  // drops self-loops, but a multi-node loop would otherwise recurse forever and
  // 500 the page. A visited set makes render total regardless of the data.
  const seen = new Set<string>();
  function renderNode(u: Member) {
    if (seen.has(u.id)) return null;
    seen.add(u.id);
    const kids = byParent.get(u.id) ?? [];
    const sector = u.company?.name ?? "";
    const role = isAr ? (ROLE_AR[u.role] ?? u.role) : (ROLE_EN[u.role] ?? u.role);
    return (
      <div key={u.id} className={`tnode${kids.length ? " has-kids" : ""}`}>
        <div className="tcard" data-id={u.id} data-role={u.role}>
          <span className="tav">
            {u.name.slice(0, 1)}
            {u.active ? <span className="pres" /> : null}
          </span>
          <span className="tinfo">
            <span className="tn">{u.name}</span>
            <span className="tr">{u.title ?? role}</span>
            {sector ? <span className="tr tsector">{sector}</span> : null}
            {u.email ? <span className="tr temail">{u.email}</span> : null}
          </span>
          <span className="tbadge">{RANK_GLYPH[u.rank] ?? "♟"}</span>
          {canEdit ? (
            <Link
              href={`/admin/users#u-${u.id}`}
              className="tedit"
              aria-label={isAr ? `تعديل ${u.name}` : `Edit ${u.name}`}
              title={isAr ? "تعديل البيانات (الاسم، الدور، المسؤول)" : "Edit (name, role, manager)"}
            >
              <Pencil className="h-3 w-3" strokeWidth={2} />
            </Link>
          ) : null}
        </div>
        {kids.length ? (
          <div className="tkids">{kids.map((k) => renderNode(k))}</div>
        ) : null}
      </div>
    );
  }

  const roots = byParent.get(null) ?? [];

  return (
    <div className="dl-page em-page" dir={isAr ? "rtl" : "ltr"}>
      <div className="em-wrap">
        <div className="em-top">
          <div className="em-title-box">
            <span className="eb">
              <span className="tick" />
              {isAr ? "الأفراد" : "People"}
            </span>
            <h1>{isAr ? "الفريق" : "Team"}</h1>
          </div>
          <div className="em-kpis">
            <div className="em-kpi">
              <div className="v">{formatNumber(count)}</div>
              <div className="k">{isAr ? "عدد الأعضاء" : "Members"}</div>
            </div>
            <div className="em-kpi">
              <div className="v">{formatNumber(online)}</div>
              <div className="k">{isAr ? "النشطون الآن" : "Online now"}</div>
            </div>
            <div className="em-kpi">
              <div className="v">{formatNumber(silver)}</div>
              <div className="k">{isAr ? "رتب فضية+" : "Silver+"}</div>
            </div>
            <div className="em-kpi">
              <div className="v">{formatNumber(totalXp)}</div>
              <div className="k">{isAr ? "إجمالي XP الفريق" : "Total team XP"}</div>
            </div>
          </div>
        </div>

        <OrgTabsClient
          treeLabel={isAr ? "الهيكل التنظيمي" : "Org structure"}
          listLabel={isAr ? "قائمة الأعضاء" : "Member list"}
          treeContent={
            <div className="tree">{roots.map((u) => renderNode(u))}</div>
          }
          listContent={
            <>
              <div className="em-controls">
                <input
                  className="em-search"
                  placeholder={isAr ? "بحث بالاسم أو الدور…" : "Search by name or role…"}
                />
              </div>
              <div className="em-grid">
                {users.map((u) => {
                  const sector = u.company?.name ?? "—";
                  const role = isAr ? (ROLE_AR[u.role] ?? u.role) : (ROLE_EN[u.role] ?? u.role);
                  return (
                    <div key={u.id} className="mcard">
                      <div className="mhead">
                        <span className="mav">
                          {u.name.slice(0, 1)}
                          {u.active ? <span className="pres" /> : null}
                        </span>
                        <div>
                          <div className="mn">
                            {u.name} <span className="tbadge">{RANK_GLYPH[u.rank] ?? "♟"}</span>
                          </div>
                          <div className="mr">{u.title ?? role}</div>
                        </div>
                      </div>
                      <div className="mmeta">
                        <span className="sector">{sector}</span>
                        <span>{formatNumber(u.xp ?? 0)} XP</span>
                        <span>
                          {isAr ? "دخول" : "logins"} {formatNumber(u.loginCount ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          }
        />
      </div>

      <div className="em-backdrop" id="backdrop" />
      <aside className="em-drawer" id="drawer" />
    </div>
  );
}
