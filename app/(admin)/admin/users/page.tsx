// /admin/users — user management for the superadmin console.
// Sleek Operator (DESIGN-SKILL §1.F), bilingual via getLocale() +
// ar-ternary (Phase 3 convention). ADMIN-gated by the (admin) layout;
// the actions self-gate too. Server actions only.
//
// Phase V3-P14 — filter bar: company, role, status, free-text search.
// URL-driven so the filters persist on refresh + are linkable.
// Pagination kicks in once total > PAGE_SIZE.

// CROSS-TENANT INTENT: the superadmin console must see every Company
// to populate the user-assignment dropdown.
import Link from "next/link";
import { prisma, prismaUnscoped } from "@/lib/db/db";
import type { Prisma } from "@prisma/client";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { roleLabel, ROLES } from "./roles";
import {
  CreateUserForm,
  EditUserForm,
  ResetPasswordForm,
  ActiveToggle,
  DeleteUserForm,
} from "./UserForms";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SP = {
  company?: string;
  role?: string;
  status?: string;
  q?: string;
  page?: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const m = getMessages(locale);
  const me = await getCurrentUser();

  // Read filters off the URL.
  const fCompany = (searchParams.company ?? "").trim();
  const fRole = (searchParams.role ?? "").trim().toUpperCase();
  const fStatus = (searchParams.status ?? "").trim();
  const fQ = (searchParams.q ?? "").trim();
  const fPage = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // Build the where clause.
  const where: Prisma.UserWhereInput = {};
  if (fCompany === "__none__") where.companyId = null;
  else if (fCompany) where.companyId = fCompany;
  if (fRole && (ROLES as readonly string[]).includes(fRole)) where.role = fRole;
  if (fStatus === "active") where.active = true;
  else if (fStatus === "inactive") where.active = false;
  if (fQ) {
    where.OR = [
      { name: { contains: fQ } },
      { email: { contains: fQ } },
    ];
  }

  const [users, total, companies, allManagers, allCount, adminCount, inactiveCount] = await Promise.all([
    prisma.user.findMany({
      where,
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
        reportsToId: true,
      },
      skip: (fPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prismaUnscoped.company.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, nameEn: true },
      take: 200,
    }),
    // Full eligible-manager list for the "Reports to" picker — NOT the page
    // slice. With only the 20-row slice, a user whose manager is off-page had
    // no matching <option>, so the select fell back to "None" and Save wiped
    // the org-chart link (data loss). The whole roster is small (admin
    // console), so loading it unpaginated is fine.
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN", active: true } }),
    prisma.user.count({ where: { active: false } }),
  ]);

  const stats = { total: allCount, admins: adminCount, inactive: inactiveCount };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = fCompany || fRole || fStatus || fQ;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.users"]}</span>
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

      {/* Phase V3-P14 — filter bar. URL-driven (server-side). */}
      <form
        method="get"
        className="admin-section"
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          alignItems: "end",
        }}
      >
        <label className="admin-field">
          <span className="admin-label">{ar ? "الشركة" : "Company"}</span>
          <select name="company" defaultValue={fCompany} className="admin-input">
            <option value="">{ar ? "الكل" : "All"}</option>
            <option value="__none__">{ar ? "بدون شركة" : "None / cross-tenant"}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {ar ? c.name : c.nameEn} · {c.code}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-label">{ar ? "الدور" : "Role"}</span>
          <select name="role" defaultValue={fRole} className="admin-input">
            <option value="">{ar ? "الكل" : "All"}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r, ar)}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-label">{ar ? "الحالة" : "Status"}</span>
          <select name="status" defaultValue={fStatus} className="admin-input">
            <option value="">{ar ? "الكل" : "All"}</option>
            <option value="active">{ar ? "نشط" : "Active"}</option>
            <option value="inactive">{ar ? "معطّل" : "Inactive"}</option>
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-label">{ar ? "بحث" : "Search"}</span>
          <input
            name="q"
            defaultValue={fQ}
            placeholder={ar ? "اسم أو بريد…" : "Name or email…"}
            className="admin-input"
          />
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="submit" className="admin-cta-primary">
            {ar ? "تطبيق" : "Apply"}
          </button>
          {hasFilter ? (
            <Link href="/admin/users" className="admin-btn-ghost">
              {ar ? "مسح" : "Clear"}
            </Link>
          ) : null}
        </div>
      </form>

      <p className="admin-stat-label" style={{ margin: "8px 0" }}>
        {ar
          ? `يعرض ${users.length} من أصل ${total} مستخدم`
          : `Showing ${users.length} of ${total} user${total === 1 ? "" : "s"}`}
      </p>

      <CreateUserForm ar={ar} companies={companies} />

      <div className="admin-grid">
        {users.map((u) => {
          const isMe = u.id === me?.id;
          return (
            <div
              key={u.id}
              id={`u-${u.id}`}
              className="admin-tenant-card"
              style={{ padding: 18, opacity: u.active ? 1 : 0.6, scrollMarginTop: 90 }}
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
                <EditUserForm u={u} ar={ar} companies={companies} managers={allManagers} />
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

      {totalPages > 1 ? (
        <nav
          className="admin-rail-nav"
          style={{ marginTop: 16, justifyContent: "center", gap: 6 }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (fCompany) params.set("company", fCompany);
            if (fRole) params.set("role", fRole);
            if (fStatus) params.set("status", fStatus);
            if (fQ) params.set("q", fQ);
            if (p > 1) params.set("page", String(p));
            const href = `/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
            const active = p === fPage;
            return (
              <Link
                key={p}
                href={href}
                className="admin-rail-link"
                style={
                  active
                    ? { color: "var(--admin-cyan)", borderColor: "var(--admin-cyan)" }
                    : undefined
                }
              >
                {p}
              </Link>
            );
          })}
        </nav>
      ) : null}
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
