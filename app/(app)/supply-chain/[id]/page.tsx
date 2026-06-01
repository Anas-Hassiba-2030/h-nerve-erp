import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Calendar,
  Target,
  Activity,
  TrendingUp,
  Package2,
  User as UserIcon,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatNumber,
  formatPercent,
  formatShortDate,
  formatRelative,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";
import { rankById } from "@/lib/gamification";
import { getLocale } from "@/lib/i18n.server";
import "../../daylight.css";

const CATEGORY_AR: Record<string, string> = {
  DAIRY: "ألبان",
  PRODUCE: "خضروات وفواكه",
  MEAT: "لحوم",
  BAKERY: "مخبوزات",
  BEVERAGE: "مشروبات",
  HOSPITALITY: "ضيافة",
  GENERAL: "عام",
};

const CATEGORY_EN: Record<string, string> = {
  DAIRY: "Dairy",
  PRODUCE: "Produce",
  MEAT: "Meat",
  BAKERY: "Bakery",
  BEVERAGE: "Beverage",
  HOSPITALITY: "Hospitality",
  GENERAL: "General",
};

export default async function ForecastDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const f = await prisma.supplyForecast.findUnique({
    where: { id: params.id },
    include: {
      source: {
        select: { id: true, name: true, nameEn: true, code: true, sector: true },
      },
      target: {
        select: { id: true, name: true, nameEn: true, code: true, sector: true },
      },
      generatedBy: {
        select: { id: true, name: true, role: true, rank: true, xp: true },
      },
    },
  });
  if (!f) notFound();

  const related = await prisma.supplyForecast.findMany({
    where: {
      category: f.category,
      id: { not: f.id },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      source: { select: { name: true, code: true } },
      target: { select: { name: true, code: true } },
    },
  });

  const sourceBrand = getCompanyBrand(f.source.code);
  const targetBrand = getCompanyBrand(f.target.code);
  const conf = Math.min(1, Math.max(0, f.confidence));
  const confTone: "emerald" | "amber" | "red" =
    conf >= 0.75 ? "emerald" : conf >= 0.5 ? "amber" : "red";

  const periodDays = Math.max(
    1,
    Math.round(
      (f.periodEnd.getTime() - f.periodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const pinned = await isPinned("FORECAST", f.id);

  const en = getLocale() === "en";
  const sourceName = en ? (f.source.nameEn ?? f.source.name) : f.source.name;
  const targetName = en ? (f.target.nameEn ?? f.target.name) : f.target.name;
  const categoryLabel = en
    ? (CATEGORY_EN[f.category] ?? f.category)
    : (CATEGORY_AR[f.category] ?? f.category);

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Predictive Supply Chain" : "سلسلة التوريد التنبؤية"}
        title={f.productLabel}
        subtitle={`${sourceName} → ${targetName}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/supply-chain" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              {en ? "Forecasts" : "التوقعات"}
            </Link>
            <PinButton
              entityType="FORECAST"
              entityId={f.id}
              label={f.productLabel}
              href={`/supply-chain/${f.id}`}
              icon="Brain"
              initial={pinned}
              tone="default"
              locale={en ? "en" : "ar"}
            />
          </div>
        }
      />

      <div className="space-y-6">
        {/* Source → Target hero */}
        <section className="card card-pad anim-fade-up">
          <div className="grid gap-3 md:grid-cols-[1fr,auto,1fr] md:items-stretch">
            {/* Source */}
            <Link
              href={`/companies/${f.source.id}`}
              className="relative overflow-hidden rounded-2xl p-5 text-white transition hover:scale-[1.01]"
              style={{ background: sourceBrand.gradient }}
            >
              <div
                className="absolute inset-0 opacity-15 anim-grad"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
                }}
                aria-hidden
              />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
                  {en ? "Source" : "المصدر"}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {sourceName}
                </div>
                <div className="font-mono text-xs opacity-90">
                  #{f.source.code}
                </div>
              </div>
            </Link>

            {/* Arrow with predicted demand */}
            <div className="flex flex-col items-center justify-center px-2">
              <div
                className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--ink-muted)" }}
              >
                {en ? "Predicted Demand" : "الطلب المتوقع"}
              </div>
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: "var(--ink)" }}
              >
                {formatNumber(f.predictedDemand)}
              </div>
              <div
                className="text-xs font-bold"
                style={{ color: "var(--gold)" }}
              >
                {f.unit}
              </div>
              <div className="my-2 flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
                <ArrowRight
                  className="h-8 w-8"
                  style={{ color: "var(--gold)" }}
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
              </div>
              <StatusBadge status={f.status} />
            </div>

            {/* Target */}
            <Link
              href={`/companies/${f.target.id}`}
              className="relative overflow-hidden rounded-2xl p-5 text-white transition hover:scale-[1.01]"
              style={{ background: targetBrand.gradient }}
            >
              <div
                className="absolute inset-0 opacity-15 anim-grad"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
                }}
                aria-hidden
              />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
                  {en ? "Destination" : "الوجهة"}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {targetName}
                </div>
                <div className="font-mono text-xs opacity-90">
                  #{f.target.code}
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* KPIs */}
        <DaylightKpiGrid>
          <DaylightKpi label={en ? "Predicted Demand" : "الطلب المتوقع"} value={`${formatNumber(f.predictedDemand)} ${f.unit}`} />
          <DaylightKpi label={en ? "Confidence Level" : "مستوى الثقة"} value={formatPercent(conf, 0)} />
          <DaylightKpi
            label={en ? "Period Duration" : "مدة الفترة"}
            value={`${formatNumber(periodDays)} ${en ? "days" : "يوم"}`}
            hint={`${formatShortDate(f.periodStart)} → ${formatShortDate(f.periodEnd)}`}
          />
          <DaylightKpi label={en ? "Category" : "التصنيف"} value={categoryLabel} />
        </DaylightKpiGrid>

        {/* Confidence meter */}
        <DaylightPanel
          title={<span className="flex items-center gap-2"><Target className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Engine Confidence Indicator" : "مؤشر ثقة المحرك"}</span>}
          aside={<span className="font-mono font-bold" style={{ color: confTone === "emerald" ? "#0a8e54" : confTone === "amber" ? "#b06a1a" : "#c0392b" }}>{Math.round(conf * 100)}{en ? "%" : "٪"}</span>}
        >
          <div className="dl-bar">
            <i style={{ width: `${conf * 100}%` }} />
          </div>
          <div className="mt-1 text-[10px]" style={{ color: "var(--ink-muted)" }}>
            {confTone === "emerald"
              ? en ? "High confidence — direct adoption recommended" : "ثقة عالية — يوصى بالاعتماد المباشر"
              : confTone === "amber"
                ? en ? "Medium confidence — verify before adopting" : "ثقة متوسطة — تحقق قبل الاعتماد"
                : en ? "Low confidence — requires human review" : "ثقة منخفضة — يحتاج مراجعة بشرية"}
          </div>
        </DaylightPanel>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Signal */}
            <DaylightPanel title={<span className="flex items-center gap-2"><Brain className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Triggering Signal" : "الإشارة المحفّزة"}</span>}>
              <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--ink)" }}>{f.signal}</p>
            </DaylightPanel>

            {/* Related forecasts */}
            {related.length > 0 ? (
              <DaylightPanel
                title={<span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Other forecasts in category" : "توقعات أخرى من تصنيف"} {categoryLabel}</span>}
                aside={<Link href="/supply-chain" className="hover:underline" style={{ color: "var(--gold)" }}>{en ? "All forecasts ←" : "كل التوقعات ←"}</Link>}
              >
                <ul className="divide-y divide-[var(--line)]">
                  {related.map((r) => (
                    <li key={r.id} className="py-2.5">
                      <Link href={`/supply-chain/${r.id}`} className="block hover:underline">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>{r.productLabel}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <span className="font-mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {formatNumber(r.predictedDemand)} {r.unit}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: "var(--ink-muted)" }}>
                          {r.source.code} → {r.target.code} • {Math.round(r.confidence * 100)}{en ? "% confidence" : "٪ ثقة"}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </DaylightPanel>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Period */}
            <DaylightPanel title={<span className="flex items-center gap-2"><Calendar className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Time Period" : "الفترة الزمنية"}</span>}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{en ? "From" : "من"}</div>
                  <div className="font-bold" style={{ color: "var(--ink)" }}>{formatShortDate(f.periodStart)}</div>
                </div>
                <ArrowRight className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
                <div className="text-end">
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{en ? "To" : "إلى"}</div>
                  <div className="font-bold" style={{ color: "var(--ink)" }}>{formatShortDate(f.periodEnd)}</div>
                </div>
              </div>
              <div className="text-[11px] text-center" style={{ color: "var(--ink-muted)" }}>
                {formatNumber(periodDays)} {en ? "days • avg" : "يوم • متوسط"}{" "}
                {formatNumber(f.predictedDemand / periodDays)} {f.unit}{en ? "/day" : "/يوم"}
              </div>
            </DaylightPanel>

            {/* Generated by */}
            {f.generatedBy ? (
              <DaylightPanel title={<span className="flex items-center gap-2"><UserIcon className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Generated By" : "مَن أصدر التوقع"}</span>}>
                <Link href={`/users/${f.generatedBy.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--cream)]">
                  {(() => {
                    const r = rankById(f.generatedBy.rank);
                    return <div className="rank-piece" style={{ color: r.color }} title={en ? r.en : r.ar}>{r.symbol}</div>;
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{f.generatedBy.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      {f.generatedBy.role} • <span className="font-mono">{formatNumber(f.generatedBy.xp)} XP</span>
                    </div>
                  </div>
                </Link>
              </DaylightPanel>
            ) : (
              <DaylightPanel title={<span className="flex items-center gap-2"><Brain className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Automated Engine" : "محرك تلقائي"}</span>}>
                <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                  {en ? "This forecast was generated by the system's predictive engine without human intervention." : "هذا التوقع صادر عن المحرك التنبؤي للنظام دون تدخل بشري."}
                </p>
              </DaylightPanel>
            )}

            {/* Meta */}
            <DaylightPanel title={en ? "Summary" : "البطاقة"}>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Product" : "المنتج"} value={f.productLabel} />
                <Fact label={en ? "Unit" : "الوحدة"} value={f.unit} />
                <Fact label={en ? "Category" : "التصنيف"} value={categoryLabel} />
                <Fact label={en ? "Status" : "الحالة"} value={f.status} />
                <Fact label={en ? "Published" : "نُشر"} value={formatRelative(f.createdAt)} />
              </dl>
            </DaylightPanel>
          </aside>
        </div>
      </div>
    </DaylightShell>
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
    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd className="text-end font-bold" style={{ color: "var(--ink)" }}>
        {link ? (
          <Link href={link} className="hover:underline" style={{ color: "var(--gold)" }}>{value}</Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
