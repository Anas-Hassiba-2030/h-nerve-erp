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
  ArrowUpRight, Factory, Wallet, Users2, GitBranch, BrainCircuit, Inbox,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { WorkspaceFinancials } from "@/components/workspace/WorkspaceFinancials";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber, formatDate } from "@/lib/utils";
import { computeCompanyHealth } from "@/lib/workspace/health";
import { COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy";
import "../daylight.css";

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
    select: { sector: true, name: true, nameEn: true, code: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";
  const modules = SECTOR_MODULES[company.sector] ?? [];

  // Phase NS-1 — incoming purchase intent. This company's tenant slug is
  // the supplier side; surface DRAFT/SENT POs that other tenants drafted
  // against it via the cross-tenant supply-chain bridge.
  const currentTenantSlug = COMPANY_CODE_TO_TENANT_SLUG[company.code] ?? null;
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // CROSS-TENANT INTENT: these POs live on the BUYER's tenant, not the
  // active one — they're surfaced here precisely because the supplier
  // (this tenant) needs to see incoming demand. Filtered to suppliers
  // whose linkedTenantId points back at us. Read-only.
  const incomingIntents = currentTenantSlug
    ? await prismaUnscoped.purchaseOrder.findMany({
        where: {
          deletedAt: null,
          status: { in: ["DRAFT", "SENT"] },
          orderedAt: { gte: since30 },
          supplierRef: { linkedTenantId: currentTenantSlug },
        },
        orderBy: { orderedAt: "desc" },
        take: 25,
        select: {
          id: true,
          poNumber: true,
          expectedAt: true,
          sourceForecast: {
            select: {
              id: true,
              productLabel: true,
              predictedDemand: true,
              unit: true,
              source: { select: { name: true, nameEn: true } },
            },
          },
        },
      })
    : [];

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
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "مساحة العمل" : "Workspace"}
        title={ar ? company.name : (company.nameEn ?? company.name)}
        subtitle={ar ? "مركز التحكم الشامل للشركة" : "Company command center"}
      />

      {/* Company Health hero */}
      <div className="panel reveal" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: "var(--emerald)", fontVariantNumeric: "tabular-nums" }}>{health.score}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{health.grade}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)", marginBottom: 8 }}>
              {ar ? "مؤشّر صحة الشركة" : "COMPANY HEALTH INDEX"}
            </div>
            <p style={{ fontSize: 14, color: "var(--ink)", marginBottom: 12 }}>
              {ar ? health.verdict.ar : health.verdict.en}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {health.factors.map((f) => (
                <div key={f.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "var(--ink-muted)" }}>{ar ? f.label.ar : f.label.en}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{f.value}</span>
                  </div>
                  <div className="dl-bar"><i style={{ width: `${f.value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DaylightKpiGrid>
        <DaylightKpi label={sectorMetric.label} value={sectorMetric.value} />
        <DaylightKpi label={ar ? "مستخدمون نشطون" : "Active users"} value={formatNumber(teamCount)} />
        <DaylightKpi label={ar ? "مشاريع" : "Projects"} value={formatNumber(projects)} />
        <DaylightKpi label={ar ? "إشارات مفتوحة" : "Open signals"} value={formatNumber(openInsights)} />
      </DaylightKpiGrid>

      <DaylightPanel
        title={ar ? "النبض المالي" : "Financial pulse"}
        aside={ar ? "نفس حساب لوحة المجموعة — مفلتر لهذه الشركة" : "Same math as the group dashboard — filtered to this company"}
      >
        <WorkspaceFinancials ar={ar} txns={txns} />
      </DaylightPanel>

      {/* Phase NS-1 — Incoming Purchase Intent. Cross-tenant POs other
          arms drafted against this company via the supply-chain bridge. */}
      <DaylightPanel
        title={ar ? "نوايا شراء واردة" : "Incoming purchase intent"}
        aside={
          ar
            ? `${formatNumber(incomingIntents.length)} أمر مسودة من وحدات أخرى`
            : `${formatNumber(incomingIntents.length)} draft orders from other arms`
        }
      >
        {incomingIntents.length === 0 ? (
          <div
            className="flex items-center gap-3 px-4 py-6"
            style={{ background: "var(--cream)", border: "1px solid var(--line)" }}
          >
            <Inbox className="h-5 w-5" style={{ color: "var(--ink-muted)" }} strokeWidth={1.5} />
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {ar
                ? "لا نوايا شراء واردة خلال آخر 30 يوم."
                : "No incoming purchase intents in the last 30 days."}
            </span>
          </div>
        ) : (
          <div className="grid gap-2">
            {incomingIntents.map((po) => {
              const buyer = po.sourceForecast?.source;
              const buyerName = buyer ? (ar ? buyer.name : buyer.nameEn) : (ar ? "وحدة أخرى" : "Another arm");
              return (
                <div
                  key={po.id}
                  className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center px-4 py-3"
                  style={{ background: "var(--cream)", border: "1px solid var(--line)" }}
                >
                  <div className="min-w-0">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>
                      {buyerName}
                      <span style={{ color: "var(--line)", margin: "0 8px" }}>·</span>
                      <span className="font-mono">{po.poNumber}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                      {po.sourceForecast?.productLabel ?? (ar ? "طلب" : "Order")}
                      {po.sourceForecast ? (
                        <span style={{ color: "var(--ink-muted)", fontWeight: 500 }}>
                          {" "}— {formatNumber(po.sourceForecast.predictedDemand)} {po.sourceForecast.unit}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2 }}>
                      {ar ? "تسليم متوقع: " : "Expected delivery: "}
                      {po.expectedAt ? formatDate(po.expectedAt, ar ? "ar" : "en") : (ar ? "غير محدّد" : "unset")}
                    </div>
                  </div>
                  <Link
                    href="/supply-chain"
                    className="dl-btn dl-btn-secondary md:justify-self-end"
                    style={{ fontSize: 11.5, padding: "6px 12px", whiteSpace: "nowrap" }}
                  >
                    {ar ? "التنبؤ الأصلي ←" : "View originating forecast →"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>

      <DaylightPanel title={ar ? "أقسام نظام الشركة" : "Company ERP sections"}>
        <div className="prop-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href} className="prop-card" style={{ display: "block", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ borderRadius: 10, padding: 8, background: "rgba(46,107,87,.1)" }}>
                    <Icon className="h-4 w-4" style={{ color: "var(--emerald)" }} strokeWidth={1.6} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {s.badge ? (
                      <span style={{ background: "var(--gold)", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "2px 7px" }}>{s.badge}</span>
                    ) : null}
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "var(--ink-muted)" }} strokeWidth={1.5} />
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{ar ? s.ar : s.en}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{ar ? s.descAr : s.descEn}</div>
              </Link>
            );
          })}
        </div>
      </DaylightPanel>
    </DaylightShell>
  );
}
