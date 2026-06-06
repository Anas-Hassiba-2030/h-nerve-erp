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

  const isAr = getLocale() === "ar";

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

  // ── org tree from reportsTo relations ──
  const byParent = new Map<string | null, Member[]>();
  const ids = new Set(users.map((u) => u.id));
  for (const u of users) {
    // Treat dangling parents as roots.
    const parent = u.reportsToId && ids.has(u.reportsToId) ? u.reportsToId : null;
    const arr = byParent.get(parent) ?? [];
    arr.push(u);
    byParent.set(parent, arr);
  }

  function renderNode(u: Member) {
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
            {sector ? <span className="tr" style={{ opacity: 0.55, fontSize: "9.5px" }}>{sector}</span> : null}
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
