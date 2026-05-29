import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sprout,
  Calendar,
  Scale,
  TrendingUp,
  TrendingDown,
  Clock,
  Tractor,
  ArrowRight,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import {
  ar,
  formatNumber,
  formatRelative,
  formatShortDate,
  FARM_TYPES_AR,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

const CROP_STATUS_AR: Record<string, string> = {
  GROWING: "ينمو",
  HARVESTING: "في الحصاد",
  HARVESTED: "تم الحصاد",
  FAILED: "متعثر",
};

export default async function CropDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const crop = await prisma.crop.findUnique({
    where: { id: params.id },
    include: {
      farm: {
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  if (!crop) notFound();

  const sameFarm = await prisma.crop.findMany({
    where: {
      farmId: crop.farmId,
      id: { not: crop.id },
    },
    orderBy: { expectedHarvest: "asc" },
    take: 6,
  });

  const sameVariety = crop.variety
    ? await prisma.crop.findMany({
        where: {
          name: crop.name,
          variety: crop.variety,
          id: { not: crop.id },
        },
        orderBy: { expectedHarvest: "desc" },
        take: 4,
        include: { farm: { select: { name: true } } },
      })
    : [];

  const now = new Date();
  const totalSpanMs =
    crop.expectedHarvest.getTime() - crop.plantedAt.getTime();
  const elapsedMs = Math.max(0, now.getTime() - crop.plantedAt.getTime());
  const lifePct =
    totalSpanMs > 0 ? Math.min(1, elapsedMs / totalSpanMs) : 0;
  const daysRemaining = Math.ceil(
    (crop.expectedHarvest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const harvested =
    crop.status === "HARVESTED" || crop.status === "HARVESTING";
  const yieldDelta =
    crop.actualYieldKg != null
      ? crop.actualYieldKg - crop.expectedYieldKg
      : null;
  const yieldPct =
    crop.actualYieldKg != null && crop.expectedYieldKg > 0
      ? (crop.actualYieldKg / crop.expectedYieldKg) * 100
      : null;

  const brand = getCompanyBrand(crop.farm.company.code);

  const lifecycleColor =
    crop.status === "FAILED"
      ? "#c0392b"
      : harvested
        ? "#0a8e54"
        : lifePct > 0.85
          ? "#b06a1a"
          : "#0a8e54";

  return (
    <>
      <Topbar
        eyebrow="الزراعة الذكية"
        title={crop.name}
        subtitle={
          crop.variety
            ? `${crop.variety} • ${crop.farm.name}`
            : crop.farm.name
        }
        actions={
          <Link href="/farms" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            المزارع
          </Link>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{ background: brand.gradient, color: "white", minHeight: "200px" }}
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
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(255,255,255,.18)",
                  border: "1px solid rgba(255,255,255,.35)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Sprout className="h-10 w-10" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={crop.status} />
                <Link
                  href={`/farms/${crop.farm.id}`}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  <Tractor className="me-1 inline h-3 w-3" />
                  {crop.farm.name}
                </Link>
                <Link
                  href={`/companies/${crop.farm.company.id}`}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {crop.farm.company.name}
                </Link>
              </div>
              <h2 className="mt-1 text-3xl font-bold md:text-4xl">
                {crop.name}
              </h2>
              {crop.variety ? (
                <p className="text-sm opacity-90">
                  صنف: <span className="font-bold">{crop.variety}</span>
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{
                    background: "rgba(255,255,255,.15)",
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  {ar(FARM_TYPES_AR, crop.farm.type)}
                </span>
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{
                    background: "rgba(255,255,255,.15)",
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <Calendar className="h-3 w-3" />
                  زُرع {formatRelative(crop.plantedAt)}
                </span>
                {!harvested && crop.status !== "FAILED" ? (
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Clock className="h-3 w-3" />
                    {Math.max(0, daysRemaining)} يوم للحصاد
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="غلة متوقعة"
            value={`${formatNumber(crop.expectedYieldKg)} كغم`}
            icon={Scale}
            tone="emerald"
          />
          <KpiCard
            label={harvested ? "غلة فعلية" : "في انتظار الحصاد"}
            value={
              crop.actualYieldKg != null
                ? `${formatNumber(crop.actualYieldKg)} كغم`
                : "—"
            }
            icon={Scale}
            tone={
              yieldDelta == null
                ? "slate"
                : yieldDelta >= 0
                  ? "emerald"
                  : "amber"
            }
            delta={
              yieldPct != null
                ? {
                    up: yieldPct >= 100,
                    value: `${yieldPct >= 100 ? "+" : ""}${(
                      yieldPct - 100
                    ).toFixed(0)}٪ من المتوقع`,
                  }
                : undefined
            }
          />
          <KpiCard
            label="فترة النمو"
            value={`${Math.round(lifePct * 100)}٪`}
            icon={Sprout}
            tone={crop.status === "FAILED" ? "red" : "emerald"}
            hint={`${Math.max(0, daysRemaining)} يوم متبقي`}
          />
          <KpiCard
            label="الحالة"
            value={ar(CROP_STATUS_AR, crop.status)}
            icon={harvested ? TrendingUp : TrendingDown}
            tone={
              crop.status === "FAILED"
                ? "red"
                : harvested
                  ? "emerald"
                  : "amber"
            }
          />
        </section>

        {/* Lifecycle */}
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <Clock className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
              دورة المحصول
            </h3>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: lifecycleColor }}
            >
              {crop.status === "FAILED"
                ? "متعثر"
                : harvested
                  ? "اكتمل"
                  : lifePct > 0.85
                    ? "قرب الحصاد"
                    : "ينمو"}
            </span>
          </header>
          <div className="mb-2 flex items-center justify-between text-xs">
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--heri-ink-3)" }}
              >
                زُرع
              </div>
              <div className="font-bold" style={{ color: "var(--heri-ink)" }}>
                {formatShortDate(crop.plantedAt)}
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
                حصاد متوقع
              </div>
              <div className="font-bold" style={{ color: "var(--heri-ink)" }}>
                {formatShortDate(crop.expectedHarvest)}
              </div>
            </div>
          </div>
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
                width: `${Math.min(100, harvested ? 100 : lifePct * 100)}%`,
                background: `linear-gradient(90deg, ${lifecycleColor} 0%, var(--heri-copper) 100%)`,
                boxShadow: `0 0 14px ${lifecycleColor}`,
                transition: "width .8s cubic-bezier(.21,.92,.32,1)",
              }}
            />
          </div>
        </section>

        {/* Yield comparison if harvested */}
        {harvested && crop.actualYieldKg != null && crop.expectedYieldKg > 0 ? (
          <section className="card card-pad anim-fade-up">
            <h3
              className="mb-3 flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <Scale className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
              مقارنة الغلة
            </h3>
            {(() => {
              const target = Math.max(crop.expectedYieldKg, crop.actualYieldKg);
              const expectedPct = (crop.expectedYieldKg / target) * 100;
              const actualPct = (crop.actualYieldKg / target) * 100;
              return (
                <div className="space-y-3">
                  <div>
                    <div
                      className="mb-1 flex items-center justify-between text-[11px] font-bold"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      <span>متوقع</span>
                      <span style={{ color: "var(--heri-ink)" }} className="font-mono">
                        {formatNumber(crop.expectedYieldKg)} كغم
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${expectedPct}%`,
                          background:
                            "linear-gradient(90deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)",
                          opacity: 0.55,
                          transition: "width .6s ease",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div
                      className="mb-1 flex items-center justify-between text-[11px] font-bold"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      <span>فعلي</span>
                      <span
                        className="font-mono"
                        style={{
                          color:
                            (yieldDelta ?? 0) >= 0 ? "#0a8e54" : "#c0392b",
                        }}
                      >
                        {formatNumber(crop.actualYieldKg)} كغم
                      </span>
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
                          width: `${actualPct}%`,
                          background:
                            (yieldDelta ?? 0) >= 0
                              ? "linear-gradient(90deg, #0a8e54 0%, var(--heri-copper) 100%)"
                              : "linear-gradient(90deg, #c0392b 0%, #f5b341 100%)",
                          boxShadow:
                            (yieldDelta ?? 0) >= 0
                              ? "0 0 14px #0a8e54"
                              : "0 0 14px #c0392b",
                          transition: "width .8s cubic-bezier(.21,.92,.32,1)",
                        }}
                      />
                    </div>
                  </div>
                  {yieldDelta != null ? (
                    <div
                      className="text-xs font-bold"
                      style={{
                        color: yieldDelta >= 0 ? "#0a8e54" : "#c0392b",
                      }}
                    >
                      {yieldDelta >= 0 ? "تجاوز التوقعات بـ " : "نقص عن التوقعات بـ "}
                      <span className="font-mono">
                        {formatNumber(Math.abs(yieldDelta))}
                      </span>{" "}
                      كغم ({yieldPct != null ? `${(yieldPct - 100).toFixed(0)}٪` : ""})
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </section>
        ) : null}

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {crop.notes ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  ملاحظات الحقل
                </h3>
                <p
                  className="whitespace-pre-line text-sm leading-relaxed"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {crop.notes}
                </p>
              </section>
            ) : null}

            {sameFarm.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    محاصيل أخرى في {crop.farm.name}
                  </h3>
                  <Link
                    href={`/farms/${crop.farm.id}`}
                    className="text-[11px] font-bold"
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    ملف المزرعة ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {sameFarm.map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/farms/crops/${c.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate text-sm font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {c.name}
                          </span>
                          {c.variety ? (
                            <span className="badge-emerald">{c.variety}</span>
                          ) : null}
                          <StatusBadge status={c.status} />
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          حصاد متوقع {formatShortDate(c.expectedHarvest)}
                        </div>
                      </Link>
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: "var(--heri-ink)" }}
                      >
                        {formatNumber(c.expectedYieldKg)} كغم
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {sameVariety.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-3 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  نفس الصنف ({crop.variety}) في مزارع أخرى
                </h3>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {sameVariety.map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <Link
                        href={`/farms/crops/${c.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div
                          className="truncate text-sm font-bold"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {c.farm.name}
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {formatShortDate(c.plantedAt)} →{" "}
                          {formatShortDate(c.expectedHarvest)}
                        </div>
                      </Link>
                      <StatusBadge status={c.status} />
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
                البطاقة الزراعية
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="المحصول" value={crop.name} />
                {crop.variety ? (
                  <Fact label="الصنف" value={crop.variety} />
                ) : null}
                <Fact
                  label="الحالة"
                  value={ar(CROP_STATUS_AR, crop.status)}
                />
                <Fact
                  label="زُرع"
                  value={formatShortDate(crop.plantedAt)}
                />
                <Fact
                  label="حصاد متوقع"
                  value={formatShortDate(crop.expectedHarvest)}
                />
                <Fact
                  label="غلة متوقعة"
                  value={`${formatNumber(crop.expectedYieldKg)} كغم`}
                />
                {crop.actualYieldKg != null ? (
                  <Fact
                    label="غلة فعلية"
                    value={`${formatNumber(crop.actualYieldKg)} كغم`}
                  />
                ) : null}
                <Fact
                  label="المزرعة"
                  value={crop.farm.name}
                  link={`/farms/${crop.farm.id}`}
                />
                <Fact
                  label="الشركة"
                  value={crop.farm.company.name}
                  link={`/companies/${crop.farm.company.id}`}
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
