// /admin/permissions-preview — Phase 5 audit screen. ADMIN-only (the
// (admin) layout hard-gates). ?as=ROLE shows, per representative route,
// whether that role can reach it — using the SAME lib/permissions
// canAccess the middleware uses. Read-only; works regardless of the
// H_NERVE_PERMS_ENFORCED flag (it's hypothetical). Validate every role
// here, THEN flip the env flag.

import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import {
  canAccess,
  permsEnforced,
  GATED_ROLES,
  type PermRole,
} from "@/lib/permissions";

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

export default function PermissionsPreview({
  searchParams,
}: {
  searchParams: { as?: string };
}) {
  const ar = getLocale() === "ar";
  const asRole = (
    GATED_ROLES.includes(searchParams.as as PermRole)
      ? searchParams.as
      : "EXECUTIVE"
  ) as PermRole;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">FEDERATION · RBAC PREVIEW</span>
          <h1 className="admin-h1">
            {ar ? "معاينة الصلاحيات" : "Permissions preview"}
          </h1>
          <p className="admin-sub">
            {ar
              ? "ما يستطيع كل دور الوصول إليه (افتراضي — لا يطبّق إعادة توجيه). تحقّق من كل دور هنا ثم فعّل الإنفاذ."
              : "What each role can reach (hypothetical — no redirect). Validate every role here, then enable enforcement."}
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
                const ok = canAccess(asRole, route);
                return (
                  <div
                    key={route}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <code style={{ color: "var(--admin-text-muted)" }}>{route}</code>
                    <span
                      className="admin-stat-label"
                      style={{
                        color: ok ? "var(--admin-cyan)" : "var(--admin-rose, #e06c75)",
                      }}
                    >
                      {ok ? (ar ? "مسموح" : "ALLOW") : (ar ? "محجوب" : "BLOCK")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
