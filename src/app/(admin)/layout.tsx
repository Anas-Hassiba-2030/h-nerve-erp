// (admin) route group — Sleek Operator vocabulary (DESIGN-SKILL §1.F).
//
// Cyan/teal accent on near-black. Frosted glass restraint. Different
// product feel from the operator-facing dashboard — this is the
// superadmin console.
//
// Auth-gated: ADMIN role required.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

// IMPORTANT — import the admin CSS DIRECTLY here, not via globals.css's
// @import. In the production build Next does NOT inline globals.css @imports
// into the page's CSS chunk, so an admin page loaded ONLY the base globals
// bundle and rendered as raw unstyled HTML (the .admin-shell / .admin-rail /
// .admin-page / .emp-* rules were absent). Same failure + same fix as the
// orrery panels (PR #202). A direct import binds the CSS to the (admin) route
// group's chunk so it always ships.
import "../phase11-admin.css";
import "../phase19-empire.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { Building2, Settings, LayoutDashboard, Crown, UsersRound, ShieldCheck, ScrollText, Sprout, Database, Orbit } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
  if (!dbUser) redirect("/logout");
  // Hard gate: only the ADMIN role may enter the superadmin console.
  // Logged-in non-admins are sent back to the operator dashboard.
  if (dbUser.role !== "ADMIN") redirect("/dashboard");

  const ar = (await getLocale()) === "ar";

  return (
    <div className="admin-shell" data-shell="admin">
      {/* Frosted top rail */}
      <header className="admin-rail">
        <div className="admin-rail-inner">
          <Link
            href="/orrery"
            className="admin-rail-brand"
            style={{ textDecoration: "none" }}
            title={ar ? "العودة إلى المدار" : "Back to the Orbit hub"}
          >
            <span className="admin-rail-mark">⌗</span>
            <span className="admin-rail-name">{ar ? "H-Nerve · إدارة" : "H-Nerve · Admin"}</span>
            <span className="admin-rail-tag">SUPERADMIN</span>
          </Link>
          <nav className="admin-rail-nav">
            <Link href="/admin/empire" className="admin-rail-link">
              <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "الإمبراطورية" : "Empire"}
            </Link>
            <Link href="/admin/tenants" className="admin-rail-link">
              <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "المستأجرون" : "Tenants"}
            </Link>
            <Link href="/admin/users" className="admin-rail-link">
              <UsersRound className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "المستخدمون" : "Users"}
            </Link>
            <Link href="/admin/permissions-preview" className="admin-rail-link">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "الصلاحيات" : "Permissions"}
            </Link>
            <Link href="/admin/audit" className="admin-rail-link">
              <ScrollText className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "التدقيق" : "Audit"}
            </Link>
            <Link href="/admin/genesis" className="admin-rail-link">
              <Sprout className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "البداية" : "Genesis"}
            </Link>
            <Link href="/admin/db" className="admin-rail-link">
              <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "البيانات" : "Data"}
            </Link>
            <Link href="/admin/system" className="admin-rail-link">
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "غرفة العمليات" : "Mission Control"}
            </Link>
          </nav>
          <div className="admin-rail-exits">
            <span className="admin-rail-exits-label">{ar ? "مغادرة الإدارة" : "Leave admin"}</span>
            <Link
              href="/orrery"
              className="admin-rail-exit admin-rail-orbit"
              title={ar ? "الصفحة الرئيسية — مركز المدار (كل أقسام النظام)" : "Home — the Orbit hub (all sections)"}
            >
              <Orbit className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{ar ? "المدار" : "Orbit"}</span>
            </Link>
            <Link
              href="/dashboard"
              className="admin-rail-exit"
              title={ar ? "فتح لوحة تحكم المشغّل — واجهة الاستخدام اليومي" : "Open the operator dashboard — the day-to-day app"}
            >
              <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{ar ? "لوحة المشغّل" : "Operator"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
