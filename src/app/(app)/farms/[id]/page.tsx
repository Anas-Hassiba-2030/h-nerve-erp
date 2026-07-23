import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Beaker,
  Plus,
  Save,
  Activity,
  Sprout,
  MapPin,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { PinButton } from "@/components/ui/PinButton";
import { prisma } from "@/lib/db/db";
import { isPinned } from "@/lib/utils/pins";
import {
  FARM_TYPES_AR,
  formatNumber,
  formatRelative,
  formatShortDate,
  FARM_TYPES_EN,
  loc,
} from "@/lib/utils/utils";
import { updateSensors, deleteCrop } from "../actions";
import "../../daylight.css";

export default async function FarmDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const farm = await prisma.farm.findUnique({
    where: { id: params.id },
    include: { company: true, crops: { orderBy: { expectedHarvest: "asc" } } },
  });
  if (!farm) notFound();

  const sensorsAction = updateSensors.bind(null, farm.id);
  const pinned = await isPinned("FARM", farm.id);

  // Derive a few headline numbers for the KPI strip
  const cropsCount = farm.crops.length;
  const growingCount = farm.crops.filter((c) => c.status === "GROWING").length;
  const expectedYieldKg = farm.crops.reduce((a, c) => a + (c.expectedYieldKg ?? 0), 0);
  const actualYieldKg = farm.crops.reduce((a, c) => a + (c.actualYieldKg ?? 0), 0);
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={`${en ? farm.company.nameEn : farm.company.name} • ${loc(FARM_TYPES_AR, FARM_TYPES_EN, locale, farm.type)}`}
        title={en ? (farm.nameEn ?? farm.name) : farm.name}
        subtitle={`${farm.location} • ${formatNumber(farm.areaDunum)} ${en ? "dunum" : "دونم"}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/farms" className="dl-btn dl-btn-secondary" style={{ fontSize: 13 }}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> {en ? "Back" : "العودة"}
            </Link>
            <PinButton
              entityType="FARM"
              entityId={farm.id}
              label={farm.name}
              labelEn={farm.nameEn ?? undefined}
              href={`/farms/${farm.id}`}
              icon="Sprout"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      {/* Hero plinth */}
      <div className="panel reveal" style={{ marginBottom: 22 }}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center"
              style={{ background: "var(--cream)", border: "1px solid var(--line)" }}
            >
              <Sprout className="h-8 w-8" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)", marginBottom: 6 }} className="flex items-center gap-2">
                <span>{loc(FARM_TYPES_AR, FARM_TYPES_EN, locale, farm.type)}</span>
                <span style={{ color: "var(--line)" }}>·</span>
                <StatusBadge status={farm.alertLevel} />
              </div>
              <h2 className="text-2xl font-semibold md:text-3xl" style={{ color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                {farm.name}
              </h2>
              {farm.nameEn ? (
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }} dir="ltr">{farm.nameEn}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--ink-muted)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {farm.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {en ? "Last reading:" : "آخر قراءة:"} {formatRelative(farm.lastReadAt)}
                </span>
                <Link href={`/companies/${farm.companyId}`} className="hover:underline" style={{ color: "var(--gold)" }}>
                  {farm.company.name}
                </Link>
              </div>
            </div>
          </div>
        </div>
        {farm.description ? (
          <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--ink-muted)", lineHeight: 1.55 }}>
            {farm.description}
          </p>
        ) : null}
      </div>

      {/* KPI strip */}
      <DaylightKpiGrid>
        <DaylightKpi
          label={en ? "Area" : "المساحة"}
          value={formatNumber(farm.areaDunum)}
          hint={en ? "dunum" : "دونم"}
        />
        <DaylightKpi
          label={en ? "Crop count" : "عدد المحاصيل"}
          value={formatNumber(cropsCount)}
          hint={`${formatNumber(growingCount)} ${en ? "growing" : "في النمو"}`}
        />
        <DaylightKpi
          label={en ? "Expected yield" : "إنتاج متوقع"}
          value={formatNumber(expectedYieldKg)}
          hint={en ? "kg — aggregate" : "كغ — مجمّع"}
        />
        <DaylightKpi
          label={en ? "Actual yield" : "إنتاج فعلي"}
          value={formatNumber(actualYieldKg)}
          hint={expectedYieldKg > 0
            ? (en ? `${Math.round((actualYieldKg / expectedYieldKg) * 100)}% of target` : `${Math.round((actualYieldKg / expectedYieldKg) * 100)}٪ من المتوقع`)
            : "—"}
        />
      </DaylightKpiGrid>

      {/* Sensors + about — two-column */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]" style={{ marginBottom: 22 }}>
        <DaylightPanel
          title={
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
              {en ? "Sensor status" : "حالة المستشعرات"}
            </span>
          }
          aside={`${en ? "Last reading:" : "آخر قراءة:"} ${formatRelative(farm.lastReadAt)}`}
        >

            <form action={sensorsAction} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="tempC">
                    <Thermometer className="me-1 inline h-3.5 w-3.5 text-amber-600" />
                    {en ? "Temp (°C)" : "حرارة (°م)"}
                  </label>
                  <input
                    id="tempC"
                    name="tempC"
                    type="number"
                    step={0.1}
                    defaultValue={farm.tempC ?? ""}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="humidity">
                    <Droplets className="me-1 inline h-3.5 w-3.5 text-sky-600" />
                    {en ? "Humidity (%)" : "رطوبة (٪)"}
                  </label>
                  <input
                    id="humidity"
                    name="humidity"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    defaultValue={farm.humidity ?? ""}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="soilMoisture">
                    <Beaker className="me-1 inline h-3.5 w-3.5 text-emerald-600" />
                    {en ? "Soil moisture (%)" : "رطوبة تربة (٪)"}
                  </label>
                  <input
                    id="soilMoisture"
                    name="soilMoisture"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    defaultValue={farm.soilMoisture ?? ""}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="label" htmlFor="alertLevel">{en ? "Alert level" : "مستوى التنبيه"}</label>
                  <select
                    id="alertLevel"
                    name="alertLevel"
                    defaultValue={farm.alertLevel}
                    className="select"
                  >
                    <option value="OK">{en ? "Normal" : "طبيعي"}</option>
                    <option value="WARN">{en ? "Warning" : "تحذير"}</option>
                    <option value="CRITICAL">{en ? "Critical" : "حرج"}</option>
                  </select>
                </div>
                <button type="submit" className="dl-btn dl-btn-primary" style={{ fontSize: 13 }}>
                  <Save className="h-4 w-4" strokeWidth={1.5} /> {en ? "Save reading" : "حفظ القراءة"}
                </button>
              </div>
            </form>
        </DaylightPanel>

        <DaylightPanel title={en ? "About the farm" : "عن المزرعة"}>
          {farm.description ? (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)", lineHeight: 1.55 }}>
              {farm.description}
            </p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)", fontStyle: "italic" }}>
              {en ? "No description." : "لا يوجد وصف."}
            </p>
          )}
          <dl className="mt-4 space-y-2 text-xs">
            <Fact label="النوع" value={loc(FARM_TYPES_AR, FARM_TYPES_EN, locale, farm.type)} />
            <Fact label={en ? "Location" : "الموقع"} value={farm.location} />
            <Fact label={en ? "Area" : "المساحة"} value={`${formatNumber(farm.areaDunum)} ${en ? "dunum" : "دونم"}`} />
            <Fact
              label={en ? "Company" : "الشركة"}
              value={farm.company.name}
              link={`/companies/${farm.companyId}`}
            />
          </dl>
        </DaylightPanel>
      </div>

      {/* Crops */}
      <DaylightPanel
        title={en ? "Crops" : "المحاصيل"}
        aside={
          <Link href={`/farms/crops/new?farmId=${farm.id}`} className="dl-btn dl-btn-secondary" style={{ fontSize: 13 }}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> {en ? "Add crop" : "إضافة محصول"}
          </Link>
        }
      >
        {farm.crops.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {en ? "No crops recorded." : "لا توجد محاصيل مسجلة."}
          </p>
        ) : (
          <table className="dl-table">
            <thead>
              <tr>
                <th>{en ? "Crop" : "المحصول"}</th>
                <th>{en ? "Variety" : "الصنف"}</th>
                <th>{en ? "Planted" : "زرع"}</th>
                <th>{en ? "Exp. harvest" : "حصاد متوقع"}</th>
                <th>{en ? "Exp. yield (kg)" : "إنتاج متوقع (كغ)"}</th>
                <th>{en ? "Actual yield (kg)" : "إنتاج فعلي (كغ)"}</th>
                <th>{en ? "Status" : "الحالة"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {farm.crops.map((c) => (
                <tr key={c.id}>
                  <td className="font-bold" style={{ color: "var(--ink)" }}>{c.name}</td>
                  <td style={{ color: "var(--ink-muted)" }}>{c.variety ?? "—"}</td>
                  <td className="text-xs tabular-nums">{formatShortDate(c.plantedAt)}</td>
                  <td className="text-xs tabular-nums">{formatShortDate(c.expectedHarvest)}</td>
                  <td className="tabular-nums">{formatNumber(c.expectedYieldKg)}</td>
                  <td className="tabular-nums">{c.actualYieldKg != null ? formatNumber(c.actualYieldKg) : "—"}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <DeleteButton action={deleteCrop} payload={{ id: c.id }} label={`حذف ${c.name}؟`} description="سيتم حذف المحصول من سجلات هذه المزرعة." />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DaylightPanel>
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
      <dd
        className="text-end font-bold"
        style={{ color: "var(--ink)" }}
      >
        {link ? (
          <Link href={link} className="hover:underline" style={{ color: "var(--gold)" }}>
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
