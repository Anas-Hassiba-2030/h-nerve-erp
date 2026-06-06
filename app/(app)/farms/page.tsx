import Link from "next/link";
import { Plus } from "lucide-react";
import { ShareViewButton } from "@/components/brain/ShareViewButton";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DaylightShell } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { FARM_TYPES_AR, FARM_TYPES_EN, formatNumber, loc } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { FarmsTabs, type FarmTile, type CropRow } from "./FarmsTabs";
import "../daylight.css";
import "./loran.css";

export const dynamic = "force-dynamic";

// Map a crop status to the reference's .ops-tag tone (ok / warn / crit / info).
const CROP_TAG: Record<string, "ok" | "warn" | "crit" | "info"> = {
  HARVESTED: "ok", GROWING: "info", HARVESTING: "warn", FAILED: "crit",
};
const CROP_STATUS_AR: Record<string, string> = {
  GROWING: "نمو", HARVESTING: "حصاد", HARVESTED: "محصود", FAILED: "فشل",
};
const CROP_STATUS_EN: Record<string, string> = {
  GROWING: "Growing", HARVESTING: "Harvesting", HARVESTED: "Harvested", FAILED: "Failed",
};
const ALERT_TAG: Record<string, "ok" | "warn" | "crit"> = { OK: "ok", WARN: "warn", CRITICAL: "crit" };

