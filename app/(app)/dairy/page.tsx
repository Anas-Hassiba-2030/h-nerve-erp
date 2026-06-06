import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { ShareViewButton } from "@/components/brain/ShareViewButton";
import { DaylightShell } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { formatNumber, formatPercent, formatShortDate, loc, STATUS_AR, STATUS_EN } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { deleteBatch, setBatchStatus } from "./actions";
import { DairyTabs, type BatchRow } from "./DairyTabs";
import "../daylight.css";
import "./maha.css";

export const dynamic = "force-dynamic";

// Domain status → the reference's tag tones (ok / warn / crit / info).
const STATUS_TONE: Record<string, BatchRow["statusTone"]> = {
  READY: "ok",
  DISTRIBUTED: "info",
  IN_PRODUCTION: "info",
  QC: "warn",
  RECALLED: "crit",
};

const PRODUCT_AR: Record<string, string> = { MILK: "حليب", LABNEH: "لبنة", YOGURT: "زبادي", CHEESE: "جبن", BUTTER: "زبدة", CREAM: "قشطة" };
const PRODUCT_EN: Record<string, string> = { MILK: "Milk", LABNEH: "Labneh", YOGURT: "Yogurt", CHEESE: "Cheese", BUTTER: "Butter", CREAM: "Cream" };

// A grade letter → an indicative quality % so the drawer gauge has something
// real to render (grade A is excellent, B good, C acceptable). Nudged by fat
// content so two A-grade batches don't read identically.
function qualityPct(grade: string, fat: number): number {
  const base = grade === "A" ? 94 : grade === "B" ? 86 : 78;
  return Math.max(60, Math.min(99, Math.round(base + (fat - 3.5) * 1.5)));
}

