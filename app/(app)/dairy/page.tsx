import Link from "next/link";
import {
  Milk, Plus, AlertTriangle, ShieldCheck, Clock, Package2, Download,
  Snowflake, Droplets,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer, PageSection } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { BarChart } from "@/components/charts/BarChart";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { prisma } from "@/lib/db";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteBatch } from "./actions";

export const dynamic = "force-dynamic";

export default async function DairyPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [batches, totals30, ready, expiringSoon, gradeAggA, productMix] = await Promise.all([
    prisma.dairyBatch.findMany({
      orderBy: { productionDate: "desc" },
      take: 50,
      include: { company: true },
    }),
    prisma.dairyBatch.aggregate({
      _sum: { quantityLiters: true },
      _count: true,
      where: { productionDate: { gte: last30 } },
    }),
    prisma.dairyBatch.aggregate({
      _sum: { quantityLiters: true },
      where: { status: "READY" },
    }),
    prisma.dairyBatch.findMany({
      where: { expiryDate: { lte: next3Days, gte: now }, status: { not: "RECALLED" } },
      orderBy: { expiryDate: "asc" },
      take: 5,
    }),
    prisma.dairyBatch.count({ where: { qualityGrade: "A", productionDate: { gte: last30 } } }),
    prisma.dairyBatch.groupBy({
      by: ["product"],
      _sum: { quantityLiters: true },
      where: { productionDate: { gte: last30 } },
    }),
  ]);

  const total30Volume = totals30._sum.quantityLiters ?? 0;
  const readyVolume = ready._sum.quantityLiters ?? 0;
  const gradeAPct = totals30._count ? gradeAggA / totals30._count : 0;

  const PRODUCT_AR: Record<string, string> = {
    MILK: "حليب", LABNEH: "لبنة", YOGURT: "زبادي",
    CHEESE: "جبن", BUTTER: "زبدة", CREAM: "قشطة",
  };
  const PRODUCT_EN: Record<string, string> = {
    MILK: "Milk", LABNEH: "Labneh", YOGURT: "Yogurt",
    CHEESE: "Cheese", BUTTER: "Butter", CREAM: "Cream",
  };

  const mixData = productMix.map((p) => ({
    label: ar ? PRODUCT_AR[p.product] ?? p.product : PRODUCT_EN[p.product] ?? p.product,
    value: p._sum.quantityLiters ?? 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الصناعات الغذائية" : "Food Industries"}
        title={ar ? "المها للألبان" : "Maha Dairy"}
        subtitle={
          ar
            ? "دفعات الإنتاج، رقابة الجودة، الصلاحية، وقنوات التوزيع."
            : "Production batches, QC, expiry tracking, distribution."
        }
      />

      <PageContainer>
        {/* Action rail */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "آخر 30 يوماً" : "Last 30 days"}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dairy/new" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "دفعة جديدة" : "New batch"}
            </Link>
            <ExportMenu type="dairy" companyCode="MAHA" locale={lc} />
          </div>
        </div>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "حجم الإنتاج 30ي" : "Output 30d"}
            raw={total30Volume}
            kind="number"
            hint={`${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`}
          />
          <HeriKpi
            label={ar ? "جاهز للتوزيع" : "Ready"}
            raw={readyVolume}
            kind="number"
            hint={ar ? "لتر في المخزن" : "liters in storage"}
          />
          <HeriKpi
            label={ar ? "درجة A ٪" : "Grade A %"}
            raw={gradeAPct}
            kind="percent"
            accent="var(--heri-teal, #1f4e4a)"
            hint={gradeAPct >= 0.8 ? (ar ? "ضمن الهدف" : "On target") : (ar ? "تحت المعيار" : "Below benchmark")}
          />
          <HeriKpi
            label={ar ? "قرب الصلاحية" : "Expiring soon"}
            raw={expiringSoon.length}
            kind="number"
            accent={expiringSoon.length > 0 ? "var(--heri-terracotta, #b85c38)" : undefined}
            hint={ar ? "خلال 72 ساعة" : "within 72h"}
          />
        </section>

        {/* Charts row: product mix + quality gauge */}
        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="card card-pad">
            <h3 className="card-title mb-1">{ar ? "توزيع الإنتاج حسب الصنف" : "Output by product"}</h3>
            <p className="card-sub mb-4">{ar ? "آخر 30 يوم — لتر" : "Last 30 days — liters"}</p>
            {mixData.length > 0 ? (
              <BarChart
                data={mixData}
                height={220}
                formatValue={(v) => `${formatNumber(v)} L`}
              />
            ) : (
              <div className="py-12 text-center text-sm" style={{ color: "var(--heri-ink-3)" }}>—</div>
            )}
          </div>
          <div className="card card-pad flex flex-col items-center justify-center">
            <h3 className="card-title mb-2">{ar ? "مؤشر الجودة" : "Quality index"}</h3>
            <p className="card-sub mb-4">{ar ? "نسبة الدرجة A" : "Grade A share"}</p>
            <GaugeChart
              value={gradeAPct * 100}
              size={180}
              label={ar ? "ممتاز فوق 80٪" : "Excellent ≥ 80%"}
              sublabel={`${formatNumber(gradeAggA)} / ${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`}
              color="var(--heri-ochre)"
            />
          </div>
        </section>

        {expiringSoon.length > 0 ? (
          <div className="alert-warn">
            <div className="mb-1.5 flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4" />
              {ar ? "تنبيه صلاحية: " : "Expiry alert: "}
              {formatNumber(expiringSoon.length)} {ar ? "دفعة قرب الانتهاء" : "batch(es) expiring soon"}
            </div>
            <ul className="space-y-0.5 text-[12px]">
              {expiringSoon.map((b) => (
                <li key={b.id}>
                  <span className="font-mono">{b.batchNumber}</span> — {b.productAr} ({formatNumber(b.quantityLiters)} L) — {ar ? "تنتهي" : "expires"} {formatShortDate(b.expiryDate, lc)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <PageSection title={ar ? "دفعات الإنتاج الأخيرة" : "Recent production batches"}>
          {batches.length === 0 ? (
            <EmptyState
              icon={Milk}
              title={ar ? "لا توجد دفعات بعد" : "No batches yet"}
              description={ar ? "ابدأ بتسجيل أول دفعة إنتاج." : "Log your first production batch."}
              action={
                <Link href="/dairy/new" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "دفعة جديدة" : "New batch"}
                </Link>
              }
            />
          ) : (
            <div className="table-wrap table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{ar ? "رقم الدفعة" : "Batch #"}</th>
                    <th>{ar ? "المنتج" : "Product"}</th>
                    <th>{ar ? "الكمية" : "Quantity"}</th>
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
                        <td className="font-mono text-[11px]">{b.batchNumber}</td>
                        <td className="font-semibold" style={{ color: "var(--heri-ink)" }}>{b.productAr}</td>
                        <td className="tabular-nums">{formatNumber(b.quantityLiters)} L</td>
                        <td>
                          <span className={
                            b.qualityGrade === "A" ? "badge-emerald" :
                            b.qualityGrade === "B" ? "badge-amber" : "badge-red"
                          }>
                            {ar ? `درجة ${b.qualityGrade}` : `Grade ${b.qualityGrade}`} · {b.fatContent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-[11px] tabular-nums">{formatShortDate(b.productionDate, lc)}</td>
                        <td className={`text-[11px] tabular-nums ${expSoon && b.status !== "DISTRIBUTED" ? "text-amber-700 font-bold" : ""}`}>
                          {expSoon && b.status !== "DISTRIBUTED" ? <Clock className="me-1 inline h-3 w-3" /> : null}
                          {formatShortDate(b.expiryDate, lc)}
                        </td>
                        <td className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>{b.destination ?? "—"}</td>
                        <td><StatusBadge status={b.status} /></td>
                        <td>
                          <DeleteButton
                            action={deleteBatch}
                            payload={{ id: b.id }}
                            label={ar ? `حذف الدفعة ${b.batchNumber}؟` : `Delete batch ${b.batchNumber}?`}
                            description={ar ? "سيتم حذف الدفعة من سجل المها." : "This batch will be removed from Maha's records."}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      </PageContainer>
    </>
  );
}

