import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
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
import { Topbar } from "@/components/Topbar";
import { HeriKpi } from "@/components/HeriKpi";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteButton } from "@/components/DeleteButton";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  ar,
  FARM_TYPES_AR,
  formatNumber,
  formatRelative,
  formatShortDate,
  FARM_TYPES_EN,
  loc,
} from "@/lib/utils";
import { updateSensors, deleteCrop } from "../actions";

export default async function FarmDetailPage({ params }: { params: { id: string } }) {
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
  const en = getLocale() === "en";

  return (
    <>
      <Topbar
        eyebrow={`${farm.company.name} • ${loc(FARM_TYPES_AR, FARM_TYPES_EN, getLocale(), farm.type)}`}
        title={farm.name}
        subtitle={`${farm.location} • ${formatNumber(farm.areaDunum)} ${en ? "dunum" : "دونم"}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/farms" className="heri-btn heri-btn-ghost" style={{ fontSize: 13 }}>
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

      <div className="flex-1 space-y-6 p-6">
        {/* Heritage hero plinth */}
        <section className="heri-hero p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center"
                style={{
                  background: "var(--heri-cream-2)",
                  border: "1px solid var(--heri-rule-strong)",
                }}
              >
                <Sprout className="h-8 w-8" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
              </div>
              <div className="min-w-0">
                <div className="heri-eyebrow heri-eyebrow-ink mb-1.5 flex items-center gap-2">
                  <span>{loc(FARM_TYPES_AR, FARM_TYPES_EN, getLocale(), farm.type)}</span>
                  <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                  <StatusBadge status={farm.alertLevel} />
                </div>
                <h2
                  className="text-2xl font-semibold md:text-3xl"
                  style={{ color: "var(--heri-ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}
                >
                  {farm.name}
                </h2>
                {farm.nameEn ? (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--heri-ink-3)" }} dir="ltr">
                    {farm.nameEn}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--heri-ink-3)" }}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {farm.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {en ? "Last reading:" : "آخر قراءة:"} {formatRelative(farm.lastReadAt)}
                  </span>
                  <Link
                    href={`/companies/${farm.companyId}`}
                    className="hover:underline"
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    {farm.company.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {farm.description ? (
            <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--heri-ink-2)", lineHeight: 1.55 }}>
              {farm.description}
            </p>
          ) : null}
        </section>

        {/* KPI strip */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={en ? "Area" : "المساحة"}
            raw={farm.areaDunum}
            kind="number"
            hint={en ? "dunum" : "دونم"}
          />
          <HeriKpi
            label={en ? "Crop count" : "عدد المحاصيل"}
            raw={cropsCount}
            kind="number"
            hint={`${formatNumber(growingCount)} ${en ? "growing" : "في النمو"}`}
          />
          <HeriKpi
            label={en ? "Expected yield" : "إنتاج متوقع"}
            raw={expectedYieldKg}
            kind="number"
            hint={en ? "kg — aggregate" : "كغ — مجمّع"}
          />
          <HeriKpi
            label={en ? "Actual yield" : "إنتاج فعلي"}
            raw={actualYieldKg}
            kind="number"
            accent={actualYieldKg >= expectedYieldKg && expectedYieldKg > 0 ? "var(--heri-teal, #1f4e4a)" : undefined}
            hint={expectedYieldKg > 0
              ? (en ? `${Math.round((actualYieldKg / expectedYieldKg) * 100)}% of target` : `${Math.round((actualYieldKg / expectedYieldKg) * 100)}٪ من المتوقع`)
              : "—"}
          />
        </section>

        {/* Sensors + about — two-column */}
        <section className="grid gap-4 heri-stagger lg:grid-cols-[1.4fr_1fr]">
          <div className="heri-card">
            <div className="flex items-center justify-between">
              <h3
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                <Activity className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                {en ? "Sensor status" : "حالة المستشعرات"}              </h3>
              <span className="heri-eyebrow heri-eyebrow-ink">
                {en ? "Last reading:" : "آخر قراءة:"} {formatRelative(farm.lastReadAt)}
              </span>
            </div>

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
                <button type="submit" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
                  <Save className="h-4 w-4" strokeWidth={1.5} /> {en ? "Save reading" : "حفظ القراءة"}
                </button>
              </div>
            </form>
          </div>

          <div className="heri-card">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              {en ? "About the farm" : "عن المزرعة"}            </h3>
            {farm.description ? (
              <p className="mt-3 text-sm" style={{ color: "var(--heri-ink-2)", lineHeight: 1.55 }}>
                {farm.description}
              </p>
            ) : (
              <p className="mt-3 text-sm" style={{ color: "var(--heri-ink-3)", fontStyle: "italic" }}>
                {en ? "No description." : "لا يوجد وصف."}
              </p>
            )}
            <dl className="mt-4 space-y-2 text-xs">
              <Fact label="النوع" value={loc(FARM_TYPES_AR, FARM_TYPES_EN, getLocale(), farm.type)} />
              <Fact label={en ? "Location" : "الموقع"} value={farm.location} />
              <Fact label={en ? "Area" : "المساحة"} value={`${formatNumber(farm.areaDunum)} ${en ? "dunum" : "دونم"}`} />
              <Fact
                label={en ? "Company" : "الشركة"}
                value={farm.company.name}
                link={`/companies/${farm.companyId}`}
              />
            </dl>
          </div>
        </section>

        {/* Crops */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Crops" : "المحاصيل"}</div>
              <h2
                className="mt-1 text-base font-semibold"
                style={{ color: "var(--heri-ink)", letterSpacing: "-0.005em" }}
              >
                سجل المحاصيل في {farm.name}
              </h2>
            </div>
            <Link href={`/farms/crops/new?farmId=${farm.id}`} className="heri-btn heri-btn-secondary" style={{ fontSize: 13 }}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> {en ? "Add crop" : "إضافة محصول"}
            </Link>
          </div>
          {farm.crops.length === 0 ? (
            <div className="heri-card text-sm" style={{ color: "var(--heri-ink-3)" }}>
              {en ? "No crops recorded." : "لا توجد محاصيل مسجلة."}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
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
                      <td className="font-bold" style={{ color: "var(--heri-ink)" }}>{c.name}</td>
                      <td style={{ color: "var(--heri-ink-3)" }}>{c.variety ?? "—"}</td>
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
            </div>
          )}
        </section>
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
