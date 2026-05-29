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
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
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

const CATEGORY_AR: Record<string, string> = {
  DAIRY: "ألبان",
  PRODUCE: "خضروات وفواكه",
  MEAT: "لحوم",
  BAKERY: "مخبوزات",
  BEVERAGE: "مشروبات",
  HOSPITALITY: "ضيافة",
  GENERAL: "عام",
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
        select: { id: true, name: true, code: true, sector: true },
      },
      target: {
        select: { id: true, name: true, code: true, sector: true },
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

  return (
    <>
      <Topbar
        eyebrow="سلسلة التوريد التنبؤية"
        title={f.productLabel}
        subtitle={`${f.source.name} → ${f.target.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/supply-chain" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              التوقعات
            </Link>
            <PinButton
              entityType="FORECAST"
              entityId={f.id}
              label={f.productLabel}
              href={`/supply-chain/${f.id}`}
              icon="Brain"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
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
                  المصدر
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {f.source.name}
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
                style={{ color: "var(--heri-ink-3)" }}
              >
                الطلب المتوقع
              </div>
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: "var(--heri-ink)" }}
              >
                {formatNumber(f.predictedDemand)}
              </div>
              <div
                className="text-xs font-bold"
                style={{ color: "var(--heri-copper)" }}
              >
                {f.unit}
              </div>
              <div className="my-2 flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full anim-pulse-ring"
                  style={{ background: "var(--heri-ochre)" }}
                />
                <ArrowRight
                  className="h-8 w-8 anim-fade-up"
                  style={{ color: "var(--heri-ochre)" }}
                />
                <span
                  className="h-2 w-2 rounded-full anim-pulse-ring"
                  style={{ background: "var(--heri-copper)" }}
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
                  الوجهة
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {f.target.name}
                </div>
                <div className="font-mono text-xs opacity-90">
                  #{f.target.code}
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="الطلب المتوقع"
            value={`${formatNumber(f.predictedDemand)} ${f.unit}`}
            icon={Package2}
            tone="violet"
          />
          <KpiCard
            label="مستوى الثقة"
            value={formatPercent(conf, 0)}
            icon={Target}
            tone={confTone}
          />
          <KpiCard
            label="مدة الفترة"
            value={`${formatNumber(periodDays)} يوم`}
            icon={Calendar}
            tone="indigo"
            hint={`${formatShortDate(f.periodStart)} → ${formatShortDate(f.periodEnd)}`}
          />
          <KpiCard
            label="التصنيف"
            value={CATEGORY_AR[f.category] ?? f.category}
            icon={Activity}
            tone="amber"
          />
        </section>

        {/* Confidence meter */}
        <section className="card card-pad anim-fade-up">
          <header className="mb-2 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <Target
                className="h-4 w-4"
                style={{ color: "var(--heri-ochre)" }}
              />
              مؤشر ثقة المحرك
            </h3>
            <span
              className="text-xs font-mono font-bold"
              style={{
                color:
                  confTone === "emerald"
                    ? "#0a8e54"
                    : confTone === "amber"
                      ? "#b06a1a"
                      : "#c0392b",
              }}
            >
              {Math.round(conf * 100)}٪
            </span>
          </header>
          <div
            className="h-3 w-full overflow-hidden rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
            }}
          >
            <div
              className="h-full rounded-full anim-rise-glow"
              style={{
                width: `${conf * 100}%`,
                background:
                  confTone === "emerald"
                    ? "linear-gradient(90deg, #0a8e54 0%, var(--heri-copper) 100%)"
                    : confTone === "amber"
                      ? "linear-gradient(90deg, #b06a1a 0%, #f5b341 100%)"
                      : "linear-gradient(90deg, #c0392b 0%, #fca5a5 100%)",
                boxShadow:
                  confTone === "emerald"
                    ? "0 0 18px #0a8e54"
                    : confTone === "amber"
                      ? "0 0 18px #b06a1a"
                      : "0 0 18px #c0392b",
                transition: "width .8s cubic-bezier(.21,.92,.32,1)",
              }}
            />
          </div>
          <div
            className="mt-1 text-[10px]"
            style={{ color: "var(--heri-ink-3)" }}
          >
            {confTone === "emerald"
              ? "ثقة عالية — يوصى بالاعتماد المباشر"
              : confTone === "amber"
                ? "ثقة متوسطة — تحقق قبل الاعتماد"
                : "ثقة منخفضة — يحتاج مراجعة بشرية"}
          </div>
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Signal */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-2 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                <Brain
                  className="h-4 w-4"
                  style={{ color: "var(--heri-ochre)" }}
                />
                الإشارة المحفّزة
              </h3>
              <p
                className="whitespace-pre-line text-sm leading-relaxed"
                style={{ color: "var(--heri-ink)" }}
              >
                {f.signal}
              </p>
            </section>

            {/* Related forecasts */}
            {related.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    <TrendingUp
                      className="h-4 w-4"
                      style={{ color: "var(--heri-ochre)" }}
                    />
                    توقعات أخرى من تصنيف{" "}
                    {CATEGORY_AR[f.category] ?? f.category}
                  </h3>
                  <Link
                    href="/supply-chain"
                    className="text-[11px] font-bold"
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    كل التوقعات ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {related.map((r, i) => (
                    <li
                      key={r.id}
                      className="py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/supply-chain/${r.id}`}
                        className="block hover:underline"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="truncate text-sm font-bold"
                              style={{ color: "var(--heri-ink)" }}
                            >
                              {r.productLabel}
                            </span>
                            <StatusBadge status={r.status} />
                          </div>
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {formatNumber(r.predictedDemand)} {r.unit}
                          </span>
                        </div>
                        <div
                          className="text-[11px] font-mono"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {r.source.code} → {r.target.code} •{" "}
                          {Math.round(r.confidence * 100)}٪ ثقة
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Period */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                <Calendar
                  className="h-4 w-4"
                  style={{ color: "var(--heri-ochre)" }}
                />
                الفترة الزمنية
              </h3>
              <div className="mb-2 flex items-center justify-between text-xs">
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    من
                  </div>
                  <div
                    className="font-bold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    {formatShortDate(f.periodStart)}
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4"
                  style={{ color: "var(--heri-ink-3)" }}
                />
                <div className="text-end">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    إلى
                  </div>
                  <div
                    className="font-bold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    {formatShortDate(f.periodEnd)}
                  </div>
                </div>
              </div>
              <div
                className="text-[11px] text-center"
                style={{ color: "var(--heri-ink-3)" }}
              >
                {formatNumber(periodDays)} يوم • متوسط{" "}
                {formatNumber(f.predictedDemand / periodDays)} {f.unit}/يوم
              </div>
            </section>

            {/* Generated by */}
            {f.generatedBy ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <UserIcon
                    className="h-4 w-4"
                    style={{ color: "var(--heri-ochre)" }}
                  />
                  مَن أصدر التوقع
                </h3>
                <Link
                  href={`/users/${f.generatedBy.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--heri-cream-2)]"
                >
                  {(() => {
                    const r = rankById(f.generatedBy.rank);
                    return (
                      <div
                        className="rank-piece anim-pop"
                        style={{ color: r.color }}
                        title={r.ar}
                      >
                        {r.symbol}
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {f.generatedBy.name}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {f.generatedBy.role} •{" "}
                      <span className="font-mono">
                        {formatNumber(f.generatedBy.xp)} XP
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            ) : (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <Brain
                    className="h-4 w-4"
                    style={{ color: "var(--heri-ochre)" }}
                  />
                  محرك تلقائي
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  هذا التوقع صادر عن المحرك التنبؤي للنظام دون تدخل بشري.
                </p>
              </section>
            )}

            {/* Meta */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                البطاقة
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="المنتج" value={f.productLabel} />
                <Fact label="الوحدة" value={f.unit} />
                <Fact
                  label="التصنيف"
                  value={CATEGORY_AR[f.category] ?? f.category}
                />
                <Fact label="الحالة" value={f.status} />
                <Fact
                  label="نُشر"
                  value={formatRelative(f.createdAt)}
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
