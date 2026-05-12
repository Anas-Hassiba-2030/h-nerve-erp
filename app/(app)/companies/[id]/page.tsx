import Link from "next/link";
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
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { SectorPill } from "@/components/SectorPill";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatNumber,
  formatMoney,
  formatShortDate,
  ar,
  STATUS_AR,
  TIERS_AR,
  FARM_TYPES_AR,
  VERTICALS_AR,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

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

  return (
    <>
      <Topbar
        eyebrow="ملف الشركة"
        title={company.name}
        subtitle={company.nameEn}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/companies" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              السجل
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
            <Link href={`/companies/${company.id}/edit`} className="btn-primary">
              <Pencil className="h-4 w-4" />
              تعديل
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
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl font-black anim-pop"
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
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] opacity-80">
                    #{company.code}
                  </span>
                  <SectorPill sector={company.sector} />
                  <StatusBadge status={company.status} />
                </div>
                <h2 className="mt-1 text-2xl font-black md:text-3xl" style={{ letterSpacing: "-0.01em" }}>
                  {company.name}
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
                  تأسست {company.foundedYear} {age != null ? `• ${age} سنة` : ""}
                </span>
              ) : null}
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
              >
                <Users2 className="h-3 w-3" />
                {formatNumber(company.employees)} موظف
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
            label="إيرادات"
            value={formatMoney(incomeTotal)}
            icon={TrendingUp}
            tone="emerald"
            hint={`${formatNumber(company._count.transactions)} حركة مالية`}
          />
          <KpiCard
            label="مصروفات"
            value={formatMoney(expenseTotal)}
            icon={TrendingDown}
            tone="red"
          />
          <KpiCard
            label="صافي"
            value={formatMoney(netTotal)}
            icon={Wallet}
            tone={netTotal >= 0 ? "emerald" : "red"}
            delta={
              incomeTotal > 0
                ? {
                    up: netTotal >= 0,
                    value: `${Math.round((Math.abs(netTotal) / incomeTotal) * 100)}٪`,
                  }
                : undefined
            }
          />
          <KpiCard
            label="فريق العمل"
            value={`${formatNumber(company.employees)}`}
            icon={Users2}
            tone="indigo"
            hint={`${company._count.users} حساب نشط`}
          />
        </section>

        {/* Operational rollup based on sector */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {company._count.hotels > 0 ? (
            <KpiCard
              label="فنادق"
              value={formatNumber(company._count.hotels)}
              icon={Hotel}
              tone="amber"
              hint={`${formatNumber(totalRooms)} غرفة إجمالية`}
            />
          ) : null}
          {company._count.dairyBatches > 0 ? (
            <KpiCard
              label="دفعات ألبان أخيرة"
              value={formatNumber(company._count.dairyBatches)}
              icon={Milk}
              tone="sky"
              hint={`${formatNumber(recentLiters)} لتر آخر دفعات`}
            />
          ) : null}
          {company._count.farms > 0 ? (
            <KpiCard
              label="مزارع"
              value={formatNumber(company._count.farms)}
              icon={Sprout}
              tone="emerald"
              hint={`${formatNumber(totalDunum)} دونم`}
            />
          ) : null}
          {company._count.programs > 0 ? (
            <KpiCard
              label="برامج وحاضنات"
              value={formatNumber(company._count.programs)}
              icon={GraduationCap}
              tone="indigo"
            />
          ) : null}
          {(company._count.forecastsOut > 0 || company._count.forecastsIn > 0) ? (
            <KpiCard
              label="إشارات سلسلة التوريد"
              value={formatNumber(company._count.forecastsOut + company._count.forecastsIn)}
              icon={Brain}
              tone="violet"
              hint={`صادرة ${company._count.forecastsOut} • واردة ${company._count.forecastsIn}`}
            />
          ) : null}
          {company._count.futureProjects > 0 ? (
            <KpiCard
              label="مشاريع مستقبلية"
              value={formatNumber(company._count.futureProjects)}
              icon={FlaskConical}
              tone="blue"
            />
          ) : null}
          {latestEsg ? (
            <KpiCard
              label="مؤشر ESG"
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <Hotel className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    الفنادق
                  </h3>
                  <Link href="/hotels" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {company.hotels.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                          {h.name}{" "}
                          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {"★".repeat(h.starRating)}
                          </span>
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {h.city} • {ar(TIERS_AR, h.tier)} • {formatNumber(h.totalRooms)} غرفة
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-sky">{h._count.bookings} حجز</span>
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <Milk className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    دفعات الألبان الأخيرة
                  </h3>
                  <Link href="/dairy" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {company.dairyBatches.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                          {b.productAr || b.product}
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                          {b.batchNumber} • {formatShortDate(b.productionDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                          {formatNumber(b.quantityLiters)} لتر
                        </span>
                        <span className="badge-sky">درجة {b.qualityGrade}</span>
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <Sprout className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    المزارع
                  </h3>
                  <Link href="/farms" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {company.farms.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                          {f.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {ar(FARM_TYPES_AR, f.type)} • {f.location} • {formatNumber(f.areaDunum)} دونم
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-emerald">{f._count.crops} محصول</span>
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <GraduationCap className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    البرامج والحاضنات
                  </h3>
                  <Link href="/education" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {company.programs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                          {p.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {ar(VERTICALS_AR, p.vertical)} • مؤسس: {p.founder} • فوج {p.cohort}
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
                title="لا توجد عمليات مرتبطة بعد"
                description="ستظهر هنا الفنادق، الدفعات، المزارع، والبرامج فور ربطها بهذه الشركة."
              />
            ) : null}
          </div>

          {/* Right column: capital + signals */}
          <aside className="space-y-6">
            {/* Forecasts */}
            {company.forecastsOut.length > 0 || company.forecastsIn.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <Brain className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    إشارات السلسلة
                  </h3>
                  <Link href="/supply-chain" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
                  </Link>
                </header>

                {company.forecastsOut.length > 0 ? (
                  <div className="mb-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      صادرة منها
                    </div>
                    <ul className="space-y-1.5">
                      {company.forecastsOut.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: "color-mix(in srgb, var(--brand) 6%, transparent)" }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <ArrowUpRight className="h-3 w-3 shrink-0" style={{ color: "#0a8e54" }} />
                            <span className="truncate font-bold" style={{ color: "var(--text)" }}>
                              {f.productLabel}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}>→ {f.target.code}</span>
                          </div>
                          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {formatNumber(f.predictedDemand)} {f.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {company.forecastsIn.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      واردة إليها
                    </div>
                    <ul className="space-y-1.5">
                      {company.forecastsIn.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)" }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <ArrowDownRight className="h-3 w-3 shrink-0" style={{ color: "#c0392b" }} />
                            <span className="truncate font-bold" style={{ color: "var(--text)" }}>
                              {f.productLabel}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}>← {f.source.code}</span>
                          </div>
                          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <Wallet className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    حركات مالية أخيرة
                  </h3>
                  <Link href="/finance" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
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
                          <div className="truncate font-bold" style={{ color: "var(--text)" }}>
                            {t.description ?? t.category}
                          </div>
                          <div className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {t.reference} • {formatShortDate(t.occurredAt)}
                          </div>
                        </div>
                        <span
                          className="shrink-0 font-mono text-xs font-black"
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <FlaskConical className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    المشاريع المستقبلية
                  </h3>
                  <Link href="/projects" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>
                    عرض الكل ←
                  </Link>
                </header>
                <ul className="space-y-2">
                  {company.futureProjects.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg px-2 py-2"
                      style={{ background: "color-mix(in srgb, var(--brand) 5%, transparent)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold" style={{ color: "var(--text)" }}>
                            {p.title}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {p.startQuarter ?? "—"} → {p.targetQuarter ?? "—"}
                          </div>
                        </div>
                        <span className={PROJECT_STAGE_TONE[p.stage] ?? "badge-slate"}>
                          {PROJECT_STAGE_AR[p.stage] ?? p.stage}
                        </span>
                      </div>
                      {p.budgetJod > 0 ? (
                        <div className="mt-1 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          ميزانية {formatMoney(p.budgetJod)}
                        </div>
                      ) : null}
                      {p.progressPct > 0 ? (
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                          style={{ background: "color-mix(in srgb, var(--text-muted) 14%, transparent)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, p.progressPct)}%`,
                              background: "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)",
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
                  <h3 className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--text)" }}>
                    <Leaf className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    الاستدامة (ESG)
                  </h3>
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
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
                      <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                        <span>{row.label}</span>
                        <span style={{ color: "var(--text)" }}>{Math.round(row.v)}/100</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "color-mix(in srgb, var(--text-muted) 14%, transparent)" }}
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
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {latestEsg.carbonTons > 0 ? (
                      <div>
                        كربون: <span className="font-mono font-bold" style={{ color: "var(--text)" }}>
                          {formatNumber(latestEsg.carbonTons)} طن
                        </span>
                      </div>
                    ) : null}
                    {latestEsg.renewablePct > 0 ? (
                      <div>
                        طاقة متجددة: <span className="font-mono font-bold" style={{ color: "var(--text)" }}>
                          {Math.round(latestEsg.renewablePct)}٪
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
    </>
  );
}
