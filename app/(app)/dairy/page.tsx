import Link from "next/link";
import { Milk, Plus, AlertTriangle, Clock } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { BarChart } from "@/components/charts/BarChart";
import { GaugeChart } from "@/components/charts/GaugeChart";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatNumber, formatPercent, formatShortDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteBatch } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

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
    prisma.dairyBatch.groupBy({ by: ["product"], _sum: { quantityLiters: true }, where: { productionDate: { gte: last30 } } }),
  ]);

  const total30Volume = totals30._sum.quantityLiters ?? 0;
  const readyVolume = ready._sum.quantityLiters ?? 0;
  const gradeAPct = totals30._count ? gradeAggA / totals30._count : 0;

  const PRODUCT_AR: Record<string, string> = { MILK: "حليب", LABNEH: "لبنة", YOGURT: "زبادي", CHEESE: "جبن", BUTTER: "زبدة", CREAM: "قشطة" };
  const PRODUCT_EN: Record<string, string> = { MILK: "Milk", LABNEH: "Labneh", YOGURT: "Yogurt", CHEESE: "Cheese", BUTTER: "Butter", CREAM: "Cream" };
  const mixData = productMix.map((p) => ({
    label: ar ? PRODUCT_AR[p.product] ?? p.product : PRODUCT_EN[p.product] ?? p.product,
    value: p._sum.quantityLiters ?? 0,
  }));

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "القطاعات · الألبان" : "Sectors · Dairy"}
        title={ar ? "المها للألبان" : "Maha Dairy"}
        subtitle={ar ? "دفعات الإنتاج، رقابة الجودة، الصلاحية، وقنوات التوزيع — آخر ثلاثين يوماً." : "Production batches, QC, expiry tracking and distribution — last 30 days."}
        status={ar ? "مباشر · محدّث الآن" : "Live · updated now"}
        actions={
          <>
            <Link href="/dairy/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "دفعة جديدة" : "New batch"}</Link>
            <ExportMenu type="dairy" companyCode="MAHA" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "حجم الإنتاج ٣٠ي" : "Output 30d"} value={`${formatNumber(total30Volume)} L`} hint={`${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`} />
        <DaylightKpi label={ar ? "جاهز للتوزيع" : "Ready"} value={`${formatNumber(readyVolume)} L`} hint={ar ? "في المخزن" : "in storage"} />
        <DaylightKpi label={ar ? "درجة A" : "Grade A"} value={formatPercent(gradeAPct, 0)} hint={gradeAPct >= 0.8 ? (ar ? "ضمن الهدف" : "On target") : (ar ? "تحت المعيار" : "Below benchmark")} delta={{ dir: gradeAPct >= 0.8 ? "up" : "down", text: formatPercent(gradeAPct, 0) }} />
        <DaylightKpi label={ar ? "قرب الصلاحية" : "Expiring soon"} value={formatNumber(expiringSoon.length)} hint={ar ? "خلال ٧٢ ساعة" : "within 72h"} />
      </DaylightKpiGrid>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.5fr 1fr" }} className="dl-charts">
        <DaylightPanel title={ar ? "توزيع الإنتاج حسب الصنف" : "Output by product"} aside={ar ? "آخر ٣٠ يوم — لتر" : "Last 30 days — liters"}>
          {mixData.length > 0 ? (
            <BarChart data={mixData} height={220} formatValue={(v) => `${formatNumber(v)} L`} />
          ) : (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-muted)" }}>—</div>
          )}
        </DaylightPanel>
        <DaylightPanel title={ar ? "مؤشر الجودة" : "Quality index"} aside={ar ? "نسبة الدرجة A" : "Grade A share"}>
          <div style={{ display: "grid", placeItems: "center", paddingTop: 6 }}>
            <GaugeChart value={gradeAPct * 100} size={180} label={ar ? "ممتاز فوق ٨٠٪" : "Excellent ≥ 80%"} sublabel={`${formatNumber(gradeAggA)} / ${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`} color="var(--gold)" />
          </div>
        </DaylightPanel>
      </div>

      {expiringSoon.length > 0 ? (
        <div className="panel reveal" style={{ borderColor: "rgba(168,106,92,.4)" }}>
          <div className="mb-1.5 flex items-center gap-2" style={{ fontWeight: 700, color: "var(--brick)" }}>
            <AlertTriangle className="h-4 w-4" />
            {ar ? "تنبيه صلاحية: " : "Expiry alert: "}{formatNumber(expiringSoon.length)} {ar ? "دفعة قرب الانتهاء" : "batch(es) expiring soon"}
          </div>
          <ul style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>
            {expiringSoon.map((b) => (
              <li key={b.id}><span style={{ fontFamily: "monospace" }}>{b.batchNumber}</span> — {b.productAr} ({formatNumber(b.quantityLiters)} L) — {ar ? "تنتهي" : "expires"} {formatShortDate(b.expiryDate, lc)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <DaylightPanel title={ar ? "دفعات الإنتاج الأخيرة" : "Recent production batches"}>
        {batches.length === 0 ? (
          <EmptyState icon={Milk} title={ar ? "لا توجد دفعات بعد" : "No batches yet"} action={<Link href="/dairy/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" />{ar ? "دفعة جديدة" : "New batch"}</Link>} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>{ar ? "رقم الدفعة" : "Batch #"}</th>
                  <th>{ar ? "المنتج" : "Product"}</th>
                  <th className="num">{ar ? "الكمية" : "Quantity"}</th>
                  <th>{ar ? "الجودة" : "Quality"}</th>
                  <th>{ar ? "الإنتاج" : "Production"}</th>
                  <th>{ar ? "الصلاحية" : "Expiry"}</th>
                  <th>{ar ? "الوجهة" : "Destination"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const expSoon = new Date(b.expiryDate).getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={b.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>{b.batchNumber}</td>
                      <td style={{ fontWeight: 700, color: "var(--ink)" }}>{b.productAr}</td>
                      <td className="num">{formatNumber(b.quantityLiters)} L</td>
                      <td><span className={`tag ${b.qualityGrade === "A" ? "ok" : "gold"}`}>{ar ? `درجة ${b.qualityGrade}` : `Grade ${b.qualityGrade}`} · {b.fatContent.toFixed(1)}%</span></td>
                      <td style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{formatShortDate(b.productionDate, lc)}</td>
                      <td style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: expSoon && b.status !== "DISTRIBUTED" ? "var(--brick)" : undefined, fontWeight: expSoon && b.status !== "DISTRIBUTED" ? 700 : undefined }}>
                        {expSoon && b.status !== "DISTRIBUTED" ? <Clock className="me-1 inline h-3 w-3" /> : null}{formatShortDate(b.expiryDate, lc)}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--ink-muted)" }}>{b.destination ?? "—"}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td><DeleteButton action={deleteBatch} payload={{ id: b.id }} label={ar ? `حذف الدفعة ${b.batchNumber}؟` : `Delete batch ${b.batchNumber}?`} description={ar ? "سيتم حذف الدفعة من سجل المها." : "This batch will be removed from Maha's records."} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
