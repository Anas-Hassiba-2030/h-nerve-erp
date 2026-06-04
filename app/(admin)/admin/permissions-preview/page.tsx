// /admin/permissions-preview — Phase P5. Interactive permissions
// editor. ADMIN-only (the (admin) layout hard-gates). Each cell is a
// clickable ALLOW/BLOCK toggle backed by the RolePermission table.
// The hardcoded lib/permissions canAccess() remains the runtime
// fallback when an enforced (role, path) row is absent — so toggling
// "on top of" the static map works incrementally without a full
// dynamic-permissions cutover. (Full middleware DB-read is a follow-up;
// it would couple middleware to a per-request Prisma roundtrip.)

import Link from "next/link";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import {
  canAccess,
  permsEnforced,
  GATED_ROLES,
  type PermRole,
} from "@/lib/permissions";
import { togglePermission } from "./actions";

export const dynamic = "force-dynamic";

const SECTIONS: { ar: string; en: string; routes: string[] }[] = [
  { ar: "المساحة", en: "Workspace", routes: ["/dashboard", "/companies", "/analytics", "/compare", "/search", "/pinned"] },
  { ar: "العمليات", en: "Operations", routes: ["/hotels", "/dairy", "/farms", "/education"] },
  { ar: "الذكاء", en: "Intelligence", routes: ["/brain/graph", "/supply-chain", "/insights", "/alerts", "/workflows", "/documents"] },
  { ar: "النمو والمال", en: "Growth & Capital", routes: ["/finance", "/markets", "/sustainability", "/projects", "/reports"] },
  { ar: "الفريق", en: "People", routes: ["/messages", "/tasks", "/achievements", "/employees", "/users"] },
  { ar: "وحدة الإدارة", en: "Admin console", routes: ["/admin/system", "/admin/tenants", "/admin/empire", "/admin/users", "/admin/permissions-preview"] },
  { ar: "عائلة الإدارة", en: "Admin family", routes: ["/admin/imports", "/admin/products", "/admin/warehouses", "/admin/journal", "/admin/accounts", "/admin/brain"] },
];

export default async function PermissionsPreview({
  searchParams,
}: {
  searchParams: { as?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const m = getMessages(locale);
  const asRole = (
    GATED_ROLES.includes(searchParams.as as PermRole)
      ? searchParams.as
      : "EXECUTIVE"
  ) as PermRole;

  // Pull every row the table has — typically ~140 (35 paths × 4 roles).
  // CROSS-TENANT INTENT: RolePermission is global config, not tenant
  // data; reading via the scoped `prisma` client is harmless because
  // RolePermission isn't in any TENANT_SCOPED_MODELS set.
  const rows = await prisma.rolePermission.findMany();
  const byKey = new Map(rows.map((r) => [`${r.role}:${r.path}`, r.allowed]));

  function effective(role: string, path: string): boolean {
    const k = `${role}:${path}`;
    if (byKey.has(k)) return byKey.get(k)!;
    return canAccess(role, path);
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.rbac"]}</span>
          <h1 className="admin-h1">
            {ar ? "محرر الصلاحيات" : "Permissions editor"}
          </h1>
          <p className="admin-sub">
            {ar
              ? "اضغط على أي خلية للتبديل بين السماح والحجب. التغييرات تُحفظ مباشرة."
              : "Click any cell to toggle ALLOW / BLOCK. Changes save immediately."}
            {" · "}
            {ar ? "الإنفاذ" : "Enforcement"}:{" "}
            <strong style={{ color: permsEnforced() ? "var(--admin-cyan)" : "var(--admin-amber)" }}>
              {permsEnforced() ? (ar ? "مُفعّل" : "ON") : (ar ? "مُعطّل (آمن)" : "OFF (safe)")}
            </strong>
          </p>
        </div>
      </header>

      <nav className="admin-rail-nav" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        {GATED_ROLES.map((r) => (
          <Link
            key={r}
            href={`/admin/permissions-preview?as=${r}`}
            className="admin-rail-link"
            style={
              r === asRole
                ? { color: "var(--admin-cyan)", borderColor: "var(--admin-cyan)" }
                : undefined
            }
          >
            {r}
          </Link>
        ))}
      </nav>

      <div className="admin-grid">
        {SECTIONS.map((s) => (
          <div key={s.en} className="admin-tenant-card" style={{ padding: 18 }}>
            <div className="admin-tenant-name" style={{ marginBottom: 10 }}>
              {ar ? s.ar : s.en}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {s.routes.map((route) => {
                const ok = effective(asRole, route);
                const overridden = byKey.has(`${asRole}:${route}`);
                return (
                  <div
                    key={route}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <code style={{ color: "var(--admin-text-muted)" }}>{route}</code>
                    <form action={togglePermission}>
                      <input type="hidden" name="role" value={asRole} />
                      <input type="hidden" name="path" value={route} />
                      <input type="hidden" name="allowed" value={ok ? "false" : "true"} />
                      <button
                        type="submit"
                        className="admin-stat-label"
                        title={
                          overridden
                            ? ar ? "مُجبر يدوياً — اضغط للتبديل" : "Manually overridden — click to toggle"
                            : ar ? "افتراضي — اضغط للتبديل" : "Default — click to toggle"
                        }
                        style={{
                          color: ok ? "var(--admin-cyan)" : "#e06c75",
                          background: "transparent",
                          border: `1px solid ${ok ? "var(--admin-cyan)" : "#e06c75"}`,
                          padding: "2px 10px",
                          cursor: "pointer",
                          fontFamily: "JetBrains Mono, ui-monospace, monospace",
                          fontSize: 11,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          opacity: overridden ? 1 : 0.7,
                        }}
                      >
                        {ok ? (ar ? "مسموح" : "ALLOW") : (ar ? "محجوب" : "BLOCK")}
                        {overridden ? " ●" : ""}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p
        className="admin-stat-label"
        style={{ marginTop: 16, color: "var(--admin-text-muted)" }}
      >
        {ar
          ? "● = قاعدة مُجبرة محفوظة في قاعدة البيانات. بدون نقطة = افتراضي من lib/permissions.ts."
          : "● = explicit DB override. No dot = default from lib/permissions.ts."}
      </p>
    </div>
  );
}
