// app/(app)/workspace/layout.tsx — the per-company ERP shell.
//
// Every /workspace/* route renders inside this. It turns "Enter
// workspace" into a real product: a company-branded command band + a
// dedicated section nav. Redirects to /companies if no workspace cookie.
//
// Data is already company-scoped by the lib/db.ts middleware — this
// shell only needs the company identity (unscoped lookup).

import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, ArrowLeftRight, Lock } from "lucide-react";
// CROSS-TENANT INTENT: /workspace/** pages scope explicitly by companyId — see app/(app)/workspace/layout.tsx for rationale.
import { prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getUserIfRole } from "@/lib/authz";
import { getLocale } from "@/lib/i18n.server";
import { WorkspaceNav } from "@/components/workspace/WorkspaceNav";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { exitWorkspace } from "@/app/actions/workspace";

const SECTOR_GLYPH: Record<string, string> = {
  HOSPITALITY: "🏨",
  DAIRY: "❄",
  AGRICULTURE: "🌿",
  EDUCATION: "🎓",
  INVESTMENT: "◆",
  TRADE: "⇄",
};
const SECTOR_LABEL: Record<string, { ar: string; en: string }> = {
  HOSPITALITY: { ar: "ضيافة", en: "Hospitality" },
  DAIRY: { ar: "ألبان", en: "Dairy" },
  AGRICULTURE: { ar: "زراعة", en: "Agriculture" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  INVESTMENT: { ar: "استثمار", en: "Investment" },
  TRADE: { ar: "تجارة", en: "Trade" },
};

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");

  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: {
      code: true,
      name: true,
      nameEn: true,
      sector: true,
      city: true,
      country: true,
      employees: true,
      status: true,
      brandColor: true,
    },
  });
  if (!company) redirect("/companies");

  // W5 — every company is reachable from inside the shell. Unscoped so
  // the switcher sees all units regardless of the active workspace.
  const allCompanies = await prismaUnscoped.company.findMany({
    select: { id: true, code: true, name: true, nameEn: true, sector: true },
    orderBy: { name: "asc" },
  });

  const locale = getLocale();
  const ar = locale === "ar";
  // W6 surfaced — make the role model visible, not "buttons missing".
  const canMutate = !!(await getUserIfRole("MANAGER"));
  const glyph = SECTOR_GLYPH[company.sector] ?? "■";
  const sectorLabel = SECTOR_LABEL[company.sector] ?? {
    ar: company.sector,
    en: company.sector,
  };

  return (
    <div className="ws-shell" data-sector={company.sector}>
      {/* Company command band */}
      <header className="ws-band">
        <div className="ws-band-inner">
          <div className="ws-band-id">
            <span className="ws-band-glyph" aria-hidden>
              {glyph}
            </span>
            <div className="ws-band-text">
              <div className="ws-band-eyebrow">
                {ar ? "مساحة عمل الشركة" : "COMPANY WORKSPACE"}
                <span className="ws-band-sep">·</span>
                {company.code}
              </div>
              <h1 className="ws-band-name">
                {ar ? company.name : company.nameEn}
              </h1>
              <div className="ws-band-meta">
                <span>{ar ? sectorLabel.ar : sectorLabel.en}</span>
                <span className="ws-band-dot">·</span>
                <span>
                  {company.city ? `${company.city} · ` : ""}
                  {company.country}
                </span>
                <span className="ws-band-dot">·</span>
                <span className="ws-band-num">
                  {company.employees.toLocaleString(
                    ar ? "ar-JO-u-nu-latn" : "en-US",
                  )}{" "}
                  {ar ? "موظف" : "staff"}
                </span>
              </div>
            </div>
          </div>

          <div className="ws-band-actions">
            {!canMutate ? (
              <span
                className="ws-band-ro"
                title={
                  ar
                    ? "حسابك للقراءة فقط — الإجراءات تتطلب صلاحية مدير"
                    : "Your account is read-only — actions need MANAGER+"
                }
              >
                <Lock className="h-3 w-3" strokeWidth={2} />
                <span>{ar ? "قراءة فقط" : "Read-only"}</span>
              </span>
            ) : null}
            <WorkspaceSwitcher
              ar={ar}
              currentId={workspaceId}
              companies={allCompanies}
            />
            <Link
              href={`/compare?a=${workspaceId}`}
              className="ws-band-exit"
              prefetch={false}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.7} />
              <span>{ar ? "قارن بوحدة أخرى" : "Compare vs unit"}</span>
            </Link>
            <form action={exitWorkspace}>
              <button type="submit" className="ws-band-exit">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.7} />
                <span>{ar ? "خروج لكل الشركات" : "Exit to all companies"}</span>
              </button>
            </form>
          </div>
        </div>

        <WorkspaceNav ar={ar} />
      </header>

      <div className="ws-content">{children}</div>
    </div>
  );
}
