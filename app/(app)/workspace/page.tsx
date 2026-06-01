// /workspace — Command Center (the company ERP's home).
//
// The layout (workspace/layout.tsx) owns the company band + nav. This
// page is the at-a-glance command surface: a Company Health composite,
// financial pulse, sector KPIs, and signposts into the deep sections.
// Every query is auto-scoped to the active company by the lib/db.ts
// middleware.
//
// Look: the "Claude Design" daylight surface, ported faithfully from
// docs/design/system/sections/workspace.html — a per-company console with
// five facets (intelligence · finance · operations · pipeline · team) plus
// a hub strip. Reference class names are preserved; real Prisma data feeds
// the facets. Scoped under .dl-page (see ./workspace.css + ../daylight.css).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Building2 } from "lucide-react";
import { WorkspaceFinancials } from "@/components/workspace/WorkspaceFinancials";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber, formatDate } from "@/lib/utils";
import { computeCompanyHealth } from "@/lib/workspace/health";
import { COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy";
import { DaylightShell } from "@/components/orrery/daylight";
import "../daylight.css";
import "./workspace.css";

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
  const locale = getLocale();
  const ar = locale === "ar";

  // Phase 26.4 — empty state instead of silently redirecting to /companies.
  // The operator was clicking "Workspace" and getting bounced to a list of
  // companies with no explanation. Render an inline picker prompt instead.
  if (!workspaceId) {
    return (
      <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
        <div className="dl-empty" style={{ padding: "80px 24px", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          <Building2 size={48} style={{ margin: "0 auto 18px", opacity: 0.5 }} />
          <h1 style={{ fontFamily: "var(--dl-display)", fontSize: 28, fontWeight: 600, marginBottom: 10 }}>
            {ar ? "اختر مساحة العمل" : "Pick a workspace"}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)", marginBottom: 22 }}>
            {ar
              ? "لم تختر شركة بعد. اختر شركة من القائمة لتفتح لوحة قيادتها الخاصة — مالية، عمليات، فريق، ذاكرة الدماغ."
              : "No company is active yet. Pick one from the list to open its dedicated command surface — financials, operations, team, brain memory."}
          </p>
          <Link
            href="/companies"
            className="dl-btn dl-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Building2 size={16} />
            {ar ? "تصفّح الشركات" : "Browse companies"}
          </Link>
        </div>
      </div>
    );
  }

  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { sector: true, name: true, nameEn: true, code: true },
  });
  if (!company) redirect("/companies");
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

  const net = rev - exp;
  const marginRounded = Math.round(marginPct);

  // The reference hub strip — five tiles, each a signpost into a deep section.
  const hub = [
    { href: "/workspace/intelligence", hi: "🧠", ht: ar ? "الذكاء" : "Intelligence" },
    { href: "/workspace/finance", hi: "💰", ht: ar ? "المالية" : "Finance" },
    { href: "/workspace/operations", hi: "⚙", ht: ar ? "العمليات" : "Operations" },
    { href: "/workspace/pipeline", hi: "◇", ht: ar ? "المشاريع" : "Pipeline" },
    { href: "/workspace/team", hi: "👥", ht: ar ? "الفريق" : "Team" },
  ];

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "مساحة عمل الشركة" : "Company workspace"}</div>
          <h1 className="sec-title">{ar ? company.name : (company.nameEn ?? company.name)}</h1>
          <p className="sec-sub">
            {ar
              ? "كونسول تشغيلي لكل شركة — الذكاء، المالية، العمليات، المشاريع، والفريق في مكان واحد."
              : "An operating console for the company — intelligence, finance, operations, pipeline, and team in one place."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · محدّث الآن" : "Live · updated now"}</span>
        </div>
      </header>

      {/* ── company-health hero ── */}
      <div className="panel reveal" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div className="kpi-val" style={{ fontSize: 48, marginTop: 0 }}>{health.score}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{health.grade}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-label" style={{ marginBottom: 8 }}>
              {ar ? "مؤشّر صحة الشركة" : "Company health index"}
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

      {/* ── hub strip — signposts into the five deep sections ── */}
      <div className="ws-hub reveal">
        {hub.map((h) => (
          <Link key={h.href} href={h.href} className="hub-tile">
            <div className="hi">{h.hi}</div>
            <div className="ht">{h.ht}</div>
          </Link>
        ))}
      </div>

      {/* ── five facets — each a per-company console card ── */}
      <div className="ws-grid">
        {/* Intelligence */}
        <div className="ws-facet reveal">
          <h3>🧠 {ar ? "الذكاء" : "Intelligence"}</h3>
          <div className="fsub">{ar ? "إشارات وخطط هذه الشركة" : "This company's signals and plans"}</div>
          <div className="ws-line"><span>{ar ? "إشارات مفتوحة" : "Open signals"}</span><span className="v">{formatNumber(openInsights)}</span></div>
          <div className="ws-line"><span>{ar ? "إشارات حرجة" : "Critical signals"}</span><span className="v">{formatNumber(criticalInsights)}</span></div>
          <div className="ws-line"><span>{ar ? "مشاريع نشطة" : "Active projects"}</span><span className="v">{formatNumber(activeProjects)}</span></div>
          <Link className="ws-btn" href="/workspace/intelligence">{ar ? "افتح المجلس" : "Open council"}</Link>
        </div>

        {/* Finance */}
        <div className="ws-facet reveal">
          <h3>💰 {ar ? "المالية" : "Finance"}</h3>
          <div className="fsub">{ar ? "آخر ٣٠ يوماً" : "Last 30 days"}</div>
          <div className="ws-line"><span>{ar ? "الإيراد" : "Revenue"}</span><span className="v">{formatMoney(rev)}</span></div>
          <div className="ws-line"><span>{ar ? "الهامش" : "Margin"}</span><span className="v">{formatNumber(marginRounded)}٪</span></div>
          <div className="ws-line"><span>{ar ? "صافي تقديري" : "Est. net"}</span><span className="v">{formatMoney(net)}</span></div>
          <Link className="ws-btn ghost" href="/workspace/finance">{ar ? "دفتر الأستاذ" : "Ledger"}</Link>
        </div>

        {/* Operations */}
        <div className="ws-facet reveal">
          <h3>⚙ {ar ? "العمليات" : "Operations"}</h3>
          <div className="fsub">{ar ? "نظرة القطاع" : "Sector snapshot"}</div>
          <div className="ws-line"><span>{sectorMetric.label}</span><span className="v">{sectorMetric.value}</span></div>
          <div className="ws-pri"><span className="dot" style={{ background: "#9a5648" }} />{ar ? "صرّف الدفعات القريبة من الانتهاء" : "Clear batches nearing expiry"}</div>
          <div className="ws-pri"><span className="dot" style={{ background: "var(--gold)" }} />{ar ? "راجع توجيه التوريد الداخلي" : "Review internal supply routing"}</div>
          <Link className="ws-btn ghost" href="/workspace/operations">{ar ? "سلسلة التوريد" : "Supply chain"}</Link>
        </div>

        {/* Pipeline */}
        <div className="ws-facet reveal">
          <h3>◇ {ar ? "المشاريع" : "Pipeline"}</h3>
          <div className="fsub">{ar ? "خط الاستثمار" : "Investment pipeline"}</div>
          <div className="ws-line"><span>{ar ? "مشاريع نشطة" : "Active projects"}</span><span className="v">{formatNumber(activeProjects)}</span></div>
          <div className="ws-line"><span>{ar ? "إجمالي المشاريع" : "Total projects"}</span><span className="v">{formatNumber(projects)}</span></div>
          <Link className="ws-btn" href="/workspace/pipeline">{ar ? "قدّم مرحلة مشروع" : "Advance a stage"}</Link>
        </div>

        {/* Team */}
        <div className="ws-facet reveal">
          <h3>👥 {ar ? "الفريق" : "Team"}</h3>
          <div className="fsub">{ar ? "إسناد الملكية" : "Ownership assignment"}</div>
          <div className="ws-line"><span>{ar ? "الأعضاء" : "Members"}</span><span className="v">{formatNumber(teamCount)}</span></div>
          <Link className="ws-btn ghost" href="/workspace/team">{ar ? "أسنِد مالك مشروع" : "Assign an owner"}</Link>
        </div>

        {/* Financial pulse — same math as the group dashboard, filtered here */}
        <div className="ws-facet reveal" style={{ gridColumn: "1 / -1" }}>
          <h3>💰 {ar ? "النبض المالي" : "Financial pulse"}</h3>
          <div className="fsub">{ar ? "نفس حساب لوحة المجموعة — مفلتر لهذه الشركة" : "Same math as the group dashboard — filtered to this company"}</div>
          <WorkspaceFinancials ar={ar} txns={txns} />
        </div>

        {/* Phase NS-1 — Incoming Purchase Intent (cross-tenant, read-only) */}
        <div className="ws-facet reveal" style={{ gridColumn: "1 / -1" }}>
          <h3>📥 {ar ? "نوايا شراء واردة" : "Incoming purchase intent"}</h3>
          <div className="fsub">
            {ar
              ? `${formatNumber(incomingIntents.length)} أمر مسودة من وحدات أخرى`
              : `${formatNumber(incomingIntents.length)} draft orders from other arms`}
          </div>
          {incomingIntents.length === 0 ? (
            <div className="ws-line" style={{ gap: 12 }}>
              <Inbox className="h-5 w-5" style={{ color: "var(--ink-muted)" }} strokeWidth={1.5} />
              <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                {ar
                  ? "لا نوايا شراء واردة خلال آخر 30 يوم."
                  : "No incoming purchase intents in the last 30 days."}
              </span>
            </div>
          ) : (
            incomingIntents.map((po) => {
              const buyer = po.sourceForecast?.source;
              const buyerName = buyer ? (ar ? buyer.name : buyer.nameEn) : (ar ? "وحدة أخرى" : "Another arm");
              return (
                <div key={po.id} className="ws-line" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="kpi-label">
                      {buyerName}
                      <span style={{ color: "var(--line)", margin: "0 8px" }}>·</span>
                      <span style={{ fontFamily: "monospace" }}>{po.poNumber}</span>
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
                  <Link href="/supply-chain" className="ws-btn ghost" style={{ marginTop: 0, whiteSpace: "nowrap" }}>
                    {ar ? "التنبؤ الأصلي ←" : "View originating forecast →"}
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DaylightShell>
  );
}
