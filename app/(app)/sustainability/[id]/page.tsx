import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Leaf,
  Users2,
  Scale,
  Cloud,
  Droplet,
  Sun,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";
import { getLocale } from "@/lib/i18n.server";

const PERIOD_AR: Record<string, string> = {
  Q1: "الربع الأول",
  Q2: "الربع الثاني",
  Q3: "الربع الثالث",
  Q4: "الربع الرابع",
  H1: "النصف الأول",
  H2: "النصف الثاني",
  FY: "السنة الكاملة",
};

const PERIOD_EN: Record<string, string> = {
  Q1: "First Quarter",
  Q2: "Second Quarter",
  Q3: "Third Quarter",
  Q4: "Fourth Quarter",
  H1: "First Half",
  H2: "Second Half",
  FY: "Full Year",
};

function periodLabel(period: string, en: boolean) {
  return (en ? PERIOD_EN[period] : PERIOD_AR[period]) ?? period;
}

function ScoreGauge({
  score,
  size = 180,
  stroke = 16,
  label,
  en = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label: string;
  en?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 75 ? "#0a8e54" : clamped >= 50 ? "#b06a1a" : "#c0392b";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--heri-copper)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="color-mix(in srgb, var(--heri-ink-3) 14%, transparent)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#g-${label})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: "stroke-dashoffset 1s cubic-bezier(.21,.92,.32,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-mono text-4xl font-bold"
          style={{ color: "var(--heri-ink)", letterSpacing: "-0.03em" }}
        >
          {Math.round(clamped)}
        </div>
        <div
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--heri-ink-3)" }}
        >
          {en ? "out of 100" : "من 100"}
        </div>
      </div>
    </div>
  );
}

