import { Topbar } from "@/components/Topbar";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { ar, formatDate, ROLES_AR,
  ROLES_EN,
  loc,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLE_TONE: Record<string, string> = {
  ADMIN: "badge-violet",
  EXECUTIVE: "badge-gold",
  MANAGER: "badge-blue",
  STAFF: "badge-slate",
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  return (
    <>
      <Topbar
        eyebrow="الإدارة"
        title="فريق H‑Nerve"
        subtitle="كل من يمتلك صلاحية الدخول إلى النظام العصبي للمجموعة."
      />
      <div className="flex-1 p-6">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>المسمى الوظيفي</th>
                <th>الجهة</th>
                <th>البريد</th>
                <th>الدور</th>
                <th>تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white bg-brand-700`}
                      >
                        {u.name.slice(0, 1)}
                      </div>
                      <span className="font-bold text-brand-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-700">{u.title ?? "—"}</td>
                  <td className="text-slate-700">{u.company?.name ?? "—"}</td>
                  <td className="font-mono text-xs text-slate-500" dir="ltr">{u.email}</td>
                  <td>
                    <span className={ROLE_TONE[u.role] ?? "badge-slate"}>
                      {loc(ROLES_AR, ROLES_EN, getLocale(), u.role)}
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
