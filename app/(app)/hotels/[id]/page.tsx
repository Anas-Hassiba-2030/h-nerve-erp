import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Hotel as HotelIcon,
  BedDouble,
  TrendingUp,
  CircleDollarSign,
  Calendar,
  MapPin,
  Clock,
  ChevronsRight,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  ar,
  formatMoney,
  formatNumber,
  formatPercent,
  formatShortDate,
  ROOM_TYPES_AR,
  TIERS_AR,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

const COUNTRY_NAMES: Record<string, string> = { JO: "الأردن", BG: "بلغاريا" };

export default async function HotelDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const hotel = await prisma.hotel.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      _count: { select: { bookings: true } },
    },
  });
  if (!hotel) notFound();

  const [recentBookings, upcoming, agg30, activeAgg, statusBreakdown] =
    await Promise.all([
      prisma.booking.findMany({
        where: { hotelId: hotel.id, checkIn: { gte: last30 } },
        orderBy: { checkIn: "desc" },
        take: 12,
      }),
      prisma.booking.findMany({
        where: { hotelId: hotel.id, checkIn: { gte: now, lte: next14 } },
        orderBy: { checkIn: "asc" },
        take: 8,
      }),
      prisma.booking.aggregate({
        _sum: { revenue: true, rooms: true },
        _count: true,
        where: { hotelId: hotel.id, checkIn: { gte: last30 } },
      }),
      prisma.booking.aggregate({
        _sum: { rooms: true },
        _count: true,
        where: {
          hotelId: hotel.id,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { hotelId: hotel.id },
        _count: true,
      }),
    ]);

  const revenue30 = agg30._sum.revenue ?? 0;
  const bookings30 = agg30._count ?? 0;
  const avgRevenuePerBooking = bookings30 > 0 ? revenue30 / bookings30 : 0;
  const activeRooms = activeAgg._sum.rooms ?? 0;
  const occ = hotel.totalRooms ? Math.min(activeRooms / hotel.totalRooms, 1) : 0;

  const totalAllBookings = statusBreakdown.reduce(
    (acc, g) => acc + g._count,
    0
  );

  const brand = getCompanyBrand(hotel.company.code);
  const pinned = await isPinned("HOTEL", hotel.id);

  return (
    <>
      <Topbar
        eyebrow="الضيافة والفنادق"
        title={hotel.name}
        subtitle={
          hotel.nameEn ??
          `${hotel.city} • ${COUNTRY_NAMES[hotel.country] ?? hotel.country}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/hotels" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              الفنادق
            </Link>
            <PinButton
              entityType="HOTEL"
              entityId={hotel.id}
              label={hotel.name}
              labelEn={hotel.nameEn ?? undefined}
              href={`/hotels/${hotel.id}`}
              icon="Hotel"
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
                <HotelIcon className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-amber">{ar(TIERS_AR, hotel.tier)}</span>
                  <span className="font-mono text-xs opacity-90">
                    {"★".repeat(hotel.starRating)}
                  </span>
                  <Link
                    href={`/companies/${hotel.companyId}`}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:opacity-100"
                    style={{
                      background: "rgba(255,255,255,.2)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    {hotel.company.name}
                  </Link>
                </div>
                <h2 className="mt-1 text-2xl font-black md:text-3xl">
                  {hotel.name}
                </h2>
                {hotel.nameEn ? (
                  <p className="text-sm opacity-90" dir="ltr">
                    {hotel.nameEn}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {hotel.city} •{" "}
                    {COUNTRY_NAMES[hotel.country] ?? hotel.country}
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                    style={{
                      background: "rgba(255,255,255,.15)",
                      border: "1px solid rgba(255,255,255,.25)",
                    }}
                  >
                    <BedDouble className="h-3 w-3" />
                    {formatNumber(hotel.totalRooms)} غرفة
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs"
                    style={{
                      background: "rgba(255,255,255,.18)",
                      border: "1px solid rgba(255,255,255,.3)",
                    }}
                  >
                    ADR {formatMoney(hotel.baselineADR)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {hotel.description ? (
            <p className="relative mt-4 max-w-3xl text-sm opacity-95">
              {hotel.description}
            </p>
          ) : null}
        </section>

        {/* KPI strip */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="إشغال حالي"
            value={formatPercent(occ, 0)}
            icon={TrendingUp}
            tone="emerald"
            hint={`${formatNumber(activeRooms)} من ${formatNumber(hotel.totalRooms)} غرفة`}
          />
          <KpiCard
            label="إيرادات 30 يوم"
            value={formatMoney(revenue30)}
            icon={CircleDollarSign}
            tone="amber"
            hint={`${formatNumber(bookings30)} حجز`}
          />
          <KpiCard
            label="متوسط إيراد/حجز"
            value={formatMoney(avgRevenuePerBooking)}
            icon={Sparkles}
            tone="violet"
          />
          <KpiCard
            label="إجمالي الحجوزات"
            value={formatNumber(hotel._count.bookings)}
            icon={Calendar}
            tone="indigo"
          />
        </section>

        {/* Live occupancy bar */}
        <section className="card card-pad anim-fade-up">
          <header className="mb-2 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-extrabold"
              style={{ color: "var(--text)" }}
            >
              <BedDouble
                className="h-4 w-4"
                style={{ color: "var(--brand)" }}
              />
              نبض الإشغال
            </h3>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              نشط الآن
            </span>
          </header>
          <div className="space-y-1.5">
            <div
              className="flex justify-between text-xs font-bold"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                <span style={{ color: "var(--text)" }}>
                  {formatNumber(activeRooms)}
                </span>{" "}
                محجوز
              </span>
              <span>
                {formatNumber(Math.max(0, hotel.totalRooms - activeRooms))} متاح
              </span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full"
              style={{
                background:
                  "color-mix(in srgb, var(--text-muted) 14%, transparent)",
              }}
            >
              <div
                className="h-full rounded-full anim-rise-glow"
                style={{
                  width: `${occ * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)",
                  boxShadow: "0 0 24px var(--brand)",
                  transition: "width .8s cubic-bezier(.21,.92,.32,1)",
                }}
              />
            </div>
          </div>
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            {/* Upcoming arrivals */}
            <section className="card card-pad anim-fade-up">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  <ChevronsRight
                    className="h-4 w-4"
                    style={{ color: "var(--brand)" }}
                  />
                  وصول وشيك (14 يوم)
                </h3>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatNumber(upcoming.length)} حجز
                </span>
              </header>
              {upcoming.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  لا توجد وصولات وشيكة في الأسبوعين القادمين.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {upcoming.map((b, i) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {b.guestName}
                          </span>
                          <StatusBadge status={b.status} />
                        </div>
                        <div
                          className="text-[11px] font-mono"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {b.reference} • {ar(ROOM_TYPES_AR, b.roomType)} •{" "}
                          {b.rooms} غرفة • {b.guests} ضيف
                        </div>
                      </div>
                      <div className="text-end">
                        <div
                          className="text-xs font-bold"
                          style={{ color: "var(--text)" }}
                        >
                          {formatShortDate(b.checkIn)}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          → {formatShortDate(b.checkOut)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent bookings */}
            <section className="card card-pad anim-fade-up">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  <Clock
                    className="h-4 w-4"
                    style={{ color: "var(--brand)" }}
                  />
                  أحدث الحجوزات (30 يوم)
                </h3>
              </header>
              {recentBookings.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  لا توجد حجوزات في آخر 30 يوم.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {recentBookings.map((b, i) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {b.guestName}
                          </span>
                          <StatusBadge status={b.status} />
                        </div>
                        <div
                          className="text-[11px] font-mono"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {b.reference} • {formatShortDate(b.checkIn)} →{" "}
                          {formatShortDate(b.checkOut)}
                        </div>
                      </div>
                      <span
                        className="font-mono text-xs font-black"
                        style={{ color: "var(--text)" }}
                      >
                        {formatMoney(b.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            {/* Status breakdown */}
            {statusBreakdown.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-3 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  توزيع الحجوزات حسب الحالة
                </h3>
                <div className="space-y-2">
                  {statusBreakdown.map((g) => {
                    const pct =
                      totalAllBookings > 0
                        ? (g._count / totalAllBookings) * 100
                        : 0;
                    return (
                      <div key={g.status}>
                        <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold">
                          <StatusBadge status={g.status} />
                          <span style={{ color: "var(--text)" }}>
                            {formatNumber(g._count)}
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full"
                          style={{
                            background:
                              "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%)",
                              transition: "width .6s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* Quick facts */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-extrabold"
                style={{ color: "var(--text)" }}
              >
                بطاقة العقار
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="الفئة" value={ar(TIERS_AR, hotel.tier)} />
                <Fact
                  label="التقييم"
                  value={`${"★".repeat(hotel.starRating)} (${hotel.starRating}/5)`}
                />
                <Fact
                  label="إجمالي الغرف"
                  value={formatNumber(hotel.totalRooms)}
                />
                <Fact label="ADR مرجعي" value={formatMoney(hotel.baselineADR)} />
                <Fact
                  label="الموقع"
                  value={`${hotel.city}، ${COUNTRY_NAMES[hotel.country] ?? hotel.country}`}
                />
                <Fact
                  label="الشركة المالكة"
                  value={hotel.company.name}
                  link={`/companies/${hotel.companyId}`}
                />
              </dl>
            </section>
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
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
        style={{ color: "var(--text)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--brand)" }}
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