export default async function SustainabilityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const score = await prisma.sustainabilityScore.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true, nameEn: true, code: true, sector: true } },
    },
  });
  if (!score) notFound();

  // Find a previous period for the same company to compute deltas.
  const previous = await prisma.sustainabilityScore.findFirst({
    where: {
      companyId: score.companyId,
      OR: [
        { year: { lt: score.year } },
        { year: score.year, period: { lt: score.period } },
      ],
    },
    orderBy: [{ year: "desc" }, { period: "desc" }],
  });

  // Other companies in the same period for benchmarking.
  const peers = await prisma.sustainabilityScore.findMany({
    where: {
      year: score.year,
      period: score.period,
      companyId: { not: score.companyId },
    },
    orderBy: { overall: "desc" },
    take: 6,
    include: {
      company: { select: { id: true, name: true, nameEn: true, code: true } },
    },
  });

  const brand = getCompanyBrand(score.company.code);
  const en = getLocale() === "en";
  const companyName = en ? (score.company.nameEn ?? score.company.name) : score.company.name;

  function delta(curr: number, prev?: number) {
    if (prev == null) return null;
    const d = curr - prev;
    return { up: d >= 0, value: `${d >= 0 ? "+" : ""}${d.toFixed(1)}` };
  }

  return (
    <>
      <Topbar
        eyebrow={en ? "Sustainability & ESG" : "الاستدامة وESG"}
        title={`${companyName} — ${periodLabel(score.period, en)} ${score.year}`}
        subtitle={
          en
            ? `E·S·G report for ${score.period} ${score.year}`
            : `تقرير E·S·G للفترة ${score.period} ${score.year}`
        }
        actions={
          <Link href="/sustainability" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            {en ? "ESG Reports" : "تقارير ESG"}
          </Link>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{ background: brand.gradient, color: "white", minHeight: "220px" }}
        >
          <div
            className="absolute inset-0 opacity-15 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[auto,1fr] lg:items-center">
            <div className="anim-pop">
              <ScoreGauge score={score.overall} label="overall" en={en} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {periodLabel(score.period, en)} {score.year}
                </span>
                <Link
                  href={`/companies/${score.company.id}`}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {companyName}
                </Link>
              </div>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                {en ? "Overall ESG Score" : "مؤشر ESG الإجمالي"}
              </h2>
              <p className="text-sm opacity-90">
                {en
                  ? "Environmental • Social • Governance assessment linking sustainability to operational performance."
                  : "تقييم بيئي • اجتماعي • حوكمة لربط الاستدامة بالأداء التشغيلي."}
              </p>
              {previous ? (
                (() => {
                  const d = score.overall - previous.overall;
                  return (
                    <div
                      className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        background: "rgba(255,255,255,.18)",
                        border: "1px solid rgba(255,255,255,.3)",
                      }}
                    >
                      {d >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" style={{ color: "#bbf7d0" }} />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" style={{ color: "#fecaca" }} />
                      )}
                      <span>
                        {en ? "vs " : "مقارنة بـ "}
                        {periodLabel(previous.period, en)}{" "}
                        {previous.year}:{" "}
                        <span className="font-mono">
                          {d >= 0 ? "+" : ""}
                          {d.toFixed(1)}
                        </span>
                      </span>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>
        </section>

        {/* E/S/G triple */}
        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              label: "بيئي",
              labelEn: "Environmental",
              value: score.environmentalScore,
              prev: previous?.environmentalScore,
              icon: Leaf,
              color: "#0a8e54",
            },
            {
              label: "اجتماعي",
              labelEn: "Social",
              value: score.socialScore,
              prev: previous?.socialScore,
              icon: Users2,
              color: "#1c5fbe",
            },
            {
              label: "حوكمة",
              labelEn: "Governance",
              value: score.governanceScore,
              prev: previous?.governanceScore,
              icon: Scale,
              color: "#6d28d9",
            },
          ].map((row, i) => {
            const Icon = row.icon;
            const d = delta(row.value, row.prev);
            return (
              <div
                key={row.label}
                className="card card-pad anim-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        background: `color-mix(in srgb, ${row.color} 16%, transparent)`,
                        color: row.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--heri-ink)" }}
                      >
                        {en ? row.labelEn : row.label}
                      </div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--heri-ink-3)" }}
                        dir="ltr"
                      >
                        {row.labelEn}
                      </div>
                    </div>
                  </div>
                  <div
                    className="font-mono text-2xl font-bold"
                    style={{ color: row.color }}
                  >
                    {Math.round(row.value)}
                  </div>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
                  }}
                >
                  <div
                    className="h-full rounded-full anim-rise-glow"
                    style={{
                      width: `${Math.min(100, row.value)}%`,
                      background: `linear-gradient(90deg, ${row.color} 0%, var(--heri-copper) 100%)`,
                      boxShadow: `0 0 14px ${row.color}`,
                      transition: "width .8s cubic-bezier(.21,.92,.32,1)",
                    }}
                  />
                </div>
                {d ? (
                  <div
                    className="mt-2 text-[11px] font-bold"
                    style={{ color: d.up ? "#0a8e54" : "#c0392b" }}
                  >
                    {d.up ? "↑" : "↓"} {d.value}{" "}
                    {en ? "vs previous period" : "مقارنة بالفترة السابقة"}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        {/* Operational metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label={en ? "Carbon Emissions" : "انبعاثات الكربون"}
            value={`${formatNumber(score.carbonTons)} ${en ? "tonnes" : "طن"}`}
            icon={Cloud}
            tone="slate"
            hint={en ? "CO₂ equivalent" : "CO₂ مكافئ"}
          />
          <KpiCard
            label={en ? "Water Consumption" : "استهلاك المياه"}
            value={`${formatNumber(score.waterCubicM)} ${en ? "m³" : "م³"}`}
            icon={Droplet}
            tone="sky"
          />
          <KpiCard
            label={en ? "Renewable Energy" : "طاقة متجددة"}
            value={`${Math.round(score.renewablePct)}${en ? "%" : "٪"}`}
            icon={Sun}
            tone="amber"
          />
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Notes */}
            {score.notes ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {en ? "Period Notes" : "ملاحظات الفترة"}
                </h3>
                <p
                  className="whitespace-pre-line text-sm leading-relaxed"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {score.notes}
                </p>
              </section>
            ) : null}

            {/* Peers benchmark */}
            {peers.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    {en
                      ? "Performance of other group companies in "
                      : "أداء بقية شركات المجموعة في "}
                    {periodLabel(score.period, en)} {score.year}
                  </h3>
                </header>
                <ul className="space-y-2">
                  {peers.map((p, i) => (
                    <li
                      key={p.id}
                      className="anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/sustainability/${p.id}`}
                        className="block rounded-xl px-2 py-1.5 transition hover:bg-[var(--heri-cream-2)]"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className="truncate text-xs font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {en ? (p.company.nameEn ?? p.company.name) : p.company.name}
                          </span>
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {Math.round(p.overall)}
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full"
                          style={{
                            background:
                              "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, p.overall)}%`,
                              background:
                                "linear-gradient(90deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)",
                              transition: "width .6s ease",
                            }}
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                {en ? "Summary Card" : "البطاقة"}
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Company" : "الشركة"} value={companyName} link={`/companies/${score.company.id}`} />
                <Fact
                  label={en ? "Period" : "الفترة"}
                  value={`${periodLabel(score.period, en)} ${score.year}`}
                />
                <Fact label={en ? "Environmental" : "بيئي"} value={`${Math.round(score.environmentalScore)}/100`} />
                <Fact label={en ? "Social" : "اجتماعي"} value={`${Math.round(score.socialScore)}/100`} />
                <Fact label={en ? "Governance" : "حوكمة"} value={`${Math.round(score.governanceScore)}/100`} />
                <Fact
                  label={en ? "Overall" : "الإجمالي"}
                  value={`${Math.round(score.overall)}/100`}
                />
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function Fact({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
        style={{ color: "var(--heri-ink)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--heri-ochre)" }}
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
