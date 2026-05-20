// /admin/users — user management for the superadmin console (Phase 4).
// Sleek Operator (DESIGN-SKILL §1.F), bilingual via getLocale() +
// ar-ternary (Phase 3 convention). ADMIN-gated by the (admin) layout;
// the actions self-gate too. Server actions only.

// CROSS-TENANT INTENT: the superadmin console must see every Company
// to populate the user-assignment dropdown.
import { prisma, prismaUnscoped } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { roleLabel } from "./roles";
import {
  CreateUserForm,
  EditUserForm,
  ResetPasswordForm,
  ActiveToggle,
  DeleteUserForm,
} from "./UserForms";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const ar = getLocale() === "ar";
  const me = await getCurrentUser();

  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        active: true,
        lastLoginAt: true,
        companyId: true,
      },
    }),
    prismaUnscoped.company.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, nameEn: true },
    }),
  ]);

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN" && u.active).length,
    inactive: users.filter((u) => !u.active).length,
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">FEDERATION · USERS</span>
          <h1 className="admin-h1">{ar ? "إدارة المستخدمين" : "User management"}</h1>
          <p className="admin-sub">
            {ar
              ? "إنشاء الحسابات وتعيين الأدوار وإعادة تعيين كلمات المرور وتعطيل الوصول. الحسابات المعطّلة لا يمكنها تسجيل الدخول."
              : "Create accounts, assign roles, reset passwords, deactivate access. Deactivated accounts cannot sign in."}
          </p>
        </div>
      </header>

      <section className="admin-stats">
        <Stat label="TOTAL" value={stats.total} />
        <Stat label="ACTIVE ADMINS" value={stats.admins} accent="cyan" />
        <Stat label="DEACTIVATED" value={stats.inactive} accent="amber" />
      </section>

      <CreateUserForm ar={ar} companies={companies} />

      <div className="admin-grid">
        {users.map((u) => {
          const isMe = u.id === me?.id;
          return (
            <div
              key={u.id}
              className="admin-tenant-card"
              style={{ padding: 18, opacity: u.active ? 1 : 0.6 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span className="admin-tenant-name">
                  {u.name}
                  {isMe ? (
                    <span className="admin-stat-label" style={{ marginInlineStart: 8 }}>
                      {ar ? "أنت" : "you"}
                    </span>
                  ) : null}
                </span>
                <span
                  className="admin-stat-label"
                  style={{ color: u.active ? "var(--admin-cyan)" : "var(--admin-amber)" }}
                >
                  {roleLabel(u.role, ar)} ·{" "}
                  {u.active
                    ? ar ? "نشط" : "active"
                    : ar ? "معطّل" : "inactive"}
                </span>
              </div>
              <div className="admin-stat-label" style={{ marginTop: 4 }}>
                {u.email}
                {u.title ? ` · ${u.title}` : ""}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                <EditUserForm u={u} ar={ar} companies={companies} />
                <ResetPasswordForm id={u.id} ar={ar} />
                <ActiveToggle id={u.id} active={u.active} ar={ar} />
                {isMe ? null : (
                  <DeleteUserForm id={u.id} email={u.email} ar={ar} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "cyan" | "amber";
}) {
  return (
    <div className="admin-stat-tile">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value" data-accent={accent ?? "neutral"}>
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}
