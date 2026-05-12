import Link from "next/link";
import {
  Sprout, Plus, Thermometer, Droplets, Beaker, AlertTriangle, Wheat, Beef, Download, ChevronLeft, Leaf,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer, PageSection } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { ExportMenu } from "@/components/ExportMenu";
import { getCompanyBrand } from "@/lib/companyBrand";
import { KpiCard } from "@/components/KpiCard";
import { CompanyCover } from "@/components/CompanyCover";
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
        <HeroPanel
          gradient={getCompanyBrand("LORAN").gradient}
          accent={getCompanyBrand("LORAN").accent}
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <CompanyLogo code="LORAN" size={88} light />
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <Leaf className="h-3 w-3" />
                  {ar ? "زراعة ذكية" : "Smart agriculture"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "لوران الزراعية" : "Loran Agricultural"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "أرض تنبت ثقة. زراعة تستحق الانتظار."
                    : "Land of trust. Crops worth the wait."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <Link
                    href="/farms/new"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{ background: "white", color: "#0a4d3a" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "مزرعة جديدة" : "New farm"}
                  </Link>
                  <Link
                    href="/farms/crops/new"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.32)",
                      backdropFilter: "blur(6px)",
                      color: "white",
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "محصول جديد" : "New crop"}
                  </Link>
                  <ExportMenu type="farms" companyCode="LORAN" locale={lc} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <FarmHeroStat label={ar ? "مزارع" : "Farms"} value={formatNumber(farms.length)} icon={Sprout} />
              <FarmHeroStat label={ar ? "دونم" : "Dunum"} value={formatNumber(totalArea)} icon={Wheat} />
              <FarmHeroStat label={ar ? "محاصيل" : "Crops"} value={formatNumber(cropsGrowing)} icon={Leaf} />
              <FarmHeroStat label={ar ? "تنبيهات" : "Alerts"} value={formatNumber(alerts.length)} icon={AlertTriangle} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "عدد المزارع" : "Farms"}
            value={formatNumber(farms.length)}
            icon={Sprout}
            tone="emerald"
            hint={`${formatNumber(greenhouses)} ${ar ? "دفيئة" : "GH"}`}
          />
          <MetricTile
            label={ar ? "إجمالي المساحة" : "Total area"}
            value={`${formatNumber(totalArea)}`}
            icon={Wheat}
            tone="amber"
            hint={ar ? "دونم" : "dunum"}
          />
          <MetricTile
            label={ar ? "محاصيل نامية" : "Growing"}
            value={formatNumber(cropsGrowing)}
            icon={Leaf}
            tone="blue"
            hint={ar ? "في النمو" : "in cultivation"}
          />
          <MetricTile
            label={ar ? "تنبيهات" : "Alerts"}
            value={formatNumber(alerts.length)}
            icon={AlertTriangle}
            tone={alerts.length > 0 ? "amber" : "emerald"}
            hint={
              alerts.length > 0
                ? ar
                  ? "تحقق من القراءات"
                  : "Check readings"
                : ar
                ? "القراءات طبيعية"
                : "All normal"
            }
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

function FarmHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}
