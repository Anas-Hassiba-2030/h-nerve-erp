import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { ar, formatDate, ROLES_AR,
  ROLES_EN,
  loc,
} from "@/lib/utils";
import "../daylight.css";

export const dynamic = "force-dynamic";

const ROLE_TAG: Record<string, string> = {
  ADMIN: "gold",
  EXECUTIVE: "gold",
  MANAGER: "ok",
  STAFF: "ok",
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  const isAr = getLocale() === "ar";

  return (
    <DaylightShell dir={isAr ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={isAr ? "الإدارة" : "Administration"}
        title={isAr ? "فريق H‑Nerve" : "H‑Nerve Team"}
        subtitle={isAr ? "كل من يمتلك صلاحية الدخول إلى النظام العصبي للمجموعة." : "Everyone with access to the group's nerve system."}
      />
      <DaylightPanel title={isAr ? "فريق H‑Nerve" : "H‑Nerve Team"}>
        <table className="dl-table">
          <thead>
            <tr>
              <th>{isAr ? "الاسم" : "Name"}</th>
              <th>{isAr ? "المسمى الوظيفي" : "Title"}</th>
              <th>{isAr ? "الجهة" : "Company"}</th>
              <th>{isAr ? "البريد" : "Email"}</th>
              <th>{isAr ? "الدور" : "Role"}</th>
              <th className="num">{isAr ? "تاريخ الانضمام" : "Joined"}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "white",
                        background: "var(--emerald)",
                        flexShrink: 0,
                      }}
                    >
                      {u.name.slice(0, 1)}
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: "var(--ink-muted)" }}>{u.title ?? "—"}</td>
                <td style={{ color: "var(--ink-muted)" }}>{u.company?.name ?? "—"}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--ink-muted)" }} dir="ltr">{u.email}</td>
                <td>
                  <span className={`tag ${ROLE_TAG[u.role] ?? "ok"}`} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>
                    {loc(ROLES_AR, ROLES_EN, getLocale(), u.role)}
                  </span>
                </td>
                <td className="num" style={{ fontSize: 12, color: "var(--ink-muted)" }}>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DaylightPanel>
    </DaylightShell>
  );
}
