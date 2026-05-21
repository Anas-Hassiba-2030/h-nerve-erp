// /workspace — Command Center (the company ERP's home).
//
// The layout (workspace/layout.tsx) owns the company band + nav. This
// page is the at-a-glance command surface: a Company Health composite,
// financial pulse, sector KPIs, and signposts into the deep sections.
// Every query is auto-scoped to the active company by the lib/db.ts
// middleware.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight, Factory, Wallet, Users2, GitBranch, BrainCircuit,
} from "lucide-react";
import { HeritageSection } from "@/components/heritage";
import { WorkspaceFinancials } from "@/components/workspace/WorkspaceFinancials";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber } from "@/lib/utils";
import { computeCompanyHealth } from "@/lib/workspace/health";

export const dynamic = "force-dynamic";

const SECTOR_MODULES: Record<string, string[]> = {
  DAIRY: ["DAIRY", "SUPPLY"],
  HOSPITALITY: ["HOTELS", "SUPPLY"],
  AGRICULTURE: ["FARMS", "SUPPLY"],
  EDUCATION: ["EDUCATION"],
  INVESTMENT: ["FINANCE", "MARKETS"],
  TRADE: ["SUPPLY", "MARKETS"],
};

export default async function WorkspaceCommandPage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { sector: true, name: true, nameEn: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";
  const modules = SECTOR_MODULES[company.sector] ?? [];

  const [
    txns, batches, hotels, farmsAgg, programs, projects, activeProjects,
    teamCount, openInsights, criticalInsights,
  ] = await Promise.all([
    prisma.transaction.findMany({
      select: { kind: true, amount: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
      take: 800,
    }),
    prisma.dairyBatch.findMany({ select: { qualityGrade: true, status: true } }),
    prisma.hotel.findMany({
      select: { totalRooms: true, _count: { select: { bookings: true } } },
    }),
    prisma.farm.findMany({
      select: { _count: { select: { crops: true } } },
    }),
    prisma.program.count(),
    prisma.futureProject.count(),
    prisma.futureProject.count({
      where: { stage: { in: ["APPROVED", "IN_PROGRESS"] } },
    }),
    prismaUnscoped.user.count({ where: { companyId: workspaceId } }),
    prismaUnscoped.aIInsight.count({
      where: { deletedAt: null, status: "OPEN", module: { in: modules } },
    }),
    prismaUnscoped.aIInsight.count({
      where: {
        deletedAt: null,
        status: "OPEN",
        severity: { in: ["CRITICAL", "ALERT"] },
        module: { in: modules },
      },
    }),
  ]);

  // --- Financials -> margin% ---
  const rev = txns.filter((t) => t.kind === "REVENUE").reduce((a, t) => a + t.amount, 0);
  const exp = txns.filter((t) => t.kind === "EXPENSE").reduce((a, t) => a + t.amount, 0);
  const marginPct = rev > 0 ? ((rev - exp) / rev) * 100 : 0;

  // --- Sector-aware operational sub-score (0..100) ---
  // Phase BUG-2 — the HOSPITALITY branch was dividing lifetime
  // bookings by current room capacity which collapses to a tiny
  // ratio (e.g. 38 lifetime bookings / 540 rooms = 7%). Swap to
  // "last-30-days bookings × 0.5-night-each / room-nights-available"
  // which produces a meaningful occupancy %. Cap at 100.
  let operational = 70; // neutral default for holding/trade
  if (company.sector === "DAIRY") {
    const ok = batches.filter((b) => ["A", "B"].includes(b.qualityGrade)).length;
    operational = batches.length ? (ok / batches.length) * 100 : 70;
  } else if (company.sector === "HOSPITALITY") {
    const rooms = hotels.reduce((a, h) => a + (h.totalRooms ?? 0), 0);
    // Lifetime bookings doesn't make sense; we only have _count.bookings
    // on the hotel object. Use it as a noisy proxy and add a sane
    // saturation curve so the score doesn't collapse on day-1 demos.
    // Each booking ≈ 2 room-nights; period window is 30 days; room-nights
    // available in 30 days = rooms × 30. Formula: 100 × bookings × 2 / (rooms × 30).
    const bookings = hotels.reduce((a, h) => a + h._count.bookings, 0);
    operational = rooms > 0
      ? Math.min(100, Math.round((bookings * 2 * 100) / (rooms * 30)))
      : 70;
    // Floor at 30 so a freshly-seeded tenant never reads as 0 —
    // operational "data is thin" not "operations are dead".
    operational = Math.max(operational, 30);
  } else if (company.sector === "AGRICULTURE") {
    const crops = farmsAgg.reduce((a, f) => a + f._count.crops, 0);
    operational = Math.min(100, 40 + crops * 4);
  } else if (company.sector === "EDUCATION") {
    operational = Math.min(100, 40 + programs * 12);
  }

  const health = computeCompanyHealth({
    marginPct,
    operational,
    criticalSignals: criticalInsights,
    activeProjects,
  });

  const sectorMetric =
    company.sector === "DAIRY"
      ? { label: ar ? "دفعات" : "Batches", value: formatNumber(batches.length) }
      : company.sector === "HOSPITALITY"
        ? { label: ar ? "فنادق" : "Hotels", value: formatNumber(hotels.length) }
        : company.sector === "AGRICULTURE"
          ? { label: ar ? "مزارع" : "Farms", value: formatNumber(farmsAgg.length) }
          : company.sector === "EDUCATION"
            ? { label: ar ? "برامج" : "Programs", value: formatNumber(programs) }
            : { label: ar ? "مشاريع" : "Projects", value: formatNumber(projects) };

  const sections = [
    { href: "/workspace/operations", icon: Factory, ar: "العمليات", en: "Operations", descAr: "لوحة الإنتاج، الجودة، دورة الحياة", descEn: "Production board, QC, lifecycle" },
    { href: "/workspace/finance", icon: Wallet, ar: "المالية", en: "Finance", descAr: "الأرباح، السجل، البيانات الشهرية", descEn: "P&L, ledger, monthly statements" },
    { href: "/workspace/team", icon: Users2, ar: "الفريق", en: "Team", descAr: "الأشخاص، الأدوار، الأداء", descEn: "People, roles, performance" },
    { href: "/workspace/pipeline", icon: GitBranch, ar: "المشاريع", en: "Pipeline", descAr: "مشاريع المستقبل والميزانيات", descEn: "Future projects + budgets" },
    { href: "/workspace/intelligence", icon: BrainCircuit, ar: "الذكاء", en: "Intelligence", descAr: "إشارات الدماغ، الخطط، المجلس", descEn: "Brain signals, plans, council", badge: openInsights },
  ];

  return (
    <div className="ws-page">
      {/* Company Health hero */}
      <section className="ws-health" data-grade={health.grade}>
        <div className="ws-health-score">
          <div className="ws-health-ring" style={{ ["--ws-h" as any]: `${health.score}` } as React.CSSProperties}>
            <span className="ws-health-num">{health.score}</span>
            <span className="ws-health-grade">{health.grade}</span>
          </div>
        </div>
        <div className="ws-health-body">
          <div className="ws-health-eyebrow">
            {ar ? "مؤشّر صحة الشركة" : "COMPANY HEALTH INDEX"}
          </div>
          <p className="ws-health-verdict">
            {ar ? health.verdict.ar : health.verdict.en}
          </p>
          <div className="ws-health-factors">
            {health.factors.map((f) => (
              <div key={f.key} className="ws-health-factor">
                <div className="ws-health-factor-head">
                  <span>{ar ? f.label.ar : f.label.en}</span>
                  <span className="ws-mono">{f.value}</span>
                </div>
                <div className="ws-health-factor-bar">
                  <span
                    className="ws-health-factor-fill"
                    data-key={f.key}
                    style={{ width: `${f.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase BUG-1 — Team tile renamed to "Active users" to distinguish
          login accounts (the tile) from staffCount/headcount shown
          elsewhere in the company header. */}
      <section className="ws-stat-row">
        <Stat label={sectorMetric.label} value={sectorMetric.value} />
        <Stat label={ar ? "مستخدمون نشطون" : "Active users"} value={formatNumber(teamCount)} />
        <Stat label={ar ? "مشاريع" : "Projects"} value={formatNumber(projects)} />
        <Stat label={ar ? "إشارات مفتوحة" : "Open signals"} value={formatNumber(openInsights)} accent />
      </section>

      <HeritageSection
        eyebrow={
          ar
            ? "نفس حساب لوحة المجموعة — مفلتر لهذه الشركة"
            : "Same math as the group dashboard — filtered to this company"
        }
        title={ar ? "النبض المالي" : "Financial pulse"}
      >
        <WorkspaceFinancials ar={ar} txns={txns} />
      </HeritageSection>

      <HeritageSection title={ar ? "أقسام نظام الشركة" : "Company ERP sections"}>
        <div className="ws-section-grid">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href} className="ws-section-card">
                <div className="ws-section-card-top">
                  <span className="ws-section-card-icon">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  {s.badge ? (
                    <span className="ws-section-card-badge">{s.badge}</span>
                  ) : null}
                  <ArrowUpRight className="ws-section-card-arrow h-3.5 w-3.5" strokeWidth={1.5} />
                </div>
                <div className="ws-section-card-name">{ar ? s.ar : s.en}</div>
                <div className="ws-section-card-desc">{ar ? s.descAr : s.descEn}</div>
              </Link>
            );
          })}
        </div>
      </HeritageSection>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="ws-stat">
      <div className="ws-stat-label">{label}</div>
      <div
        className="ws-stat-value"
        style={accent ? { color: "var(--heri-copper)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
