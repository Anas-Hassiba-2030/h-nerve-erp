import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Milk,
  Beaker,
  Package2,
  Truck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PinButton } from "@/components/ui/PinButton";
import { prisma } from "@/lib/db/db";
import { isPinned } from "@/lib/utils/pins";
import { getLocale } from "@/lib/i18n/i18n.server";
import {
  formatNumber,
  formatShortDate,
  formatRelative,
} from "@/lib/utils/utils";
import "../../daylight.css";

export default async function DairyDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const batch = await prisma.dairyBatch.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!batch) notFound();

  const siblings = await prisma.dairyBatch.findMany({
    where: {
      companyId: batch.companyId,
      product: batch.product,
      id: { not: batch.id },
    },
    orderBy: { productionDate: "desc" },
    take: 6,
  });

  const now = new Date();
  const totalLifeMs =
    batch.expiryDate.getTime() - batch.productionDate.getTime();
  const elapsedMs = Math.max(0, now.getTime() - batch.productionDate.getTime());
  const lifePct = totalLifeMs > 0 ? Math.min(1, elapsedMs / totalLifeMs) : 0;
  const daysUntilExpiry = Math.ceil(
    (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const expired = now > batch.expiryDate;
  const freshnessColor = expired
    ? "#b85c38"
    : lifePct > 0.8
      ? "var(--gold)"
      : "var(--emerald)";

  const pinned = await isPinned("DAIRY", batch.id);

  const en = (await getLocale()) === "en";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Food Industries" : "الصناعات الغذائية"}
        title={en ? (batch.product || batch.productAr) : (batch.productAr || batch.product)}
        subtitle={`${en ? "Batch" : "دفعة"} ${batch.batchNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dairy" className="dl-btn dl-btn-secondary" style={{ fontSize: 13 }}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              {en ? "Batches" : "الدفعات"}
            </Link>
            <PinButton
              entityType="DAIRY"
              entityId={batch.id}
              label={`${batch.batchNumber} — ${batch.productAr || batch.product}`}
              labelEn={batch.product}
              href={`/dairy/${batch.id}`}
              icon="Milk"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero plinth */}
        <section className="panel reveal" style={{ padding: "20px 24px" }}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center"
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--line)",
                }}
              >
                <Milk className="h-8 w-8" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>
                  <span>{en ? "Grade" : "درجة"} {batch.qualityGrade}</span>
                  <span style={{ color: "var(--line)" }}>·</span>
                  <StatusBadge status={batch.status} />
                </div>
                <h2
                  className="text-2xl font-semibold md:text-3xl"
                  style={{ color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}
                >
                  {en ? (batch.product || batch.productAr) : (batch.productAr || batch.product)}
                </h2>
                {batch.productAr && batch.product !== batch.productAr ? (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }} dir={en ? "rtl" : "ltr"}>
                    {en ? batch.productAr : batch.product}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--ink-muted)" }}>
                  <span className="font-mono" style={{ color: "var(--ink)" }}>
                    {batch.batchNumber}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Beaker className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {batch.fatContent}{en ? "% fat" : "٪ دسم"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Package2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {formatNumber(batch.quantityLiters)} {en ? "L" : "لتر"}
                  </span>
                  <Link
                    href={`/companies/${batch.companyId}`}
                    className="hover:underline"
                    style={{ color: "var(--gold)" }}
                  >
                    {en ? (batch.company.nameEn ?? batch.company.name) : batch.company.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {batch.notes ? (
            <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--ink)", lineHeight: 1.55 }}>
              {batch.notes}
            </p>
          ) : null}
        </section>

        {/* KPI strip */}
        <DaylightKpiGrid>
          <DaylightKpi
            label={en ? "Production Volume" : "حجم الإنتاج"}
            value={formatNumber(batch.quantityLiters)}
            hint={en ? "L" : "لتر"}
          />
          <DaylightKpi
            label={en ? "Fat Content" : "نسبة الدسم"}
            value={`${batch.fatContent}${en ? "%" : "٪"}`}
            hint={en ? "% of volume" : "٪ من الحجم"}
          />
          <DaylightKpi
            label={en ? "Quality Grade" : "درجة الجودة"}
            value={batch.qualityGrade}
            hint={`${en ? "Class" : "فئة"} ${batch.qualityGrade}`}
          />
          <DaylightKpi
            label={expired ? (en ? "Expired" : "تجاوز الصلاحية") : (en ? "Days to Expiry" : "أيام للصلاحية")}
            value={expired ? "0" : formatNumber(Math.max(0, daysUntilExpiry))}
            hint={formatRelative(batch.expiryDate)}
          />
        </DaylightKpiGrid>

        {/* Lifecycle timeline */}
        <DaylightPanel
          title={en ? "Lifecycle" : "دورة الحياة"}
          aside={
            expired
              ? (en ? "Expired" : "منتهية")
              : lifePct > 0.8
                ? (en ? "Near expiry" : "قرب الانتهاء")
                : (en ? "Fresh" : "طازجة")
          }
        >
          <div className="mb-2 flex items-center justify-between text-xs">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>{en ? "Produced" : "إنتاج"}</div>
              <div className="mt-0.5 font-bold" style={{ color: "var(--ink)" }}>
                {formatShortDate(batch.productionDate)}
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4"
              style={{ color: "var(--ink-muted)" }}
              strokeWidth={1.5}
            />
            <div className="text-end">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>{en ? "Expires" : "صلاحية"}</div>
              <div className="mt-0.5 font-bold" style={{ color: "var(--ink)" }}>
                {formatShortDate(batch.expiryDate)}
              </div>
            </div>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full"
            style={{ background: "var(--ivory)", border: "1px solid var(--line)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${lifePct * 100}%`,
                background: `linear-gradient(90deg, ${freshnessColor} 0%, ${freshnessColor} 100%)`,
                boxShadow: `0 0 18px ${freshnessColor}`,
                transition: "width .8s cubic-bezier(.21,.92,.32,1)",
              }}
            />
          </div>
          <div className="mt-1 text-[12px]" style={{ color: "var(--ink-muted)" }}>
            {Math.round(lifePct * 100)}{en ? "% of period elapsed" : "٪ من الفترة منقضية"}
          </div>
        </DaylightPanel>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Sibling batches */}
            <DaylightPanel
              title={en ? "Previous batches of the same product" : "دفعات سابقة لنفس المنتج"}
              aside={<Link href="/dairy" className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>{en ? "View all ←" : "عرض الكل ←"}</Link>}
            >
              {siblings.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {en ? "No other batches of this product." : "لا توجد دفعات أخرى من هذا المنتج."}
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {siblings.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <Link
                        href={`/dairy/${s.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: "var(--ink)" }}
                          >
                            {s.batchNumber}
                          </span>
                          <span className="badge-sky">
                            {en ? "Grade" : "درجة"} {s.qualityGrade}
                          </span>
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                          {formatShortDate(s.productionDate)} →{" "}
                          {formatShortDate(s.expiryDate)}
                        </div>
                      </Link>
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                        {formatNumber(s.quantityLiters)} {en ? "L" : "لتر"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DaylightPanel>
          </div>

          <aside className="space-y-6">
            {/* Quick facts */}
            <DaylightPanel title={en ? "Technical Sheet" : "البطاقة الفنية"}>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Batch Number" : "رقم الدفعة"} value={batch.batchNumber} mono />
                <Fact
                  label={en ? "Product" : "المنتج"}
                  value={en ? (batch.product || batch.productAr) : (batch.productAr || batch.product)}
                />
                <Fact
                  label={en ? "Quantity" : "الكمية"}
                  value={`${formatNumber(batch.quantityLiters)} ${en ? "L" : "لتر"}`}
                />
                <Fact
                  label={en ? "Fat Content" : "نسبة الدسم"}
                  value={`${batch.fatContent}${en ? "%" : "٪"}`}
                />
                <Fact label={en ? "Quality Grade" : "درجة الجودة"} value={batch.qualityGrade} />
                <Fact
                  label={en ? "Production Date" : "إنتاج"}
                  value={formatShortDate(batch.productionDate)}
                />
                <Fact
                  label={en ? "Expiry Date" : "صلاحية"}
                  value={formatShortDate(batch.expiryDate)}
                />
                {batch.destination ? (
                  <Fact label={en ? "Destination" : "الوجهة"} value={batch.destination} />
                ) : null}
                <Fact
                  label={en ? "Company" : "الشركة"}
                  value={en ? (batch.company.nameEn ?? batch.company.name) : batch.company.name}
                  link={`/companies/${batch.companyId}`}
                />
              </dl>
            </DaylightPanel>

            {batch.destination ? (
              <DaylightPanel
                title={
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                    {en ? "Distribution Destination" : "وجهة التوزيع"}
                  </span>
                }
              >
                <p className="text-sm" style={{ color: "var(--ink)" }}>
                  {batch.destination}
                </p>
              </DaylightPanel>
            ) : null}
          </aside>
        </div>
      </div>
    </DaylightShell>
  );
}

function Fact({
  label,
  value,
  link,
  mono,
}: {
  label: string;
  value: string;
  link?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-1.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd
        className={`text-end font-bold ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--ink)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--gold)" }}
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
