// Executive one-pager report — print-friendly. Use ctrl+P → Save as PDF.
// Renders the entire company brief on a single page: brand banner, KPIs,
// revenue trend chart, top deals, ESG, headcount, signature block.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ArrowLeft, Download, Calendar } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber, formatPercent, formatDate } from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

export default async function CompanyReportPage({
  params,
}: {
  params: { id: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      hotels: { include: { bookings: true } },
      dairyBatches: true,
      farms: { include: { crops: true } },
      programs: true,
      transactions: {
        where: {
          occurredAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      esgScores: { orderBy: [{ year: "desc" }, { period: "desc" }] },
      futureProjects: { where: { deletedAt: null } },
      users: true,
    },
  });
  if (!company) notFound();

  const brand = getCompanyBrand(company.code);
  const now = new Date();
  const month = 30 * 24 * 60 * 60 * 1000;

  // Build 12-month revenue/expense trends
  const trendRevenue: number[] = [];
  const trendExpense: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * month);
    const to = new Date(now.getTime() - i * month);
    trendRevenue.push(
      company.transactions
        .filter(
          (t) => t.kind === "REVENUE" && t.occurredAt >= from && t.occurredAt < to,
        )
        .reduce((a, t) => a + t.amount, 0),
    );
    trendExpense.push(
      company.transactions
        .filter(
          (t) => t.kind === "EXPENSE" && t.occurredAt >= from && t.occurredAt < to,
        )
        .reduce((a, t) => a + t.amount, 0),
    );
  }
  const totalRevenue = trendRevenue.reduce((a, b) => a + b, 0);
  const totalExpense = trendExpense.reduce((a, b) => a + b, 0);
  const net = totalRevenue - totalExpense;
  const margin = totalRevenue > 0 ? net / totalRevenue : 0;

  const latestEsg = company.esgScores[0];

  // Sparkline path
  const max = Math.max(...trendRevenue, 1);
  const W = 600;
  const H = 80;
  const stepX = trendRevenue.length > 1 ? W / (trendRevenue.length - 1) : W;
  const points = trendRevenue.map((v, i) => {
    const x = i * stepX;
    const y = H - (v / max) * (H - 8) - 4;
    return [x, y] as const;
  });
  const path = points
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");
  const fill = `${path} L${W},${H} L0,${H} Z`;

  const expensePoints = trendExpense.map((v, i) => {
    const x = i * stepX;
    const y = H - (v / max) * (H - 8) - 4;
    return [x, y] as const;
  });
  const expensePath = expensePoints
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");

  // Recent transactions (top 10 by amount)
  const topRevenue = company.transactions
    .filter((t) => t.kind === "REVENUE")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const reportNumber = `HN-${company.code}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;

  return (
    <div className="report-page mx-auto max-w-[820px] space-y-5 p-6 print:p-0 print:shadow-none">
      {/* Toolbar (hidden in print) */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/reports"
          className="btn-ghost btn-sm"
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
          {ar ? "عودة للتقارير" : "Back to reports"}
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/html/${reportEntityFor(company.sector)}?company=${company.code}&locale=${locale}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary btn-sm"
          >
            <Download className="h-3 w-3" />
            {ar ? "HTML الكامل" : "Full HTML"}
          </a>
          <PrintButton ar={ar} />
        </div>
      </div>

      {/* The actual report card */}
      <article
        className="card overflow-hidden p-0 print:rounded-none print:border-none print:shadow-none"
        style={{ background: "white" }}
      >
        {/* BANNER */}
        <header
          className="relative px-8 py-7 text-white"
          style={{ background: brand.gradient }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                H-NERVE ERP · {ar ? "تقرير تنفيذي رسمي" : "Official Executive Report"}
              </div>
              <h1 className="mt-1 text-2xl font-black">
                {ar ? company.name : company.nameEn}
              </h1>
              <div className="mt-1 text-[11px] text-white/80">
                {brand.motto}
              </div>
            </div>
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black ring-1 ring-white/30"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              {brand.emblem}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-bold">
            <span className="rounded-md bg-white/20 px-2 py-1">
              {ar ? "رمز" : "Code"}: {company.code}
            </span>
            <span className="rounded-md bg-white/20 px-2 py-1">
              {ar ? "قطاع" : "Sector"}: {company.sector}
            </span>
            <span className="rounded-md bg-white/20 px-2 py-1">
              {ar ? "موظفون" : "Employees"}: {formatNumber(company.employees)}
            </span>
            {company.foundedYear ? (
              <span className="rounded-md bg-white/20 px-2 py-1">
                {ar ? "تأسست" : "Founded"}: {company.foundedYear}
              </span>
            ) : null}
            <span className="ms-auto rounded-md bg-white/20 px-2 py-1 font-mono">
              {reportNumber}
            </span>
          </div>
        </header>

        {/* KPI ROW */}
        <section className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: "var(--border)" }}>
          <KPI label={ar ? "إيراد ١٢ شهر" : "12-mo revenue"} value={formatMoney(totalRevenue)} accent={brand.accent} />
          <KPI label={ar ? "مصاريف" : "Expenses"} value={formatMoney(totalExpense)} accent="#9ca3af" />
          <KPI label={ar ? "صافي" : "Net"} value={formatMoney(net)} accent={net >= 0 ? "#10b981" : "#ef4444"} />
          <KPI label={ar ? "هامش" : "Margin"} value={formatPercent(margin, 1)} accent={brand.accent} />
        </section>

        {/* TREND CHART */}
        <section className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold" style={{ color: "#0f172a" }}>
              {ar ? "النبض المالي — آخر ١٢ شهر" : "Financial pulse — last 12 months"}
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-bold" style={{ color: "#64748b" }}>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: brand.accent }} />
                {ar ? "إيراد" : "Revenue"}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: "#cbd5e1" }} />
                {ar ? "مصاريف" : "Expenses"}
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            <defs>
              <linearGradient id={`g-${company.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={brand.accent} stopOpacity="0.4" />
                <stop offset="100%" stopColor={brand.accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={fill} fill={`url(#g-${company.id})`} />
            <path d={path} fill="none" stroke={brand.accent} strokeWidth="2" />
            <path d={expensePath} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </section>

        {/* OPERATIONS BREAKDOWN — sector specific */}
        <section className="border-t border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="mb-3 text-sm font-extrabold" style={{ color: "#0f172a" }}>
            {ar ? "ملخص العمليات" : "Operations summary"}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {company.sector === "HOSPITALITY" ? (
              <>
                <Stat label={ar ? "فنادق" : "Hotels"} value={formatNumber(company.hotels.length)} />
                <Stat
                  label={ar ? "إجمالي غرف" : "Total rooms"}
                  value={formatNumber(company.hotels.reduce((a, h) => a + h.totalRooms, 0))}
                />
                <Stat
                  label={ar ? "حجوزات نشطة" : "Active bookings"}
                  value={formatNumber(
                    company.hotels.reduce(
                      (a, h) =>
                        a +
                        h.bookings.filter((b) =>
                          ["CONFIRMED", "CHECKED_IN"].includes(b.status),
                        ).length,
                      0,
                    ),
                  )}
                />
              </>
            ) : null}
            {company.sector === "DAIRY" ? (
              <>
                <Stat label={ar ? "دفعات" : "Batches"} value={formatNumber(company.dairyBatches.length)} />
                <Stat
                  label={ar ? "إنتاج (لتر)" : "Output (L)"}
                  value={formatNumber(
                    company.dairyBatches.reduce((a, b) => a + b.quantityLiters, 0),
                  )}
                />
                <Stat
                  label={ar ? "جودة A" : "Grade A"}
                  value={formatNumber(
                    company.dairyBatches.filter((b) => b.qualityGrade === "A").length,
                  )}
                />
              </>
            ) : null}
            {company.sector === "AGRICULTURE" ? (
              <>
                <Stat label={ar ? "مزارع" : "Farms"} value={formatNumber(company.farms.length)} />
                <Stat
                  label={ar ? "محاصيل" : "Crops"}
                  value={formatNumber(
                    company.farms.reduce((a, f) => a + f.crops.length, 0),
                  )}
                />
                <Stat
                  label={ar ? "مساحة (دونم)" : "Area (du)"}
                  value={formatNumber(
                    company.farms.reduce((a, f) => a + f.areaDunum, 0),
                  )}
                />
              </>
            ) : null}
            {company.sector === "EDUCATION" ? (
              <>
                <Stat label={ar ? "برامج" : "Programs"} value={formatNumber(company.programs.length)} />
                <Stat
                  label={ar ? "تمويل" : "Funding"}
                  value={formatMoney(
                    company.programs.reduce((a, p) => a + p.fundingJod, 0),
                  )}
                />
                <Stat
                  label={ar ? "حجم الفِرق" : "Team size"}
                  value={formatNumber(
                    company.programs.reduce((a, p) => a + p.teamSize, 0),
                  )}
                />
              </>
            ) : null}
            <Stat
              label={ar ? "مشاريع مستقبلية" : "Future projects"}
              value={formatNumber(company.futureProjects.length)}
            />
            <Stat
              label={ar ? "ميزانية أنابيب" : "Pipeline budget"}
              value={formatMoney(
                company.futureProjects.reduce((a, p) => a + p.budgetJod, 0),
              )}
            />
            <Stat
              label={ar ? "فريق" : "Team"}
              value={formatNumber(company.users.length)}
            />
          </div>
        </section>

        {/* TOP REVENUE & ESG */}
        <section className="grid grid-cols-2 gap-0 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="border-e p-6" style={{ borderColor: "var(--border)" }}>
            <h2 className="mb-3 text-sm font-extrabold" style={{ color: "#0f172a" }}>
              {ar ? "أعلى الإيرادات" : "Top revenue"}
            </h2>
            {topRevenue.length === 0 ? (
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>
                {ar ? "لا توجد معاملات." : "No transactions."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {topRevenue.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div
                        className="line-clamp-1 font-bold"
                        style={{ color: "#0f172a" }}
                      >
                        {t.description || t.category}
                      </div>
                      <div className="text-[10px]" style={{ color: "#94a3b8" }}>
                        {t.reference} · {formatDate(t.occurredAt, locale === "ar" ? "ar" : "en")}
                      </div>
                    </div>
                    <span
                      className="font-mono font-extrabold tabular-nums"
                      style={{ color: brand.accent }}
                    >
                      {formatMoney(t.amount, t.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-6">
            <h2 className="mb-3 text-sm font-extrabold" style={{ color: "#0f172a" }}>
              {ar ? "الاستدامة (ESG)" : "Sustainability (ESG)"}
            </h2>
            {latestEsg ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-mono text-3xl font-black tabular-nums"
                    style={{ color: brand.accent }}
                  >
                    {latestEsg.overall.toFixed(1)}
                  </span>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "#94a3b8" }}
                  >
                    /100 · {latestEsg.period} {latestEsg.year}
                  </span>
                </div>
                <EsgBar
                  label={ar ? "بيئي" : "Environmental"}
                  value={latestEsg.environmentalScore}
                  accent={brand.accent}
                />
                <EsgBar
                  label={ar ? "اجتماعي" : "Social"}
                  value={latestEsg.socialScore}
                  accent={brand.accent}
                />
                <EsgBar
                  label={ar ? "حوكمة" : "Governance"}
                  value={latestEsg.governanceScore}
                  accent={brand.accent}
                />
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>
                {ar ? "لا توجد بيانات ESG بعد." : "No ESG data yet."}
              </p>
            )}
          </div>
        </section>

        {/* SIGNATURE FOOTER */}
        <footer className="px-6 py-4">
          <div
            className="flex items-center justify-between text-[10px]"
            style={{ color: "#94a3b8" }}
          >
            <div>
              <div className="font-bold" style={{ color: "#0f172a" }}>
                H-Nerve ERP · Hourani Group
              </div>
              <div>
                {ar ? "صدر بتاريخ" : "Generated"}: {formatDate(now, locale === "ar" ? "ar" : "en")} ·{" "}
                {now.toISOString().slice(11, 16)} UTC
              </div>
            </div>
            <div className="text-end">
              <div>
                {ar
                  ? "هذا التقرير سرّي ومخصص للقيادة التنفيذية"
                  : "Confidential · For executive leadership"}
              </div>
              <div className="font-mono">{reportNumber}</div>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function reportEntityFor(sector: string): string {
  if (sector === "HOSPITALITY") return "hotels";
  if (sector === "DAIRY") return "dairy";
  if (sector === "AGRICULTURE") return "farms";
  return "finance";
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="border-e p-4 last:border-e-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: "#94a3b8" }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-mono text-lg font-black tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-2.5 ring-1"
      style={{
        background: "#f8fafc",
        borderColor: "#e2e8f0",
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: "#94a3b8" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 font-mono text-base font-extrabold tabular-nums"
        style={{ color: "#0f172a" }}
      >
        {value}
      </div>
    </div>
  );
}

function EsgBar({
  label, value, accent,
}: { label: string; value: number; accent: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="text-[11px]">
      <div className="mb-0.5 flex items-center justify-between">
        <span style={{ color: "#64748b" }}>{label}</span>
        <span className="font-mono font-bold tabular-nums" style={{ color: "#0f172a" }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: "#e2e8f0" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function PrintButton({ ar }: { ar: boolean }) {
  // Tiny inline client component to trigger window.print()
  return (
    <form
      action="javascript:window.print()"
      className="contents"
    >
      <button type="submit" className="btn-primary btn-sm">
        <Printer className="h-3 w-3" />
        {ar ? "طباعة / PDF" : "Print / PDF"}
      </button>
    </form>
  );
}
