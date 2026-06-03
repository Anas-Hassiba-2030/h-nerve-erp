import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { notFound } from "next/navigation";
import {
  Pencil,
  ArrowLeft,
  Hotel,
  Milk,
  Sprout,
  GraduationCap,
  Users2,
  Calendar,
  MapPin,
  Wallet,
  Brain,
  FlaskConical,
  Leaf,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { KpiCard } from "@/components/KpiCard";
import { SectorPill } from "@/components/SectorPill";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { PinButton } from "@/components/PinButton";
import { enterWorkspace } from "@/app/actions/workspace";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatNumber,
  formatMoney,
  formatShortDate,
  STATUS_AR,
  TIERS_AR,
  FARM_TYPES_AR,
  VERTICALS_AR,
  FARM_TYPES_EN,
  VERTICALS_EN,
  TIERS_EN,
  loc,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";
import "../../daylight.css";

const PROJECT_STAGE_AR: Record<string, string> = {
  IDEA: "فكرة",
  RESEARCH: "بحث",
  PLANNED: "مخططة",
  APPROVED: "معتمدة",
  IN_PROGRESS: "قيد التنفيذ",
  ON_HOLD: "متوقفة",
  DONE: "منجزة",
};

const PROJECT_STAGE_TONE: Record<string, string> = {
  IDEA: "badge-slate",
  RESEARCH: "badge-blue",
  PLANNED: "badge-blue",
  APPROVED: "badge-emerald",
  IN_PROGRESS: "badge-amber",
  ON_HOLD: "badge-slate",
  DONE: "badge-emerald",
};

function yearsSince(year: number | null | undefined) {
  if (!year) return null;
  return new Date().getFullYear() - year;
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      hotels: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { bookings: true } } },
      },
      dairyBatches: {
        orderBy: { productionDate: "desc" },
        take: 6,
      },
      farms: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { crops: true } } },
      },
      programs: {
        orderBy: { createdAt: "desc" },
      },
      transactions: {
        orderBy: { occurredAt: "desc" },
        take: 8,
      },
      futureProjects: {
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 6,
      },
      esgScores: {
        orderBy: [{ year: "desc" }, { period: "desc" }],
        take: 1,
      },
      forecastsOut: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { target: { select: { name: true, code: true } } },
      },
      forecastsIn: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { source: { select: { name: true, code: true } } },
      },
      _count: {
        select: {
          users: true,
          hotels: true,
          dairyBatches: true,
          farms: true,
          programs: true,
          transactions: true,
          futureProjects: true,
          forecastsOut: true,
          forecastsIn: true,
        },
      },
    },
  });

  if (!company) notFound();

  const brand = getCompanyBrand(company.code);
  const pinnedNow = await isPinned("COMPANY", company.id);

  // Aggregate financials for this company.
  const financialAgg = await prisma.transaction.groupBy({
    by: ["kind"],
    where: { companyId: company.id },
    _sum: { amount: true },
  });
  const incomeTotal = financialAgg
    .filter((g) => g.kind === "INCOME" || g.kind === "REVENUE")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const expenseTotal = financialAgg
    .filter((g) => g.kind === "EXPENSE" || g.kind === "COST")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const netTotal = incomeTotal - expenseTotal;

  // Hotel rollup.
  const totalRooms = company.hotels.reduce((acc, h) => acc + (h.totalRooms ?? 0), 0);
  // Dairy rollup (production volume from recent batches).
  const recentLiters = company.dairyBatches.reduce(
    (acc, b) => acc + (b.quantityLiters ?? 0),
    0
  );
  // Farm rollup.
  const totalDunum = company.farms.reduce((acc, f) => acc + (f.areaDunum ?? 0), 0);

  const age = yearsSince(company.foundedYear);
  const latestEsg = company.esgScores[0];
  const en = getLocale() === "en";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Company profile" : "ملف الشركة"}
        title={en ? company.nameEn : company.name}
        subtitle={en ? company.name : company.nameEn}
        actions={
          <div className="flex items-center gap-2">
            {/* The descent: enter THIS company's scoped ERP back-office. Sets
                the workspace + tenant cookies (enterWorkspace) and lands on
                /workspace — every query then auto-scopes to this company. */}
            <form action={enterWorkspace}>
              <input type="hidden" name="companyId" value={company.id} />
              <button type="submit" className="dl-btn dl-btn-primary">
                <Building2 className="h-4 w-4" />
                {en ? "Open back-office" : "دخول نظام الشركة"}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
            <Link href="/companies" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              {en ? "Register" : "السجل"}
            </Link>
            <PinButton
              entityType="COMPANY"
              entityId={company.id}
              label={company.name}
              labelEn={company.nameEn}
              href={`/companies/${company.id}`}
              icon="Building2"
              initial={pinnedNow}
              tone="default"
              locale="ar"
            />
            <Link href={`/companies/${company.id}/edit`} className="dl-btn dl-btn-secondary">
              <Pencil className="h-4 w-4" />
              {en ? "Edit" : "تعديل"}
            </Link>
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* ---------------------------------------------------------------- */}
        {/* Brand cover                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white anim-fade-up"
          style={{ background: brand.gradient, minHeight: "180px" }}
        >
          <div
            className="absolute inset-0 opacity-20 anim-grad"
            style={{
              background: `linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)`,
            }}
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl font-bold anim-pop"
                style={{
                  background: "rgba(255,255,255,.15)",
                  border: "1px solid rgba(255,255,255,.35)",
                  backdropFilter: "blur(6px)",
                  textShadow: "0 2px 12px rgba(0,0,0,.25)",
                }}
              >
                {brand.emblemSymbol ?? brand.emblem}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">
                    #{company.code}
                  </span>
                  <SectorPill sector={company.sector} />
                  <StatusBadge status={company.status} />
                </div>
                <h2 className="mt-1 text-2xl font-bold md:text-3xl" style={{ letterSpacing: "-0.01em" }}>
                  {getLocale() === "en" ? company.nameEn : company.name}
                </h2>
                <p className="text-sm opacity-90" dir="ltr">
                  {brand.mottoEn}
                </p>
                <p className="text-sm opacity-90">{brand.motto}</p>
              </div>
            </div>

            {/* Quick facts */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
              >
                <MapPin className="h-3 w-3" />
                {company.city ?? "—"} • {company.country}
              </span>
              {company.foundedYear ? (
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
                >
                  <Calendar className="h-3 w-3" />
                  {en ? "Founded" : "تأسست"} {company.foundedYear} {age != null ? `• ${age} ${en ? "yrs" : "سنة"}` : ""}
                </span>
              ) : null}
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
              >
                <Users2 className="h-3 w-3" />
                {formatNumber(company.employees)} {en ? "employees" : "موظف"}
              </span>
              {company.ticker ? (
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs"
                  style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)" }}
                >
                  $ {company.ticker}
                </span>
              ) : null}
            </div>
          </div>

          {company.description ? (
            <p className="relative mt-4 max-w-3xl text-sm opacity-95">
              {company.description}
            </p>
          ) : null}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* KPI strip                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={en ? "Revenue" : "إيرادات"}
            value={formatMoney(incomeTotal)}
            icon={TrendingUp}
            tone="emerald"
            hint={`${formatNumber(company._count.transactions)} ${en ? "transactions" : "حركة مالية"}`}
          />
          <KpiCard
            label={en ? "Expenses" : "مصروفات"}
            value={formatMoney(expenseTotal)}
            icon={TrendingDown}
            tone="red"
          />
          <KpiCard
            label={en ? "Net" : "صافي"}
            value={formatMoney(netTotal)}
            icon={Wallet}
            tone={netTotal >= 0 ? "emerald" : "red"}
            delta={
              incomeTotal > 0
                ? {
                    up: netTotal >= 0,
                    value: `${Math.round((Math.abs(netTotal) / incomeTotal) * 100)}${en ? "%" : "٪"}`,
                  }
                : undefined
            }
          />
          <KpiCard
            label={en ? "Team" : "فريق العمل"}
            value={`${formatNumber(company.employees)}`}
            icon={Users2}
            tone="indigo"
            hint={`${company._count.users} ${en ? "active accounts" : "حساب نشط"}`}
          />
        </section>

        {/* Operational rollup based on sector */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {company._count.hotels > 0 ? (
            <KpiCard
              label={en ? "Hotels" : "فنادق"}
              value={formatNumber(company._count.hotels)}
              icon={Hotel}
              tone="amber"
              hint={`${formatNumber(totalRooms)} ${en ? "total rooms" : "غرفة إجمالية"}`}
            />
          ) : null}
          {company._count.dairyBatches > 0 ? (
            <KpiCard
              label={en ? "Recent dairy batches" : "دفعات ألبان أخيرة"}
              value={formatNumber(company._count.dairyBatches)}
              icon={Milk}
              tone="sky"
              hint={`${formatNumber(recentLiters)} ${en ? "litres (recent)" : "لتر آخر دفعات"}`}
            />
          ) : null}
          {company._count.farms > 0 ? (
            <KpiCard
              label={en ? "Farms" : "مزارع"}
              value={formatNumber(company._count.farms)}
              icon={Sprout}
              tone="emerald"
              hint={`${formatNumber(totalDunum)} ${en ? "dunum" : "دونم"}`}
            />
          ) : null}
          {company._count.programs > 0 ? (
            <KpiCard
              label={en ? "Programs & incubators" : "برامج وحاضنات"}
              value={formatNumber(company._count.programs)}
              icon={GraduationCap}
              tone="indigo"
            />
          ) : null}
          {(company._count.forecastsOut > 0 || company._count.forecastsIn > 0) ? (
            <KpiCard
              label={en ? "Supply-chain signals" : "إشارات سلسلة التوريد"}
              value={formatNumber(company._count.forecastsOut + company._count.forecastsIn)}
              icon={Brain}
              tone="violet"
              hint={en ? `out ${company._count.forecastsOut} • in ${company._count.forecastsIn}` : `صادرة ${company._count.forecastsOut} • واردة ${company._count.forecastsIn}`}
            />
          ) : null}
          {company._count.futureProjects > 0 ? (
            <KpiCard
              label={en ? "Future projects" : "مشاريع مستقبلية"}
              value={formatNumber(company._count.futureProjects)}
              icon={FlaskConical}
              tone="blue"
            />
          ) : null}
          {latestEsg ? (
            <KpiCard
              label={en ? "ESG score" : "مؤشر ESG"}
              value={`${Math.round(latestEsg.overall)}/100`}
              icon={Leaf}
              tone="emerald"
              hint={`${latestEsg.period} ${latestEsg.year}`}
            />
          ) : null}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Two-column body                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          {/* Left column: operational entities */}
          <div className="space-y-6">
            {/* Hotels */}
            {company.hotels.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Hotel className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Hotels" : "الفنادق"}                  </h3>
                  <Link href="/hotels" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--line)]">
                  {company.hotels.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {en ? (h.nameEn ?? h.name) : h.name}{" "}
                          <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            {"★".repeat(h.starRating)}
                          </span>
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {h.city} • {loc(TIERS_AR, TIERS_EN, getLocale(), h.tier)} • {formatNumber(h.totalRooms)} غرفة
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-sky">{h._count.bookings} {en ? "bookings" : "حجز"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Dairy batches */}
            {company.dairyBatches.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Milk className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Recent dairy batches" : "دفعات الألبان الأخيرة"}                  </h3>
                  <Link href="/dairy" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--line)]">
                  {company.dairyBatches.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {en ? (b.product || b.productAr) : (b.productAr || b.product)}
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: "var(--ink-muted)" }}>
                          {b.batchNumber} • {formatShortDate(b.productionDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                          {formatNumber(b.quantityLiters)} {en ? "L" : "لتر"}
                        </span>
                        <span className="badge-sky">{en ? "Grade" : "درجة"} {b.qualityGrade}</span>
                        <StatusBadge status={b.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Farms */}
            {company.farms.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Sprout className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Farms" : "المزارع"}                  </h3>
                  <Link href="/farms" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--line)]">
                  {company.farms.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {en ? (f.nameEn ?? f.name) : f.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {loc(FARM_TYPES_AR, FARM_TYPES_EN, getLocale(), f.type)} • {f.location} • {formatNumber(f.areaDunum)} {en ? "dunum" : "دونم"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-emerald">{f._count.crops} {en ? "crops" : "محصول"}</span>
                        <StatusBadge status={f.alertLevel} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Programs */}
            {company.programs.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <GraduationCap className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Programs & incubators" : "البرامج والحاضنات"}                  </h3>
                  <Link href="/education" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--line)]">
                  {company.programs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {en ? (p.nameEn ?? p.name) : p.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {loc(VERTICALS_AR, VERTICALS_EN, getLocale(), p.vertical)} • {en ? "Founder:" : "مؤسس:"} {p.founder} • {en ? "Cohort" : "فوج"} {p.cohort}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-indigo">{formatMoney(p.fundingJod)}</span>
                        <StatusBadge status={p.stage} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* If nothing operational, show a single empty state instead of multiple cards. */}
            {company.hotels.length === 0 &&
            company.dairyBatches.length === 0 &&
            company.farms.length === 0 &&
            company.programs.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={en ? "No linked operations yet" : "لا توجد عمليات مرتبطة بعد"}
                description={en ? "Hotels, batches, farms, and programs will appear here once linked to this company." : "ستظهر هنا الفنادق، الدفعات، المزارع، والبرامج فور ربطها بهذه الشركة."}
              />
            ) : null}
          </div>

          {/* Right column: capital + signals */}
          <aside className="space-y-6">
            {/* Forecasts */}
            {company.forecastsOut.length > 0 || company.forecastsIn.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Brain className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Supply-chain signals" : "إشارات السلسلة"}                  </h3>
                  <Link href="/supply-chain" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>

                {company.forecastsOut.length > 0 ? (
                  <div className="mb-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                      {en ? "Outbound" : "صادرة منها"}                    </div>
                    <ul className="space-y-1.5">
                      {company.forecastsOut.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: "color-mix(in srgb, var(--gold) 6%, transparent)" }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <ArrowUpRight className="h-3 w-3 shrink-0" style={{ color: "#0a8e54" }} />
                            <span className="truncate font-bold" style={{ color: "var(--ink)" }}>
                              {en ? (f.productLabelEn || f.productLabel) : f.productLabel}
                            </span>
                            <span style={{ color: "var(--ink-muted)" }}>→ {f.target.code}</span>
                          </div>
                          <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            {formatNumber(f.predictedDemand)} {f.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {company.forecastsIn.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                      {en ? "Inbound" : "واردة إليها"}                    </div>
                    <ul className="space-y-1.5">
                      {company.forecastsIn.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: "color-mix(in srgb, var(--gold) 6%, transparent)" }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <ArrowDownRight className="h-3 w-3 shrink-0" style={{ color: "#c0392b" }} />
                            <span className="truncate font-bold" style={{ color: "var(--ink)" }}>
                              {en ? (f.productLabelEn || f.productLabel) : f.productLabel}
                            </span>
                            <span style={{ color: "var(--ink-muted)" }}>← {f.source.code}</span>
                          </div>
                          <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            {formatNumber(f.predictedDemand)} {f.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Recent transactions */}
            {company.transactions.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Wallet className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Recent transactions" : "حركات مالية أخيرة"}                  </h3>
                  <Link href="/finance" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="space-y-1.5">
                  {company.transactions.map((t) => {
                    const isIncome = t.kind === "INCOME" || t.kind === "REVENUE";
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold" style={{ color: "var(--ink)" }}>
                            {t.description ?? t.category}
                          </div>
                          <div className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            {t.reference} • {formatShortDate(t.occurredAt)}
                          </div>
                        </div>
                        <span
                          className="shrink-0 font-mono text-xs font-bold"
                          style={{ color: isIncome ? "#0a8e54" : "#c0392b" }}
                        >
                          {isIncome ? "+" : "−"}
                          {formatMoney(t.amount, t.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* Future projects */}
            {company.futureProjects.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <FlaskConical className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Future projects" : "المشاريع المستقبلية"}                  </h3>
                  <Link href="/projects" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
                    {en ? "View all →" : "عرض الكل ←"}
                  </Link>
                </header>
                <ul className="space-y-2">
                  {company.futureProjects.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg px-2 py-2"
                      style={{ background: "color-mix(in srgb, var(--gold) 5%, transparent)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {p.title}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            {p.startQuarter ?? "—"} → {p.targetQuarter ?? "—"}
                          </div>
                        </div>
                        <span className={PROJECT_STAGE_TONE[p.stage] ?? "badge-slate"}>
                          {PROJECT_STAGE_AR[p.stage] ?? p.stage}
                        </span>
                      </div>
                      {p.budgetJod > 0 ? (
                        <div className="mt-1 text-[10px] font-mono" style={{ color: "var(--ink-muted)" }}>
                          {en ? "Budget" : "ميزانية"} {formatMoney(p.budgetJod)}
                        </div>
                      ) : null}
                      {p.progressPct > 0 ? (
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                          style={{ background: "color-mix(in srgb, var(--ink-muted) 14%, transparent)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, p.progressPct)}%`,
                              background: "linear-gradient(90deg, var(--gold) 0%, var(--gold) 100%)",
                              transition: "width .6s ease",
                            }}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ESG */}
            {latestEsg ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <Leaf className="h-4 w-4" style={{ color: "var(--gold)" }} />
                    {en ? "Sustainability (ESG)" : "الاستدامة (ESG)"}                  </h3>
                  <span className="text-[10px] font-mono" style={{ color: "var(--ink-muted)" }}>
                    {latestEsg.period} {latestEsg.year}
                  </span>
                </header>
                <div className="space-y-2">
                  {[
                    { label: "بيئي", v: latestEsg.environmentalScore, color: "#0a8e54" },
                    { label: "اجتماعي", v: latestEsg.socialScore, color: "#1c5fbe" },
                    { label: "حوكمة", v: latestEsg.governanceScore, color: "#6d28d9" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: "var(--ink-muted)" }}>
                        <span>{row.label}</span>
                        <span style={{ color: "var(--ink)" }}>{Math.round(row.v)}/100</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "color-mix(in srgb, var(--ink-muted) 14%, transparent)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, row.v)}%`,
                            background: row.color,
                            transition: "width .6s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {latestEsg.carbonTons > 0 || latestEsg.renewablePct > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]" style={{ color: "var(--ink-muted)" }}>
                    {latestEsg.carbonTons > 0 ? (
                      <div>
                        {en ? "Carbon:" : "كربون:"} <span className="font-mono font-bold" style={{ color: "var(--ink)" }}>
                          {formatNumber(latestEsg.carbonTons)} {en ? "t" : "طن"}
                        </span>
                      </div>
                    ) : null}
                    {latestEsg.renewablePct > 0 ? (
                      <div>
                        {en ? "Renewable:" : "طاقة متجددة:"} <span className="font-mono font-bold" style={{ color: "var(--ink)" }}>
                          {Math.round(latestEsg.renewablePct)}{en ? "%" : "٪"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </DaylightShell>
  );
}