export default async function FarmsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const farms = await prisma.farm.findMany({
    orderBy: { createdAt: "asc" },
    include: { company: true, crops: { orderBy: { expectedHarvest: "asc" } } },
    take: 100,
  });

  const totalArea = farms.reduce((acc, f) => acc + f.areaDunum, 0);
  const greenhouses = farms.filter((f) => f.type === "GREENHOUSE").length;
  const alerts = farms.filter((f) => f.alertLevel !== "OK");
  const allCrops = farms.flatMap((f) => f.crops.map((c) => ({ ...c, farm: f })));
  const cropsGrowing = allCrops.filter((c) => c.status === "GROWING").length;
  const ghFarms = farms.filter((f) => f.type === "GREENHOUSE" && f.soilMoisture != null);
  const avgMoisture = ghFarms.length ? ghFarms.reduce((a, f) => a + (f.soilMoisture ?? 0), 0) / ghFarms.length : 0;

  // ── farm tiles (farms tab): each greenhouse shows the loran 3-ring gauge set;
  // farms without sensors fall back to type/area meta. ──
  const farmTiles: FarmTile[] = farms.map((f) => {
    const name = ar ? f.name : (f.nameEn ?? f.name);
    const type = loc(FARM_TYPES_AR, FARM_TYPES_EN, lc, f.type);
    const gauges =
      f.type === "GREENHOUSE"
        ? [
            f.soilMoisture != null && { value: Math.round(f.soilMoisture), fill: f.soilMoisture, label: ar ? "رطوبة تربة" : "Soil", unit: "%", color: "#2E6B57" },
            f.tempC != null && { value: Math.round(f.tempC), fill: (f.tempC / 40) * 100, label: ar ? "حرارة" : "Temp", unit: "°", color: "#C2A35A" },
            f.humidity != null && { value: Math.round(f.humidity), fill: f.humidity, label: ar ? "رطوبة" : "Humidity", unit: "%", color: "#7E9B86" },
          ].filter(Boolean as unknown as <T>(x: T | false) => x is T)
        : [];
    return {
      id: f.id,
      name,
      meta: `${type} · ${f.location}`,
      gauges,
      footLabel: `${formatNumber(f.areaDunum)} ${ar ? "دونم" : "dunum"}`,
      footValue: f.company.code,
      detailsLabel: ar ? "تفاصيل ↩" : "Details →",
      deleteLabel: ar ? `حذف ${f.name}؟` : `Delete ${f.name}?`,
      deleteDescription: ar ? "سيتم حذف المزرعة وكل المحاصيل المرتبطة." : "This farm and all crops will be deleted.",
    };
  });

  // ── crop rows (crops tab) ──
  const cropRows: CropRow[] = allCrops.map((c) => ({
    id: c.id,
    crop: c.name,
    farm: ar ? c.farm.name : (c.farm.nameEn ?? c.farm.name),
    qty: `${formatNumber(c.expectedYieldKg)} ${ar ? "كغ" : "kg"}`,
    dest: c.variety || "—",
    statusLabel: loc(CROP_STATUS_AR, CROP_STATUS_EN, lc, c.status),
    statusTag: CROP_TAG[c.status] ?? "info",
    deleteLabel: ar ? `حذف ${c.name}؟` : `Delete ${c.name}?`,
    deleteDescription: ar ? "سيتم حذف المحصول نهائياً." : "This crop will be permanently deleted.",
  }));

  // ── overview panel: KPI grid + crops table (rendered server-side) ──
  const overview = (
    <>
      <div className="kpi-grid reveal reveal-stagger">
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "عدد المزارع" : "Farms"}</div>
          <div className="kpi-val">{formatNumber(farms.length)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{formatNumber(greenhouses)} {ar ? "دفيئة" : "greenhouse"}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "إجمالي المساحة" : "Total area"}</div>
          <div className="kpi-val">{formatNumber(totalArea)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{ar ? "دونم" : "dunum"}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "محاصيل نامية" : "Growing crops"}</div>
          <div className="kpi-val">{formatNumber(cropsGrowing)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{ar ? "في النمو" : "in cultivation"}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "متوسط رطوبة التربة" : "Avg soil moisture"}</div>
          <div className="kpi-val">{ghFarms.length ? `${avgMoisture.toFixed(0)}%` : "—"}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ghFarms.length} {ar ? "دفيئة" : "greenhouses"}</span>
            {alerts.length > 0 ? <span className="delta down">▼ {formatNumber(alerts.length)} {ar ? "تنبيه" : "alerts"}</span> : null}
          </div>
        </div>
      </div>

      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "المحاصيل" : "Crops"}</span>
          <span className="panel-aside">{ar ? "عبر كل المزارع" : "Across every farm"}</span>
        </div>
        {cropRows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>{ar ? "لا توجد محاصيل مسجلة." : "No crops recorded yet."}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{ar ? "المحصول" : "Crop"}</th>
                <th>{ar ? "المزرعة" : "Farm"}</th>
                <th className="num">{ar ? "الكمية" : "Quantity"}</th>
                <th>{ar ? "الصنف" : "Variety"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {cropRows.map((c) => (
                <tr key={c.id}>
                  <td>{c.crop}</td>
                  <td>{c.farm}</td>
                  <td className="num">{c.qty}</td>
                  <td>{c.dest}</td>
                  <td><span className={`tag ${c.statusTag === "crit" ? "crit" : c.statusTag === "warn" ? "warn" : "ok"}`}>{c.statusLabel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "القطاعات · الزراعة" : "Sectors · Agriculture"}</div>
          <h1 className="sec-title">{ar ? "لوران للاستثمار الزراعي" : "Loran Agricultural Investment"}</h1>
          <p className="sec-sub">{ar ? "ثلاث مزارع — المحاصيل، الري الذكي، والإنتاج الموجّه لمطابخ المجموعة." : "Three farms — crops, smart irrigation, and produce routed to the group's kitchens."}</p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · إشعار ري" : "Live · irrigation alerts"}</span>
          <ShareViewButton
            title={ar ? "الزراعة — لوران" : "Agriculture — Loran"}
            body={ar ? "نظرة حية على المزارع: المحاصيل، الري، وتنبيهات الاستشعار." : "Live farms view: crops, irrigation, and sensor alerts."}
            refType="view" refId="farms" ar={ar} tone="light"
          />
          <div className="sec-actions">
            <Link href="/farms/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "مزرعة جديدة" : "New farm"}</Link>
            <Link href="/farms/crops/new" className="dl-btn dl-btn-secondary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "محصول جديد" : "New crop"}</Link>
            <ExportMenu type="farms" companyCode="LORAN" locale={lc} />
          </div>
        </div>
      </div>

      <FarmsTabs
        labels={{
          overview: ar ? "نظرة عامة" : "Overview",
          farms: ar ? "المزارع" : "Farms",
          crops: ar ? "المحاصيل" : "Crops",
          cropsTitle: ar ? "المحاصيل" : "Crops",
          newFarm: ar ? "مزرعة جديدة" : "New farm",
          newCrop: ar ? "محصول جديد" : "New crop",
          colCrop: ar ? "المحصول" : "Crop",
          colFarm: ar ? "المزرعة" : "Farm",
          colQty: ar ? "الكمية" : "Quantity",
          colDest: ar ? "الصنف" : "Variety",
          colStatus: ar ? "الحالة" : "Status",
        }}
        overview={overview}
        farms={farmTiles}
        crops={cropRows}
        newFarmHref="/farms/new"
        newCropHref="/farms/crops/new"
        emptyFarms={{ title: ar ? "لا توجد مزارع مسجلة" : "No farms yet", sub: ar ? "أضف أول مزرعة لبدء متابعة القراءات." : "Add your first farm to start tracking readings." }}
        emptyCrops={{ title: ar ? "لا توجد محاصيل" : "No crops yet", sub: ar ? "أضف محصولاً لربطه بإحدى المزارع." : "Add a crop to link it to a farm." }}
      />
    </DaylightShell>
  );
}
