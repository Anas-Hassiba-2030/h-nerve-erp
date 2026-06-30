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
import { Settings, UsersRound, ShieldCheck, ScrollText, Sprout, Database } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { MiniOrrery } from "@/components/orrery/MiniOrrery";

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
            title={ar ? "العودة إلى المدار" : "Back to the Orbit hub"}
          >
            <span className="admin-mono-tile" aria-hidden>⌗</span>
            <span className="admin-mono-text">
              <span className="admin-mono-name">H-Nerve</span>
              <span className="admin-mono-sub">{ar ? "وحدة الإدارة" : "Admin console"}</span>
            </span>
          </Link>
          <nav className="admin-rail-nav">
            {/* Empire + Tenants intentionally removed from the rail — Mission
                Control is the single entry point that fans out to them. */}
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
          {/* The same Orbit control every operator section carries — the
              single, consistent way back into the app. Replaces the old
              LEAVE ADMIN label + Orbit/Operator text links. */}
          <div className="admin-rail-exits">
            <MiniOrrery locale={ar ? "ar" : "en"} />
          </div>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
