import Link from "next/link";
import { Sprout, Plus, Thermometer, Droplets, Beaker, AlertTriangle, Wheat, Beef, ChevronLeft } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { GaugeChart } from "@/components/charts/GaugeChart";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { FARM_TYPES_AR, FARM_TYPES_EN, formatNumber, formatRelative, formatShortDate, loc } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteFarm } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, typeof Sprout> = { GREENHOUSE: Sprout, OPEN_FIELD: Wheat, LIVESTOCK: Beef, POULTRY: Beef };

export default async function FarmsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const farms = await prisma.farm.findMany({
    orderBy: { createdAt: "asc" },
    include: { company: true, crops: { orderBy: { expectedHarvest: "asc" } } },
  });

  const totalArea = farms.reduce((acc, f) => acc + f.areaDunum, 0);
  const greenhouses = farms.filter((f) => f.type === "GREENHOUSE").length;
  const alerts = farms.filter((f) => f.alertLevel !== "OK");
  const cropsGrowing = farms.flatMap((f) => f.crops).filter((c) => c.status === "GROWING").length;
  const ghFarms = farms.filter((f) => f.type === "GREENHOUSE" && f.soilMoisture != null);
  const avgMoisture = ghFarms.length ? ghFarms.reduce((a, f) => a + (f.soilMoisture ?? 0), 0) / ghFarms.length : 0;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "القطاعات · الزراعة الذكية" : "Sectors · Smart Agriculture"}
        title={ar ? "لوران للاستثمار الزراعي" : "Loran Agricultural Investment"}
        subtitle={ar ? "دفيئات ذكية، حقول مفتوحة، وثروة حيوانية — موصولة بقراءات المستشعرات الحية." : "Smart greenhouses, open fields and livestock — wired to live sensors."}
        status={ar ? "مباشر · مستشعرات حية" : "Live · sensors"}
        actions={
          <>
            <Link href="/farms/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "مزرعة جديدة" : "New farm"}</Link>
            <Link href="/farms/crops/new" className="dl-btn dl-btn-secondary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "محصول جديد" : "New crop"}</Link>
            <ExportMenu type="farms" companyCode="LORAN" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "عدد المزارع" : "Farms"} value={formatNumber(farms.length)} hint={`${formatNumber(greenhouses)} ${ar ? "دفيئة" : "greenhouse"}`} />
        <DaylightKpi label={ar ? "إجمالي المساحة" : "Total area"} value={formatNumber(totalArea)} hint={ar ? "دونم" : "dunum"} />
        <DaylightKpi label={ar ? "محاصيل نامية" : "Growing crops"} value={formatNumber(cropsGrowing)} hint={ar ? "في النمو" : "in cultivation"} />
        <DaylightKpi label={ar ? "تنبيهات" : "Alerts"} value={formatNumber(alerts.length)} hint={alerts.length > 0 ? (ar ? "تحقق من القراءات" : "Check readings") : (ar ? "القراءات طبيعية" : "All normal")} delta={alerts.length > 0 ? { dir: "down", text: formatNumber(alerts.length) } : undefined} />
      </DaylightKpiGrid>

      {ghFarms.length > 0 ? (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }} className="dl-charts">
          <DaylightPanel title={ar ? "صحة المستشعرات" : "Sensor health"} aside={ar ? "متوسط القراءات الحية عبر الشبكة" : "Live readings averaged across the network"}>
            <div className="grid gap-3 sm:grid-cols-3">
              <SensorTile icon={<Thermometer className="h-4 w-4" style={{ color: "var(--brick)" }} />} label={ar ? "حرارة" : "Temperature"} value={`${(ghFarms.reduce((a, f) => a + (f.tempC ?? 0), 0) / ghFarms.length).toFixed(1)}°C`} hint={ar ? "نطاق آمن: 18-28°" : "Safe: 18-28°"} />
              <SensorTile icon={<Droplets className="h-4 w-4" style={{ color: "var(--sage)" }} />} label={ar ? "رطوبة" : "Humidity"} value={`${(ghFarms.reduce((a, f) => a + (f.humidity ?? 0), 0) / ghFarms.length).toFixed(0)}%`} hint={ar ? "مثالي: 60-75%" : "Ideal: 60-75%"} />
              <SensorTile icon={<Beaker className="h-4 w-4" style={{ color: "var(--emerald)" }} />} label={ar ? "رطوبة تربة" : "Soil moisture"} value={`${avgMoisture.toFixed(0)}%`} hint={ar ? "مثالي: 35-50%" : "Ideal: 35-50%"} />
            </div>
          </DaylightPanel>
          <DaylightPanel title={ar ? "متوسط رطوبة التربة" : "Avg soil moisture"}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <GaugeChart value={avgMoisture} size={170} label={ar ? "مثالي 35-50%" : "Ideal 35-50%"} sublabel={`${ghFarms.length} ${ar ? "دفيئة" : "greenhouses"}`} color={avgMoisture < 30 ? "#c0392b" : avgMoisture < 35 ? "#d97706" : "var(--gold)"} />
            </div>
          </DaylightPanel>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="panel reveal" style={{ borderColor: "rgba(168,106,92,.4)" }}>
          <div className="mb-1.5 flex items-center gap-2" style={{ fontWeight: 700, color: "var(--brick)" }}>
            <AlertTriangle className="h-4 w-4" />{ar ? "مزارع تحتاج انتباه" : "Farms needing attention"}
          </div>
          <ul style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>
            {alerts.map((f) => (
              <li key={f.id}>{ar ? f.name : (f.nameEn ?? f.name)} — {f.alertLevel === "CRITICAL" ? (ar ? "حرج" : "critical") : (ar ? "تحذير" : "warning")}{f.soilMoisture != null ? ` · ${ar ? "رطوبة تربة" : "soil"} ${f.soilMoisture}%` : ""}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <DaylightPanel title={ar ? "المزارع" : "Farms"} aside={ar ? "كل مزرعة مع قراءات حية" : "Every farm with live readings"}>
        {farms.length === 0 ? (
          <EmptyState icon={Sprout} title={ar ? "لا توجد مزارع مسجلة" : "No farms yet"} action={<Link href="/farms/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" /> {ar ? "أضف مزرعة" : "Add farm"}</Link>} />
        ) : (
          <div className="prop-grid">
            {farms.map((f) => {
              const Icon = TYPE_ICON[f.type] ?? Sprout;
              return (
                <div key={f.id} className="prop-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center" style={{ borderRadius: 12, background: "rgba(46,107,87,.1)", color: "var(--emerald)" }}><Icon className="h-5 w-5" /></div>
                      <div>
                        <div className="flex items-center gap-2"><h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{ar ? f.name : (f.nameEn ?? f.name)}</h3><StatusBadge status={f.alertLevel} /></div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{loc(FARM_TYPES_AR, FARM_TYPES_EN, lc, f.type)} · {f.location} · {formatNumber(f.areaDunum)} {ar ? "دونم" : "dunum"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/farms/${f.id}`} className="dl-btn dl-btn-secondary" style={{ padding: "6px 12px" }}>{ar ? "تفاصيل" : "Details"}<ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" /></Link>
                      <DeleteButton action={deleteFarm} payload={{ id: f.id }} label={ar ? `حذف ${f.name}؟` : `Delete ${f.name}?`} description={ar ? "سيتم حذف المزرعة وكل المحاصيل المرتبطة." : "This farm and all crops will be deleted."} />
                    </div>
                  </div>
                  {f.type === "GREENHOUSE" ? (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MicroSensor icon={<Thermometer className="h-3.5 w-3.5" style={{ color: "var(--brick)" }} />} label={ar ? "حرارة" : "Temp"} value={f.tempC != null ? `${f.tempC}°` : "—"} />
                      <MicroSensor icon={<Droplets className="h-3.5 w-3.5" style={{ color: "var(--sage)" }} />} label={ar ? "رطوبة" : "Humidity"} value={f.humidity != null ? `${f.humidity}%` : "—"} />
                      <MicroSensor icon={<Beaker className="h-3.5 w-3.5" style={{ color: "var(--emerald)" }} />} label={ar ? "تربة" : "Soil"} value={f.soilMoisture != null ? `${f.soilMoisture}%` : "—"} />
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                    <span>{ar ? "آخر قراءة" : "Last reading"}: {formatRelative(f.lastReadAt, lc)}</span>
                    <span style={{ fontFamily: "monospace" }}>{f.company.code}</span>
                  </div>
                  {f.crops.length > 0 ? (
                    <div className="mt-4" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <div className="mb-2" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{ar ? "محاصيل" : "Crops"} ({f.crops.length})</div>
                      <div className="space-y-1">
                        {f.crops.slice(0, 3).map((c) => (
                          <div key={c.id} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                            <div><span style={{ fontWeight: 700, color: "var(--ink)" }}>{c.name}</span>{c.variety ? <span style={{ color: "var(--ink-muted)" }}> · {c.variety}</span> : null}</div>
                            <div className="flex items-center gap-2"><span style={{ color: "var(--ink-muted)" }}>{ar ? "حصاد" : "harvest"} {formatShortDate(c.expectedHarvest, lc)}</span><StatusBadge status={c.status} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}

function SensorTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center", background: "var(--ivory)" }}>
      <div className="mb-1 flex items-center justify-center gap-1.5" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{icon}{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>{hint}</div>
    </div>
  );
}

function MicroSensor({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8, textAlign: "center", background: "var(--ivory)" }}>
      <div className="flex items-center justify-center">{icon}</div>
      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 9, color: "var(--ink-muted)" }}>{label}</div>
    </div>
  );
}
