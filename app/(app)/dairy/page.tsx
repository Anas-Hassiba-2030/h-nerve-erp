import Link from "next/link";
import {
  Milk, Plus, AlertTriangle, ShieldCheck, Clock, Package2, Download,
  Snowflake, Droplets,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer, PageSection } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { BarChart } from "@/components/charts/BarChart";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { getCompanyBrand } from "@/lib/companyBrand";
import { prisma } from "@/lib/db";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteBatch } from "./actions";

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
        <HeroPanel
          gradient={getCompanyBrand("MAHA").gradient}
          accent={getCompanyBrand("MAHA").accent}
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <CompanyLogo code="MAHA" size={88} light />
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
                  <Droplets className="h-3 w-3" />
                  {ar ? "صناعات الألبان" : "Dairy industries"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "المها للألبان" : "Maha Dairy"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "طازج كل يوم، من المزرعة إلى مائدتك. خط إنتاج ذكي مرتبط بسلسلة التوريد."
                    : "Fresh every day, from farm to table. A smart line wired into the supply chain."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <Link
                    href="/dairy/new"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{ background: "white", color: "#084d6e" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "دفعة جديدة" : "New batch"}
                  </Link>
                  <ExportMenu type="dairy" companyCode="MAHA" locale={lc} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <DairyHeroStat label={ar ? "إنتاج 30ي" : "Output 30d"} value={`${formatNumber(total30Volume)}L`} icon={Milk} />
              <DairyHeroStat label={ar ? "جاهز" : "Ready"} value={`${formatNumber(readyVolume)}L`} icon={Package2} />
              <DairyHeroStat label={ar ? "درجة A" : "Grade A"} value={`${Math.round(gradeAPct * 100)}%`} icon={ShieldCheck} />
              <DairyHeroStat label={ar ? "صلاحية" : "Expiring"} value={formatNumber(expiringSoon.length)} icon={Snowflake} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "حجم الإنتاج 30ي" : "Output 30d"}
            value={`${formatNumber(total30Volume)} L`}
            icon={Milk}
            tone="blue"
            hint={`${formatNumber(totals30._count)} ${ar ? "دفعة" : "batches"}`}
          />
          <MetricTile
            label={ar ? "جاهز للتوزيع" : "Ready"}
            value={`${formatNumber(readyVolume)} L`}
            icon={Package2}
            tone="emerald"
            hint={ar ? "في المخزن" : "in storage"}
          />
          <MetricTile
            label={ar ? "درجة A" : "Grade A"}
            value={`${Math.round(gradeAPct * 100)}%`}
            icon={ShieldCheck}
            tone="emerald"
            hint={
              gradeAPct >= 0.8
                ? ar
                  ? "ضمن الهدف"
                  : "On target"
                : ar
                ? "تحت المعيار"
                : "Below benchmark"
            }
          />
          <MetricTile
            label={ar ? "قرب الصلاحية" : "Expiring"}
            value={formatNumber(expiringSoon.length)}
            icon={AlertTriangle}
            tone={expiringSoon.length > 0 ? "amber" : "brand"}
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
              <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>—</div>
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
              color="var(--brand)"
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
                        <td className="font-extrabold" style={{ color: "var(--text)" }}>{b.productAr}</td>
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
                        <td className="text-[11px]" style={{ color: "var(--text-muted)" }}>{b.destination ?? "—"}</td>
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

function DairyHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
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
