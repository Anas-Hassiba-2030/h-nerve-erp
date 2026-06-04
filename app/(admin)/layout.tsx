// (admin) route group — Sleek Operator vocabulary (DESIGN-SKILL §1.F).
//
// Cyan/teal accent on near-black. Frosted glass restraint. Different
// product feel from the operator-facing dashboard — this is the
// superadmin console.
//
// Auth-gated: ADMIN role required.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Building2, Settings, ArrowLeft, Crown, UsersRound, ShieldCheck, ScrollText, Sprout, Database } from "lucide-react";
import { getLocale } from "@/lib/i18n.server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
  if (!dbUser) redirect("/logout");
  // Hard gate: only the ADMIN role may enter the superadmin console.
  // Logged-in non-admins are sent back to the operator dashboard.
  if (dbUser.role !== "ADMIN") redirect("/dashboard");

  const ar = getLocale() === "ar";

  return (
    <div className="admin-shell" data-shell="admin">
      {/* Frosted top rail */}
      <header className="admin-rail">
        <div className="admin-rail-inner">
          <div className="admin-rail-brand">
            <span className="admin-rail-mark">⌗</span>
            <span className="admin-rail-name">{ar ? "H-Nerve · إدارة" : "H-Nerve · Admin"}</span>
            <span className="admin-rail-tag">SUPERADMIN</span>
          </div>
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
              {ar ? "النظام" : "System"}
            </Link>
          </nav>
          <Link
            href="/dashboard"
            className="admin-rail-exit"
            title={ar ? "العودة إلى واجهة المشغّل" : "Exit to operator UI"}
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            <span>{ar ? "المشغّل" : "OPERATOR"}</span>
          </Link>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
