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

const PERIOD_AR: Record<string, string> = {
  Q1: "الربع الأول",
  Q2: "الربع الثاني",
  Q3: "الربع الثالث",
  Q4: "الربع الرابع",
  H1: "النصف الأول",
  H2: "النصف الثاني",
  FY: "السنة الكاملة",
};

function ScoreGauge({
  score,
  size = 180,
  stroke = 16,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label: string;
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
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="color-mix(in srgb, var(--text-muted) 14%, transparent)"
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
          className="font-mono text-4xl font-black"
          style={{ color: "var(--text)", letterSpacing: "-0.03em" }}
        >
          {Math.round(clamped)}
        </div>
        <div
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          من 100
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
      company: { select: { id: true, name: true, code: true, sector: true } },
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
      company: { select: { id: true, name: true, code: true } },
    },
  });

  const brand = getCompanyBrand(score.company.code);

  function delta(curr: number, prev?: number) {
    if (prev == null) return null;
    const d = curr - prev;
    return { up: d >= 0, value: `${d >= 0 ? "+" : ""}${d.toFixed(1)}` };
  }

  return (
    <>
      <Topbar
        eyebrow="الاستدامة وESG"
        title={`${score.company.name} — ${PERIOD_AR[score.period] ?? score.period} ${score.year}`}
        subtitle={`تقرير E·S·G للفترة ${score.period} ${score.year}`}
        actions={
          <Link href="/sustainability" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            تقارير ESG
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
              <ScoreGauge score={score.overall} label="overall" />
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
                  {PERIOD_AR[score.period] ?? score.period} {score.year}
                </span>
                <Link
                  href={`/companies/${score.company.id}`}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {score.company.name}
                </Link>
              </div>
              <h2 className="mt-1 text-2xl font-black md:text-3xl">
                مؤشر ESG الإجمالي
              </h2>
              <p className="text-sm opacity-90">
                تقييم بيئي • اجتماعي • حوكمة لربط الاستدامة بالأداء التشغيلي.
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
                        مقارنة بـ {PERIOD_AR[previous.period] ?? previous.period}{" "}
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
                        className="text-sm font-extrabold"
                        style={{ color: "var(--text)" }}
                      >
                        {row.label}
                      </div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}
                        dir="ltr"
                      >
                        {row.labelEn}
                      </div>
                    </div>
                  </div>
                  <div
                    className="font-mono text-2xl font-black"
                    style={{ color: row.color }}
                  >
                    {Math.round(row.value)}
                  </div>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                  }}
                >
                  <div
                    className="h-full rounded-full anim-rise-glow"
                    style={{
                      width: `${Math.min(100, row.value)}%`,
                      background: `linear-gradient(90deg, ${row.color} 0%, var(--accent) 100%)`,
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
                    {d.up ? "↑" : "↓"} {d.value} مقارنة بالفترة السابقة
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        {/* Operational metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="انبعاثات الكربون"
            value={`${formatNumber(score.carbonTons)} طن`}
            icon={Cloud}
            tone="slate"
            hint="CO₂ مكافئ"
          />
          <KpiCard
            label="استهلاك المياه"
            value={`${formatNumber(score.waterCubicM)} م³`}
            icon={Droplet}
            tone="sky"
          />
          <KpiCard
            label="طاقة متجددة"
            value={`${Math.round(score.renewablePct)}٪`}
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
                  className="mb-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  ملاحظات الفترة
                </h3>
                <p
                  className="whitespace-pre-line text-sm leading-relaxed"
                  style={{ color: "var(--text)" }}
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
                    className="text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                  >
                    أداء بقية شركات المجموعة في{" "}
                    {PERIOD_AR[score.period] ?? score.period} {score.year}
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
                        className="block rounded-xl px-2 py-1.5 transition hover:bg-[var(--brand-soft)]"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className="truncate text-xs font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {p.company.name}
                          </span>
                          <span
                            className="font-mono text-xs font-black"
                            style={{ color: "var(--text)" }}
                          >
                            {Math.round(p.overall)}
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full"
                          style={{
                            background:
                              "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, p.overall)}%`,
                              background:
                                "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)",
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
                className="mb-3 text-sm font-extrabold"
                style={{ color: "var(--text)" }}
              >
                البطاقة
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="الشركة" value={score.company.name} link={`/companies/${score.company.id}`} />
                <Fact
                  label="الفترة"
                  value={`${PERIOD_AR[score.period] ?? score.period} ${score.year}`}
                />
                <Fact label="بيئي" value={`${Math.round(score.environmentalScore)}/100`} />
                <Fact label="اجتماعي" value={`${Math.round(score.socialScore)}/100`} />
                <Fact label="حوكمة" value={`${Math.round(score.governanceScore)}/100`} />
                <Fact
                  label="الإجمالي"
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
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
        style={{ color: "var(--text)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--brand)" }}
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
