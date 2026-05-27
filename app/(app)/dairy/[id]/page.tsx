import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Milk,
  Beaker,
  ShieldCheck,
  Package2,
  Truck,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatNumber,
  formatShortDate,
  formatRelative,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

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
    (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const expired = now > batch.expiryDate;
  const freshnessTone: "red" | "amber" | "emerald" = expired
    ? "red"
    : lifePct > 0.8
      ? "amber"
      : "emerald";
  const freshnessColor = expired
    ? "#c0392b"
    : lifePct > 0.8
      ? "#b06a1a"
      : "#0a8e54";

  const brand = getCompanyBrand(batch.company.code);
  const pinned = await isPinned("DAIRY", batch.id);

  return (
    <>
      <Topbar
        eyebrow="الصناعات الغذائية"
        title={batch.productAr || batch.product}
        subtitle={`دفعة ${batch.batchNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dairy" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              الدفعات
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
        {/* Brand cover */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white anim-fade-up"
          style={{ background: brand.gradient, minHeight: "180px" }}
        >
          <div
            className="absolute inset-0 opacity-20 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl anim-pop"
                style={{
                  background: "rgba(255,255,255,.15)",
                  border: "1px solid rgba(255,255,255,.35)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Milk className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-sky">
                    درجة {batch.qualityGrade}
                  </span>
                  <StatusBadge status={batch.status} />
                  <Link
                    href={`/companies/${batch.companyId}`}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "rgba(255,255,255,.2)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    {batch.company.name}
                  </Link>
                </div>
                <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                  {batch.productAr || batch.product}
                </h2>
                {batch.productAr && batch.product !== batch.productAr ? (
                  <p className="text-sm opacity-90" dir="ltr">
                    {batch.product}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs"
                    style={{
                      background: "rgba(255,255,255,.18)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    {batch.batchNumber}
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Beaker className="h-3 w-3" />
                    {batch.fatContent}٪ دسم
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <Package2 className="h-3 w-3" />
                    {formatNumber(batch.quantityLiters)} لتر
                  </span>
                </div>
              </div>
            </div>
          </div>
          {batch.notes ? (
            <p className="relative mt-4 max-w-3xl text-sm opacity-95">
              {batch.notes}
            </p>
          ) : null}
        </section>

        {/* KPI strip */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="حجم الإنتاج"
            value={`${formatNumber(batch.quantityLiters)} لتر`}
            icon={Package2}
            tone="sky"
          />
          <KpiCard
            label="نسبة الدسم"
            value={`${batch.fatContent}٪`}
            icon={Beaker}
            tone="amber"
          />
          <KpiCard
            label="درجة الجودة"
            value={batch.qualityGrade}
            icon={ShieldCheck}
            tone={batch.qualityGrade === "A" ? "emerald" : "amber"}
          />
          <KpiCard
            label={expired ? "منتهي الصلاحية" : "أيام للصلاحية"}
            value={expired ? "—" : `${Math.max(0, daysUntilExpiry)}`}
            icon={expired ? AlertTriangle : Clock}
            tone={freshnessTone}
            hint={formatRelative(batch.expiryDate)}
          />
        </section>

        {/* Lifecycle timeline */}
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <Clock className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
              دورة الحياة
            </h3>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: freshnessColor }}
            >
              {expired
                ? "منتهية"
                : lifePct > 0.8
                  ? "قرب الانتهاء"
                  : "طازجة"}
            </span>
          </header>
          <div className="mb-2 flex items-center justify-between text-xs">
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--heri-ink-3)" }}
              >
                إنتاج
              </div>
              <div className="font-bold" style={{ color: "var(--heri-ink)" }}>
                {formatShortDate(batch.productionDate)}
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4"
              style={{ color: "var(--heri-ink-3)" }}
            />
            <div className="text-end">
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--heri-ink-3)" }}
              >
                صلاحية
              </div>
              <div className="font-bold" style={{ color: "var(--heri-ink)" }}>
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
              className="h-full rounded-full anim-rise-glow"
              style={{
                width: `${lifePct * 100}%`,
                background: `linear-gradient(90deg, ${freshnessColor} 0%, ${
                  expired ? "#c0392b" : "var(--heri-copper)"
                } 100%)`,
                boxShadow: `0 0 18px ${freshnessColor}`,
                transition: "width .8s cubic-bezier(.21,.92,.32,1)",
              }}
            />
          </div>
          <div
            className="mt-1 text-[10px]"
            style={{ color: "var(--heri-ink-3)" }}
          >
            {Math.round(lifePct * 100)}٪ من الفترة منقضية
          </div>
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Sibling batches */}
            <section className="card card-pad anim-fade-up">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <Package2
                    className="h-4 w-4"
                    style={{ color: "var(--heri-ochre)" }}
                  />
                  دفعات سابقة لنفس المنتج
                </h3>
                <Link
                  href="/dairy"
                  className="text-[11px] font-bold"
                  style={{ color: "var(--heri-ochre)" }}
                >
                  عرض الكل ←
                </Link>
              </header>
              {siblings.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  لا توجد دفعات أخرى من هذا المنتج.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {siblings.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
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
                            درجة {s.qualityGrade}
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
                        {formatNumber(s.quantityLiters)} لتر
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            {/* Quick facts */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                البطاقة الفنية
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="رقم الدفعة" value={batch.batchNumber} mono />
                <Fact
                  label="المنتج"
                  value={batch.productAr || batch.product}
                />
                <Fact
                  label="الكمية"
                  value={`${formatNumber(batch.quantityLiters)} لتر`}
                />
                <Fact
                  label="نسبة الدسم"
                  value={`${batch.fatContent}٪`}
                />
                <Fact label="درجة الجودة" value={batch.qualityGrade} />
                <Fact
                  label="إنتاج"
                  value={formatShortDate(batch.productionDate)}
                />
                <Fact
                  label="صلاحية"
                  value={formatShortDate(batch.expiryDate)}
                />
                {batch.destination ? (
                  <Fact label="الوجهة" value={batch.destination} />
                ) : null}
                <Fact
                  label="الشركة"
                  value={batch.company.name}
                  link={`/companies/${batch.companyId}`}
                />
              </dl>
            </section>

            {batch.destination ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <Truck
                    className="h-4 w-4"
                    style={{ color: "var(--heri-ochre)" }}
                  />
                  وجهة التوزيع
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
