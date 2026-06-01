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
import { Topbar } from "@/components/Topbar";
import { HeriKpi } from "@/components/HeriKpi";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import { getLocale } from "@/lib/i18n.server";
import {
  formatNumber,
  formatShortDate,
  formatRelative,
} from "@/lib/utils";

export default async function DairyDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
    ? "var(--heri-terracotta, #b85c38)"
    : lifePct > 0.8
      ? "var(--heri-ochre-2)"
      : "var(--heri-teal, #1f4e4a)";

  const pinned = await isPinned("DAIRY", batch.id);

  const en = getLocale() === "en";

  return (
    <>
      <Topbar
        eyebrow={en ? "Food Industries" : "الصناعات الغذائية"}
        title={en ? (batch.product || batch.productAr) : (batch.productAr || batch.product)}
        subtitle={`${en ? "Batch" : "دفعة"} ${batch.batchNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dairy" className="heri-btn heri-btn-ghost" style={{ fontSize: 13 }}>
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
                <Milk className="h-8 w-8" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
              </div>
              <div className="min-w-0">
                <div className="heri-eyebrow heri-eyebrow-ink mb-1.5 flex items-center gap-2">
                  <span>{en ? "Grade" : "درجة"} {batch.qualityGrade}</span>
                  <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                  <StatusBadge status={batch.status} />
                </div>
                <h2
                  className="text-2xl font-semibold md:text-3xl"
                  style={{ color: "var(--heri-ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}
                >
                  {en ? (batch.product || batch.productAr) : (batch.productAr || batch.product)}
                </h2>
                {batch.productAr && batch.product !== batch.productAr ? (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--heri-ink-3)" }} dir={en ? "rtl" : "ltr"}>
                    {en ? batch.productAr : batch.product}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--heri-ink-3)" }}>
                  <span
                    className="font-mono"
                    style={{ color: "var(--heri-ink-2)" }}
                  >
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
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    {en ? (batch.company.nameEn ?? batch.company.name) : batch.company.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {batch.notes ? (
            <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--heri-ink-2)", lineHeight: 1.55 }}>
              {batch.notes}
            </p>
          ) : null}
        </section>

        {/* KPI strip */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={en ? "Production Volume" : "حجم الإنتاج"}
            raw={batch.quantityLiters}
            kind="number"
            hint={en ? "L" : "لتر"}
          />
          <HeriKpi
            label={en ? "Fat Content" : "نسبة الدسم"}
            raw={batch.fatContent}
            kind="number"
            decimals={1}
            hint={en ? "% of volume" : "٪ من الحجم"}
          />
          <HeriKpi
            label={en ? "Quality Grade" : "درجة الجودة"}
            raw={batch.qualityGrade === "A" ? 100 : batch.qualityGrade === "B" ? 75 : 50}
            kind="percent"
            accent={
              batch.qualityGrade === "A"
                ? "var(--heri-teal, #1f4e4a)"
                : batch.qualityGrade === "B"
                  ? "var(--heri-ochre-2)"
                  : "var(--heri-terracotta, #b85c38)"
            }
            hint={`${en ? "Class" : "فئة"} ${batch.qualityGrade}`}
          />
          <HeriKpi
            label={expired ? (en ? "Expired" : "تجاوز الصلاحية") : (en ? "Days to Expiry" : "أيام للصلاحية")}
            raw={expired ? 0 : Math.max(0, daysUntilExpiry)}
            kind="number"
            accent={expired || lifePct > 0.8 ? "var(--heri-terracotta, #b85c38)" : undefined}
            hint={formatRelative(batch.expiryDate)}
          />
        </section>

        {/* Lifecycle timeline */}
        <section className="heri-card">
          <header className="mb-3 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <Clock className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
              {en ? "Lifecycle" : "دورة الحياة"}
            </h3>
            <span
              className="heri-eyebrow"
              style={{ color: freshnessColor }}
            >
              {expired
                ? (en ? "Expired" : "منتهية")
                : lifePct > 0.8
                  ? (en ? "Near expiry" : "قرب الانتهاء")
                  : (en ? "Fresh" : "طازجة")}
            </span>
          </header>
          <div className="mb-2 flex items-center justify-between text-xs">
            <div>
              <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Produced" : "إنتاج"}</div>
              <div className="mt-0.5 font-bold" style={{ color: "var(--heri-ink)" }}>
                {formatShortDate(batch.productionDate)}
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4"
              style={{ color: "var(--heri-ink-3)" }}
              strokeWidth={1.5}
            />
            <div className="text-end">
              <div className="heri-eyebrow heri-eyebrow-ink">{en ? "Expires" : "صلاحية"}</div>
              <div className="mt-0.5 font-bold" style={{ color: "var(--heri-ink)" }}>
                {formatShortDate(batch.expiryDate)}
              </div>
            </div>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${lifePct * 100}%`,
                background: `linear-gradient(90deg, ${freshnessColor} 0%, ${
                  expired ? "var(--heri-terracotta, #b85c38)" : "var(--heri-copper)"
                } 100%)`,
                boxShadow: `0 0 18px ${freshnessColor}`,
                transition: "width .8s cubic-bezier(.21,.92,.32,1)",
              }}
            />
          </div>
          <div className="mt-1 text-[10px]" style={{ color: "var(--heri-ink-3)" }}>
            {Math.round(lifePct * 100)}{en ? "% of period elapsed" : "٪ من الفترة منقضية"}
          </div>
        </section>

        {/* Two columns */}
        <div className="grid gap-6 heri-stagger lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Sibling batches */}
            <section className="heri-card">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <Package2
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    style={{ color: "var(--heri-ochre)" }}
                  />
                  {en ? "Previous batches of the same product" : "دفعات سابقة لنفس المنتج"}
                </h3>
                <Link
                  href="/dairy"
                  className="text-[11px] font-bold"
                  style={{ color: "var(--heri-ochre)" }}
                >
                  {en ? "View all ←" : "عرض الكل ←"}
                </Link>
              </header>
              {siblings.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {en ? "No other batches of this product." : "لا توجد دفعات أخرى من هذا المنتج."}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--heri-rule)]">
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
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {s.batchNumber}
                          </span>
                          <span className="badge-sky">
                            {en ? "Grade" : "درجة"} {s.qualityGrade}
                          </span>
                          <StatusBadge status={s.status} />
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {formatShortDate(s.productionDate)} →{" "}
                          {formatShortDate(s.expiryDate)}
                        </div>
                      </Link>
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: "var(--heri-ink)" }}
                      >
                        {formatNumber(s.quantityLiters)} {en ? "L" : "لتر"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            {/* Quick facts */}
            <section className="heri-card">
              <h3
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                {en ? "Technical Sheet" : "البطاقة الفنية"}
              </h3>
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
            </section>

            {batch.destination ? (
              <section className="heri-card">
                <h3
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <Truck
                    className="h-4 w-4"
                    strokeWidth={1.5}
                    style={{ color: "var(--heri-ochre)" }}
                  />
                  {en ? "Distribution Destination" : "وجهة التوزيع"}
                </h3>
                <p className="text-sm" style={{ color: "var(--heri-ink)" }}>
                  {batch.destination}
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </>
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
    <div className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className={`text-end font-bold ${mono ? "font-mono" : ""}`}
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
