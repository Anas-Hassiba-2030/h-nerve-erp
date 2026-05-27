import Link from "next/link";
import {
  Sprout, Plus, Thermometer, Droplets, Beaker, AlertTriangle, Wheat, Beef, Download, ChevronLeft, Leaf,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer, PageSection } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { prisma } from "@/lib/db";
import {
  FARM_TYPES_AR, FARM_TYPES_EN, formatNumber, formatRelative, formatShortDate, loc,
} from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteFarm } from "./actions";

const TYPE_ICON: Record<string, typeof Sprout> = {
  GREENHOUSE: Sprout,
  OPEN_FIELD: Wheat,
  LIVESTOCK: Beef,
  POULTRY: Beef,
};

export default async function FarmsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const farms = await prisma.farm.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      company: true,
      crops: { orderBy: { expectedHarvest: "asc" } },
    },
  });

  const totalArea = farms.reduce((acc, f) => acc + f.areaDunum, 0);
  const greenhouses = farms.filter((f) => f.type === "GREENHOUSE").length;
  const alerts = farms.filter((f) => f.alertLevel !== "OK");
  const cropsGrowing = farms.flatMap((f) => f.crops).filter((c) => c.status === "GROWING").length;

  // Health: avg of soilMoisture (closer to 50% optimum) for GH
  const ghFarms = farms.filter((f) => f.type === "GREENHOUSE" && f.soilMoisture != null);
  const avgMoisture = ghFarms.length
    ? ghFarms.reduce((a, f) => a + (f.soilMoisture ?? 0), 0) / ghFarms.length
    : 0;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الزراعة الذكية" : "Smart Agriculture"}
        title={ar ? "لوران للاستثمار الزراعي" : "Loran Agricultural Investment"}
        subtitle={
          ar
            ? "دفيئات ذكية، حقول مفتوحة، وثروة حيوانية — موصولة بقراءات المستشعرات."
            : "Smart greenhouses, open fields, livestock — wired to live sensors."
        }
      />

      <PageContainer>
        {/* Action rail */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "الزراعة الذكية" : "Smart agriculture"}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/farms/new" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "مزرعة جديدة" : "New farm"}
            </Link>
            <Link href="/farms/crops/new" className="heri-btn heri-btn-secondary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "محصول جديد" : "New crop"}
            </Link>
            <ExportMenu type="farms" companyCode="LORAN" locale={lc} />
          </div>
        </div>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "عدد المزارع" : "Farms"}
            raw={farms.length}
            kind="number"
            hint={`${formatNumber(greenhouses)} ${ar ? "دفيئة" : "greenhouse"}`}
          />
          <HeriKpi
            label={ar ? "إجمالي المساحة" : "Total area"}
            raw={totalArea}
            kind="number"
            hint={ar ? "دونم" : "dunum"}
          />
          <HeriKpi
            label={ar ? "محاصيل نامية" : "Growing crops"}
            raw={cropsGrowing}
            kind="number"
            hint={ar ? "في النمو" : "in cultivation"}
          />
          <HeriKpi
            label={ar ? "تنبيهات" : "Alerts"}
            raw={alerts.length}
            kind="number"
            accent={alerts.length > 0 ? "var(--heri-terracotta, #b85c38)" : undefined}
            hint={alerts.length > 0 ? (ar ? "تحقق من القراءات" : "Check readings") : (ar ? "القراءات طبيعية" : "All normal")}
          />
        </section>

        {/* Soil moisture gauge for GH average */}
        {ghFarms.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card card-pad lg:col-span-2">
              <h3 className="card-title mb-1">{ar ? "صحة المستشعرات" : "Sensor health"}</h3>
              <p className="card-sub mb-4">
                {ar
                  ? "متوسط القراءات الحية لكل دفيئة في الشبكة"
                  : "Live readings averaged across the greenhouse network"}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SensorTile
                  icon={<Thermometer className="h-4 w-4 text-amber-600" />}
                  label={ar ? "حرارة" : "Temperature"}
                  value={`${(ghFarms.reduce((a, f) => a + (f.tempC ?? 0), 0) / ghFarms.length).toFixed(1)}°C`}
                  hint={ar ? "نطاق آمن: 18-28°" : "Safe: 18-28°"}
                />
                <SensorTile
                  icon={<Droplets className="h-4 w-4 text-sky-600" />}
                  label={ar ? "رطوبة" : "Humidity"}
                  value={`${(ghFarms.reduce((a, f) => a + (f.humidity ?? 0), 0) / ghFarms.length).toFixed(0)}%`}
                  hint={ar ? "مثالي: 60-75%" : "Ideal: 60-75%"}
                />
                <SensorTile
                  icon={<Beaker className="h-4 w-4 text-emerald-600" />}
                  label={ar ? "رطوبة تربة" : "Soil moisture"}
                  value={`${avgMoisture.toFixed(0)}%`}
                  hint={ar ? "مثالي: 35-50%" : "Ideal: 35-50%"}
                />
              </div>
            </div>
            <div className="card card-pad flex flex-col items-center justify-center">
              <h3 className="card-title mb-2">{ar ? "متوسط رطوبة التربة" : "Avg soil moisture"}</h3>
              <GaugeChart
                value={avgMoisture}
                size={170}
                label={ar ? "مثالي 35-50%" : "Ideal 35-50%"}
                sublabel={`${ghFarms.length} ${ar ? "دفيئة" : "greenhouses"}`}
                color={avgMoisture < 30 ? "#c0392b" : avgMoisture < 35 ? "#d97706" : "var(--brand)"}
              />
            </div>
          </section>
        ) : null}

        {alerts.length > 0 ? (
          <div className="alert-warn">
            <div className="mb-1.5 flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4" />
              {ar ? "مزارع تحتاج انتباه" : "Farms needing attention"}
            </div>
            <ul className="space-y-0.5 text-[12px]">
              {alerts.map((f) => (
                <li key={f.id}>
                  {f.name} — {f.alertLevel === "CRITICAL" ? (ar ? "حرج" : "critical") : (ar ? "تحذير" : "warning")}
                  {f.soilMoisture != null ? ` · ${ar ? "رطوبة تربة" : "soil"} ${f.soilMoisture}%` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <PageSection
          title={ar ? "المزارع" : "Farms"}
          description={ar ? "كل مزرعة في شبكة لوران مع قراءات حية" : "Every farm in the Loran network with live readings"}
        >
          {farms.length === 0 ? (
            <EmptyState
              icon={Sprout}
              title={ar ? "لا توجد مزارع مسجلة" : "No farms yet"}
              action={
                <Link href="/farms/new" className="btn-primary">
                  <Plus className="h-4 w-4" /> {ar ? "أضف مزرعة" : "Add farm"}
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {farms.map((f) => {
                const Icon = TYPE_ICON[f.type] ?? Sprout;
                return (
                  <div key={f.id} className="card card-hover card-pad">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold" style={{ color: "var(--text)" }}>{f.name}</h3>
                            <StatusBadge status={f.alertLevel} />
                          </div>
                          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {loc(FARM_TYPES_AR, FARM_TYPES_EN, lc, f.type)} · {f.location} · {formatNumber(f.areaDunum)} {ar ? "دونم" : "dunum"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/farms/${f.id}`} className="btn-ghost btn-sm">
                          {ar ? "تفاصيل" : "Details"}
                          <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                        </Link>
                        <DeleteButton
                          action={deleteFarm}
                          payload={{ id: f.id }}
                          label={ar ? `حذف ${f.name}؟` : `Delete ${f.name}?`}
                          description={ar ? "سيتم حذف المزرعة وكل المحاصيل المرتبطة." : "This farm and all crops will be deleted."}
                        />
                      </div>
                    </div>

                    {f.type === "GREENHOUSE" ? (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MicroSensor
                          icon={<Thermometer className="h-3.5 w-3.5 text-amber-600" />}
                          label={ar ? "حرارة" : "Temp"}
                          value={f.tempC != null ? `${f.tempC}°` : "—"}
                        />
                        <MicroSensor
                          icon={<Droplets className="h-3.5 w-3.5 text-sky-600" />}
                          label={ar ? "رطوبة" : "Humidity"}
                          value={f.humidity != null ? `${f.humidity}%` : "—"}
                        />
                        <MicroSensor
                          icon={<Beaker className="h-3.5 w-3.5 text-emerald-600" />}
                          label={ar ? "تربة" : "Soil"}
                          value={f.soilMoisture != null ? `${f.soilMoisture}%` : "—"}
                        />
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span>{ar ? "آخر قراءة" : "Last reading"}: {formatRelative(f.lastReadAt, lc)}</span>
                      <span className="font-mono">{f.company.code}</span>
                    </div>

                    {f.crops.length > 0 ? (
                      <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                          {ar ? "محاصيل" : "Crops"} ({f.crops.length})
                        </div>
                        <div className="space-y-1">
                          {f.crops.slice(0, 3).map((c) => (
                            <div key={c.id} className="flex items-center justify-between text-[12px]">
                              <div>
                                <span className="font-extrabold" style={{ color: "var(--text)" }}>{c.name}</span>
                                {c.variety ? <span style={{ color: "var(--text-muted)" }}> · {c.variety}</span> : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <span style={{ color: "var(--text-muted)" }}>
                                  {ar ? "حصاد" : "harvest"} {formatShortDate(c.expectedHarvest, lc)}
                                </span>
                                <StatusBadge status={c.status} />
                              </div>
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
        </PageSection>
      </PageContainer>
    </>
  );
}

function SensorTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--border)" }}>
      <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black tabular-nums" style={{ color: "var(--text)" }}>{value}</div>
      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{hint}</div>
    </div>
  );
}

function MicroSensor({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2 text-center" style={{ borderColor: "var(--border)", background: "var(--brand-soft)" }}>
      <div className="flex items-center justify-center">{icon}</div>
      <div className="mt-1 text-base font-extrabold tabular-nums" style={{ color: "var(--text)" }}>{value}</div>
      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

