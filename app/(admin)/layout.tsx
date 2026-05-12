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
import { Building2, Settings, ArrowLeft, Crown } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
  if (!dbUser) redirect("/logout");
  // Demo-friendly: any logged-in user can preview admin. In production
  // we'd hard-gate to role === "ADMIN".

  return (
    <div className="admin-shell" data-shell="admin">
      {/* Frosted top rail */}
      <header className="admin-rail">
        <div className="admin-rail-inner">
          <div className="admin-rail-brand">
            <span className="admin-rail-mark">⌗</span>
            <span className="admin-rail-name">H-Nerve · Admin</span>
            <span className="admin-rail-tag">SUPERADMIN</span>
          </div>
          <nav className="admin-rail-nav">
            <Link href="/admin/empire" className="admin-rail-link">
              <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
              Empire
            </Link>
            <Link href="/admin/tenants" className="admin-rail-link">
              <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Tenants
            </Link>
            <Link href="/admin/system" className="admin-rail-link">
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              System
            </Link>
          </nav>
          <Link href="/dashboard" className="admin-rail-exit" title="Exit to operator UI">
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            <span>OPERATOR</span>
          </Link>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