export default async function DairyPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [batches, totals30, ready, expiringSoon, gradeAggA, productMix] = await Promise.all([
    prisma.dairyBatch.findMany({ orderBy: { productionDate: "desc" }, take: 50, include: { company: true } }),
    prisma.dairyBatch.aggregate({ _sum: { quantityLiters: true }, _count: true, where: { productionDate: { gte: last30 } } }),
    prisma.dairyBatch.aggregate({ _sum: { quantityLiters: true }, where: { status: "READY" } }),
    prisma.dairyBatch.findMany({ where: { expiryDate: { lte: next3Days, gte: now }, status: { not: "RECALLED" } }, orderBy: { expiryDate: "asc" }, take: 5 }),
    prisma.dairyBatch.count({ where: { qualityGrade: "A", productionDate: { gte: last30 } } }),
    prisma.dairyBatch.groupBy({ by: ["product"], _sum: { quantityLiters: true }, _count: true, where: { productionDate: { gte: last30 } }, orderBy: { _sum: { quantityLiters: "desc" } } }),
  ]);

  const total30Volume = totals30._sum.quantityLiters ?? 0;
  const readyVolume = ready._sum.quantityLiters ?? 0;
  const gradeAPct = totals30._count ? gradeAggA / totals30._count : 0;

  // ── product-lines table (overview): real per-product 30d aggregation ──
  const productName = (p: string) => (ar ? PRODUCT_AR[p] ?? p : PRODUCT_EN[p] ?? p);
  const productLines = productMix.map((p) => {
    const vol = p._sum.quantityLiters ?? 0;
    const share = total30Volume ? vol / total30Volume : 0;
    const tone: BatchRow["statusTone"] = share >= 0.25 ? "ok" : share >= 0.12 ? "warn" : "crit";
    const label = share >= 0.25 ? (ar ? "قوي" : "Strong") : share >= 0.12 ? (ar ? "مراقبة" : "Watch") : (ar ? "محدود" : "Low");
    return { product: productName(p.product), count: p._count, volume: vol, share, tone, label };
  });

  // ── batch rows for the client island (serializable only) ──
  const batchRows: BatchRow[] = batches.map((b) => {
    const q = qualityPct(b.qualityGrade, b.fatContent);
    const expSoon = new Date(b.expiryDate).getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 && b.status !== "DISTRIBUTED";
    return {
      id: b.id,
      batchNumber: b.batchNumber,
      product: ar ? b.productAr : (PRODUCT_EN[b.product] ?? b.productAr),
      liters: b.quantityLiters,
      litersText: `${formatNumber(b.quantityLiters)} ${ar ? "ل" : "L"}`,
      quality: q,
      qualityText: `${formatNumber(q)}%`,
      grade: b.qualityGrade,
      fat: b.fatContent.toFixed(1),
      status: b.status,
      statusLabel: loc(STATUS_AR, STATUS_EN, lc, b.status),
      statusTone: STATUS_TONE[b.status] ?? "info",
      production: formatShortDate(b.productionDate, lc),
      expiry: formatShortDate(b.expiryDate, lc),
      expiringSoon: expSoon,
      destination: b.destination ?? "—",
    };
  });

  // ── overview panel (KPI grid + product-lines table) — server-rendered,
  //    handed to the tabs island as the "overview" slot. ──
  const overview = (
    <>
      <div className="kpi-grid reveal reveal-stagger">
        <div className="kpi-card ix-card">
          <div className="kpi-label">{ar ? "الإنتاج ٣٠ يوم" : "Output 30d"}</div>
          <div className="kpi-val">{formatNumber(total30Volume)}{ar ? " ل" : " L"}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{`${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`}</span>
          </div>
        </div>
        <div className="kpi-card ix-card">
          <div className="kpi-label">{ar ? "جاهز للتوزيع" : "Ready to ship"}</div>
          <div className="kpi-val">{formatNumber(readyVolume)}{ar ? " ل" : " L"}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? "في المخزن" : "in storage"}</span>
          </div>
        </div>
        <div className="kpi-card ix-card">
          <div className="kpi-label">{ar ? "دفعات قرب الانتهاء" : "Expiring soon"}</div>
          <div className="kpi-val">{formatNumber(expiringSoon.length)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? "خلال ٧٢ ساعة" : "within 72h"}</span>
            {expiringSoon.length > 0 ? <span className="delta down">▼ {formatNumber(expiringSoon.length)}</span> : null}
          </div>
        </div>
        <div className="kpi-card ix-card">
          <div className="kpi-label">{ar ? "نسبة الدرجة A" : "Grade A share"}</div>
          <div className="kpi-val">{formatPercent(gradeAPct, 0)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{`${formatNumber(gradeAggA)} / ${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`}</span>
            <span className={`delta ${gradeAPct >= 0.8 ? "up" : "down"}`}>{gradeAPct >= 0.8 ? "▲" : "▼"} {formatPercent(gradeAPct, 0)}</span>
          </div>
        </div>
      </div>

      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "خطوط المنتجات" : "Product lines"}</span>
          <span className="panel-aside">{`${formatNumber(productLines.length)} ${ar ? "خطوط · حسب الإنتاج" : "lines · by output"}`}</span>
        </div>
        {productLines.length === 0 ? (
          <div style={{ padding: "46px 20px", textAlign: "center", color: "var(--ink-muted)" }}>—</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{ar ? "المنتج" : "Product"}</th>
                <th className="num">{ar ? "دفعات ٣٠ي" : "Batches 30d"}</th>
                <th className="num">{ar ? "إنتاج ٣٠ي" : "Output 30d"}</th>
                <th className="num">{ar ? "الحصة" : "Share"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {productLines.map((p) => (
                <tr key={p.product}>
                  <td style={{ fontWeight: 700, color: "var(--ink)" }}>{p.product}</td>
                  <td className="num">{formatNumber(p.count)}</td>
                  <td className="num">{formatNumber(p.volume)}{ar ? " ل" : " L"}</td>
                  <td className="num">{formatPercent(p.share, 0)}</td>
                  <td><span className={`tag ${p.tone}`}>{p.label}</span></td>
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
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "القطاعات · الألبان" : "Sectors · Dairy"}</div>
          <h1 className="sec-title">{ar ? "المها للألبان" : "Maha Dairy"}</h1>
          <p className="sec-sub">
            {ar
              ? "وحدة الألبان — الإنتاج اليومي، صلاحية الدفعات، والجودة عبر خطوط المنتجات — آخر ثلاثين يوماً."
              : "Dairy unit — daily output, batch expiry, and quality across product lines — last 30 days."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · محدّث الآن" : "Live · updated now"}</span>
          <div className="sec-actions">
            <Link href="/dairy/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "دفعة جديدة" : "New batch"}</Link>
            <ExportMenu type="dairy" companyCode="MAHA" locale={lc} />
            <ShareViewButton
              title={ar ? "الألبان — المها" : "Dairy — Maha"}
              body={ar ? "نظرة حية على الألبان: الدفعات، الجودة، ومخاطر انتهاء الصلاحية." : "Live dairy view: batches, quality, and expiry risk."}
              refType="view" refId="dairy" ar={ar} tone="light"
            />
          </div>
        </div>
      </header>

      {/* ── tabs (overview / batches) — interaction lives in the client island ── */}
      <DairyTabs
        ar={ar}
        overview={overview}
        batches={batchRows}
        setStatus={setBatchStatus}
        remove={deleteBatch}
      />
    </DaylightShell>
  );
}
