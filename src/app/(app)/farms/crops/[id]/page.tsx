import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
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
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/db/db";
import {
  formatNumber,
  formatRelative,
  formatShortDate,
  FARM_TYPES_AR,
  FARM_TYPES_EN,
  loc,
} from "@/lib/utils/utils";
import "../../../daylight.css";

const CROP_STATUS_AR: Record<string, string> = {
  GROWING: "ينمو",
  HARVESTING: "في الحصاد",
  HARVESTED: "تم الحصاد",
  FAILED: "متعثر",
};
const CROP_STATUS_EN: Record<string, string> = {
  GROWING: "Growing",
  HARVESTING: "Harvesting",
  HARVESTED: "Harvested",
  FAILED: "Failed",
};

export default async function CropDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
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

  const locale = await getLocale();
  const en = locale === "en";
  const farmName = en ? (crop.farm.nameEn ?? crop.farm.name) : crop.farm.name;

  const lifecycleColor =
    crop.status === "FAILED"
      ? "#c0392b"
      : harvested
        ? "#0a8e54"
        : lifePct > 0.85
          ? "#b06a1a"
          : "#0a8e54";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Smart Agriculture" : "الزراعة الذكية"}
        title={crop.name}
        subtitle={crop.variety ? `${crop.variety} • ${farmName}` : farmName}
        actions={
          <Link href="/farms" className="dl-btn dl-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            {en ? "Farms" : "المزارع"}
          </Link>
        }
      />

      {/* Hero plinth */}
      <div className="panel reveal" style={{ marginBottom: 22 }}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center" style={{ background: "var(--cream)", border: "1px solid var(--line)" }}>
            <Sprout className="h-8 w-8" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={crop.status} />
              <Link href={`/farms/${crop.farm.id}`} className="text-[13px] font-bold hover:underline" style={{ color: "var(--gold)" }}>
                <Tractor className="me-1 inline h-3 w-3" />{farmName}
              </Link>
              <Link href={`/companies/${crop.farm.company.id}`} className="text-[13px] font-bold hover:underline" style={{ color: "var(--ink-muted)" }}>
                {crop.farm.company.name}
              </Link>
            </div>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl" style={{ color: "var(--ink)" }}>{crop.name}</h2>
            {crop.variety ? (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{en ? "Variety: " : "صنف: "}<span className="font-bold">{crop.variety}</span></p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-[12px]" style={{ color: "var(--ink-muted)" }}>
              <span>{loc(FARM_TYPES_AR, FARM_TYPES_EN, locale, crop.farm.type)}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{en ? "Planted " : "زُرع "}{formatRelative(crop.plantedAt)}</span>
              {!harvested && crop.status !== "FAILED" ? (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.max(0, daysRemaining)} {en ? "days to harvest" : "يوم للحصاد"}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <DaylightKpiGrid>
        <DaylightKpi
          label={en ? "Expected yield" : "غلة متوقعة"}
          value={`${formatNumber(crop.expectedYieldKg)} ${en ? "kg" : "كغم"}`}
        />
        <DaylightKpi
          label={harvested ? (en ? "Actual yield" : "غلة فعلية") : (en ? "Awaiting harvest" : "في انتظار الحصاد")}
          value={crop.actualYieldKg != null ? `${formatNumber(crop.actualYieldKg)} ${en ? "kg" : "كغم"}` : "—"}
          hint={yieldPct != null ? `${yieldPct >= 100 ? "+" : ""}${(yieldPct - 100).toFixed(0)}${en ? "% of expected" : "٪ من المتوقع"}` : undefined}
        />
        <DaylightKpi
          label={en ? "Growing period" : "فترة النمو"}
          value={`${Math.round(lifePct * 100)}${en ? "%" : "٪"}`}
          hint={`${Math.max(0, daysRemaining)} ${en ? "days remaining" : "يوم متبقي"}`}
        />
        <DaylightKpi
          label={en ? "Status" : "الحالة"}
          value={loc(CROP_STATUS_AR, CROP_STATUS_EN, locale, crop.status)}
        />
      </DaylightKpiGrid>

      {/* Lifecycle */}
      <DaylightPanel
        title={<span className="flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Crop cycle" : "دورة المحصول"}</span>}
        aside={crop.status === "FAILED" ? (en ? "Failed" : "متعثر") : harvested ? (en ? "Complete" : "اكتمل") : lifePct > 0.85 ? (en ? "Near harvest" : "قرب الحصاد") : (en ? "Growing" : "ينمو")}
      >
        <div className="mb-2 flex items-center justify-between text-xs">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{en ? "Planted" : "زُرع"}</div>
            <div className="font-bold" style={{ color: "var(--ink)" }}>{formatShortDate(crop.plantedAt)}</div>
          </div>
          <ArrowRight className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
          <div className="text-end">
            <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{en ? "Expected harvest" : "حصاد متوقع"}</div>
            <div className="font-bold" style={{ color: "var(--ink)" }}>{formatShortDate(crop.expectedHarvest)}</div>
          </div>
        </div>
        <div className="dl-bar">
          <i style={{ width: `${Math.min(100, harvested ? 100 : lifePct * 100)}%` }} />
        </div>
      </DaylightPanel>

      {/* Yield comparison if harvested */}
      {harvested && crop.actualYieldKg != null && crop.expectedYieldKg > 0 ? (
        <DaylightPanel title={<span className="flex items-center gap-2"><Scale className="h-4 w-4" style={{ color: "var(--gold)" }} />{en ? "Yield comparison" : "مقارنة الغلة"}</span>}>
          {(() => {
            const target = Math.max(crop.expectedYieldKg, crop.actualYieldKg);
            const expectedPct = (crop.expectedYieldKg / target) * 100;
            const actualPct = (crop.actualYieldKg / target) * 100;
            return (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
                    <span>{en ? "Expected" : "متوقع"}</span>
                    <span className="font-mono" style={{ color: "var(--ink)" }}>{formatNumber(crop.expectedYieldKg)} {en ? "kg" : "كغم"}</span>
                  </div>
                  <div className="dl-bar"><i style={{ width: `${expectedPct}%`, opacity: 0.55 }} /></div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[13px] font-bold" style={{ color: "var(--ink-muted)" }}>
                    <span>{en ? "Actual" : "فعلي"}</span>
                    <span className="font-mono" style={{ color: (yieldDelta ?? 0) >= 0 ? "#0a8e54" : "#c0392b" }}>{formatNumber(crop.actualYieldKg)} {en ? "kg" : "كغم"}</span>
                  </div>
                  <div className="dl-bar"><i style={{ width: `${actualPct}%` }} /></div>
                </div>
                {yieldDelta != null ? (
                  <div className="text-xs font-bold" style={{ color: yieldDelta >= 0 ? "#0a8e54" : "#c0392b" }}>
                    {yieldDelta >= 0 ? (en ? "Exceeded expectations by " : "تجاوز التوقعات بـ ") : (en ? "Below expectations by " : "نقص عن التوقعات بـ ")}
                    <span className="font-mono">{formatNumber(Math.abs(yieldDelta))}</span>{" "}
                    {en ? "kg" : "كغم"} ({yieldPct != null ? `${(yieldPct - 100).toFixed(0)}${en ? "%" : "٪"}` : ""})
                  </div>
                ) : null}
              </div>
            );
          })()}
        </DaylightPanel>
      ) : null}

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          {crop.notes ? (
            <DaylightPanel title={en ? "Field notes" : "ملاحظات الحقل"}>
              <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--ink)" }}>{crop.notes}</p>
            </DaylightPanel>
          ) : null}

          {sameFarm.length > 0 ? (
            <DaylightPanel
              title={en ? `Other crops at ${farmName}` : `محاصيل أخرى في ${farmName}`}
              aside={<Link href={`/farms/${crop.farm.id}`} className="hover:underline" style={{ color: "var(--gold)" }}>{en ? "Farm profile →" : "ملف المزرعة ←"}</Link>}
            >
              <ul className="divide-y divide-[var(--line)]">
                {sameFarm.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/farms/crops/${c.id}`} className="min-w-0 flex-1 hover:underline">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                        {en ? "Expected harvest " : "حصاد متوقع "}{formatShortDate(c.expectedHarvest)}
                      </div>
                    </Link>
                    <span className="font-mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                      {formatNumber(c.expectedYieldKg)} {en ? "kg" : "كغم"}
                    </span>
                  </li>
                ))}
              </ul>
            </DaylightPanel>
          ) : null}

          {sameVariety.length > 0 ? (
            <DaylightPanel title={en ? `Same variety (${crop.variety}) at other farms` : `نفس الصنف (${crop.variety}) في مزارع أخرى`}>
              <ul className="divide-y divide-[var(--line)]">
                {sameVariety.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/farms/crops/${c.id}`} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>{c.farm.name}</div>
                      <div className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                        {formatShortDate(c.plantedAt)} → {formatShortDate(c.expectedHarvest)}
                      </div>
                    </Link>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </DaylightPanel>
          ) : null}
        </div>

        <aside className="space-y-6">
          <DaylightPanel title={en ? "Agricultural card" : "البطاقة الزراعية"}>
            <dl className="space-y-2 text-xs">
              <Fact label={en ? "Crop" : "المحصول"} value={crop.name} />
              {crop.variety ? (<Fact label={en ? "Variety" : "الصنف"} value={crop.variety} />) : null}
              <Fact label={en ? "Status" : "الحالة"} value={loc(CROP_STATUS_AR, CROP_STATUS_EN, locale, crop.status)} />
              <Fact label={en ? "Planted" : "زُرع"} value={formatShortDate(crop.plantedAt)} />
              <Fact label={en ? "Expected harvest" : "حصاد متوقع"} value={formatShortDate(crop.expectedHarvest)} />
              <Fact label={en ? "Expected yield" : "غلة متوقعة"} value={`${formatNumber(crop.expectedYieldKg)} ${en ? "kg" : "كغم"}`} />
              {crop.actualYieldKg != null ? (
                <Fact label={en ? "Actual yield" : "غلة فعلية"} value={`${formatNumber(crop.actualYieldKg)} ${en ? "kg" : "كغم"}`} />
              ) : null}
              <Fact label={en ? "Farm" : "المزرعة"} value={farmName} link={`/farms/${crop.farm.id}`} />
              <Fact label={en ? "Company" : "الشركة"} value={crop.farm.company.name} link={`/companies/${crop.farm.company.id}`} />
            </dl>
          </DaylightPanel>
        </aside>
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
