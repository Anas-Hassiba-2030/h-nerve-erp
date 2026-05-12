import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Globe,
  Building2,
  Activity,
  Calendar,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { prisma } from "@/lib/db";
import { formatNumber, formatRelative } from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

const REGION_AR: Record<string, string> = {
  MENA: "الشرق الأوسط وشمال أفريقيا",
  EU: "أوروبا",
  US: "الولايات المتحدة",
  ASIA: "آسيا",
};

const EXCHANGE_AR: Record<string, string> = {
  ASE: "بورصة عمّان",
  TADAWUL: "تداول السعودية",
  DFM: "سوق دبي المالي",
  NYSE: "بورصة نيويورك",
  NASDAQ: "ناسداك",
};

function parseHistory(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return [];
}

function Sparkline({
  values,
  color,
  width = 600,
  height = 140,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(" ");
  const areaPath = `M0,${height} L${points.replace(
    /,/g,
    ","
  )} L${width},${height} Z`;
  const linePath = `M${points.replace(/ /g, " L")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-32 w-full"
    >
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkArea)" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Final dot */}
      <circle
        cx={(values.length - 1) * stepX}
        cy={height - ((values[values.length - 1] - min) / range) * height}
        r="4"
        fill={color}
      >
        <animate
          attributeName="r"
          values="4;6;4"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export default async function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const stock = await prisma.marketStock.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true, code: true } },
    },
  });
  if (!stock) notFound();

  const peers = await prisma.marketStock.findMany({
    where: {
      exchange: stock.exchange,
      id: { not: stock.id },
    },
    orderBy: { changePct: "desc" },
    take: 6,
  });

  const history = parseHistory(stock.history);
  const isUp = stock.changePct >= 0;
  const trendColor = isUp ? "#0a8e54" : "#c0392b";
  const trendIcon = isUp ? TrendingUp : TrendingDown;
  const TrendIcon = trendIcon;

  const high = history.length > 0 ? Math.max(...history) : stock.lastPrice;
  const low = history.length > 0 ? Math.min(...history) : stock.lastPrice;
  const sessionRange = high - low;

  const brand = stock.company
    ? getCompanyBrand(stock.company.code)
    : null;

  return (
    <>
      <Topbar
        eyebrow="الأسواق العالمية"
        title={stock.labelAr ?? stock.label}
        subtitle={stock.label}
        actions={
          <Link href="/markets" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            الأسواق
          </Link>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{
            background:
              brand?.gradient ??
              `linear-gradient(135deg, #0a1929 0%, #112a3f 50%, ${trendColor} 110%)`,
            color: "white",
            minHeight: "200px",
          }}
        >
          <div
            className="absolute inset-0 opacity-15 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[1fr,auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-xs"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                  dir="ltr"
                >
                  {stock.ticker}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {EXCHANGE_AR[stock.exchange] ?? stock.exchange}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  <Globe className="me-1 inline h-3 w-3" />
                  {REGION_AR[stock.region] ?? stock.region}
                </span>
                {stock.company ? (
                  <Link
                    href={`/companies/${stock.company.id}`}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                    style={{
                      background: "rgba(255,255,255,.2)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    شركة المجموعة: {stock.company.name}
                  </Link>
                ) : null}
              </div>
              <h2 className="mt-1 text-3xl font-black md:text-4xl">
                {stock.labelAr ?? stock.label}
              </h2>
              {stock.labelAr ? (
                <p className="text-sm opacity-90" dir="ltr">
                  {stock.label}
                </p>
              ) : null}
            </div>

            {/* Price block */}
            <div className="text-end">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-90">
                آخر سعر
              </div>
              <div
                className="font-mono text-5xl font-black md:text-6xl"
                style={{
                  textShadow: "0 2px 14px rgba(0,0,0,.3)",
                  letterSpacing: "-0.02em",
                }}
              >
                {stock.lastPrice.toFixed(2)}
              </div>
              <div
                className="mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-sm font-black anim-pop"
                style={{
                  background: isUp
                    ? "rgba(34,197,94,.25)"
                    : "rgba(239,68,68,.25)",
                  border: `1px solid ${isUp ? "rgba(187,247,208,.4)" : "rgba(254,202,202,.4)"}`,
                  color: isUp ? "#bbf7d0" : "#fecaca",
                }}
              >
                <TrendIcon className="h-4 w-4" />
                {isUp ? "+" : ""}
                {stock.changePct.toFixed(2)}٪
              </div>
              <div className="mt-1 font-mono text-xs opacity-80" dir="ltr">
                {stock.currency}
              </div>
            </div>
          </div>
        </section>

        {/* Sparkline */}
        {history.length > 1 ? (
          <section className="card card-pad anim-fade-up">
            <header className="mb-3 flex items-center justify-between">
              <h3
                className="flex items-center gap-2 text-sm font-extrabold"
                style={{ color: "var(--text)" }}
              >
                <Activity
                  className="h-4 w-4"
                  style={{ color: "var(--brand)" }}
                />
                الحركة السعرية
              </h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span style={{ color: "var(--text-muted)" }}>
                  أعلى:{" "}
                  <span
                    className="font-mono font-black"
                    style={{ color: "var(--text)" }}
                  >
                    {high.toFixed(2)}
                  </span>
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  أدنى:{" "}
                  <span
                    className="font-mono font-black"
                    style={{ color: "var(--text)" }}
                  >
                    {low.toFixed(2)}
                  </span>
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  مدى:{" "}
                  <span className="font-mono font-black" style={{ color: trendColor }}>
                    {sessionRange.toFixed(2)}
                  </span>
                </span>
              </div>
            </header>
            <Sparkline values={history} color={trendColor} />
          </section>
        ) : null}

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="آخر إغلاق"
            value={`${stock.lastPrice.toFixed(2)} ${stock.currency}`}
            icon={Activity}
            tone="indigo"
          />
          <KpiCard
            label="التغير"
            value={`${isUp ? "+" : ""}${stock.changePct.toFixed(2)}٪`}
            icon={TrendIcon}
            tone={isUp ? "emerald" : "red"}
          />
          <KpiCard
            label="البورصة"
            value={EXCHANGE_AR[stock.exchange] ?? stock.exchange}
            icon={Globe}
            tone="violet"
          />
          <KpiCard
            label="المنطقة"
            value={REGION_AR[stock.region] ?? stock.region}
            icon={Building2}
            tone="amber"
          />
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Peers */}
          {peers.length > 0 ? (
            <section className="card card-pad anim-fade-up">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  <TrendingUp
                    className="h-4 w-4"
                    style={{ color: "var(--brand)" }}
                  />
                  أسهم أخرى من{" "}
                  {EXCHANGE_AR[stock.exchange] ?? stock.exchange}
                </h3>
                <Link
                  href="/markets"
                  className="text-[11px] font-bold"
                  style={{ color: "var(--brand)" }}
                >
                  كل الأسواق ←
                </Link>
              </header>
              <ul className="divide-y divide-[var(--border)]">
                {peers.map((p, i) => {
                  const pUp = p.changePct >= 0;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/markets/${p.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: "var(--text)" }}
                            dir="ltr"
                          >
                            {p.ticker}
                          </span>
                          <span
                            className="truncate text-sm font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {p.labelAr ?? p.label}
                          </span>
                        </div>
                      </Link>
                      <div className="flex items-center gap-3 text-end">
                        <span
                          className="font-mono text-xs font-black"
                          style={{ color: "var(--text)" }}
                        >
                          {p.lastPrice.toFixed(2)}
                        </span>
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: pUp ? "#0a8e54" : "#c0392b" }}
                        >
                          {pUp ? "+" : ""}
                          {p.changePct.toFixed(2)}٪
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <div />
          )}

          <aside className="space-y-6">
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-extrabold"
                style={{ color: "var(--text)" }}
              >
                البطاقة
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="الرمز" value={stock.ticker} mono />
                <Fact label="الاسم" value={stock.labelAr ?? stock.label} />
                <Fact
                  label="البورصة"
                  value={EXCHANGE_AR[stock.exchange] ?? stock.exchange}
                />
                <Fact label="العملة" value={stock.currency} mono />
                <Fact
                  label="المنطقة"
                  value={REGION_AR[stock.region] ?? stock.region}
                />
                <Fact
                  label="آخر تحديث"
                  value={formatRelative(stock.updatedAt)}
                />
                {stock.company ? (
                  <Fact
                    label="شركة المجموعة"
                    value={stock.company.name}
                    link={`/companies/${stock.company.id}`}
                  />
                ) : null}
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
  mono,
}: {
  label: string;
  value: string;
  link?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd
        className={`text-end font-bold ${mono ? "font-mono" : ""}`}
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
