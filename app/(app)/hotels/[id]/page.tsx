import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Hotel as HotelIcon,
  BedDouble,
  MapPin,
  Clock,
  ChevronsRight,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { HeriKpi } from "@/components/HeriKpi";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  ar,
  formatMoney,
  formatNumber,
  formatShortDate,
  ROOM_TYPES_AR,
  TIERS_AR,
  ROOM_TYPES_EN,
  TIERS_EN,
  loc,
} from "@/lib/utils";

const COUNTRY_NAMES: Record<string, string> = { JO: "الأردن", BG: "بلغاريا" };
const COUNTRY_NAMES_EN: Record<string, string> = { JO: "Jordan", BG: "Bulgaria" };
function countryName(code: string, en: boolean): string {
  return (
    (en ? COUNTRY_NAMES_EN[code] : COUNTRY_NAMES[code]) ?? code
  );
}

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
    0,
  );

  const pinned = await isPinned("HOTEL", hotel.id);

  const en = getLocale() === "en";

  return (
    <>
      <Topbar
        eyebrow={en ? "Hospitality & Hotels" : "الضيافة والفنادق"}
        title={en ? (hotel.nameEn ?? hotel.name) : hotel.name}
        subtitle={
          (en ? hotel.nameEn : undefined) ??
          `${hotel.city} • ${countryName(hotel.country, en)}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/hotels" className="heri-btn heri-btn-ghost" style={{ fontSize: 13 }}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              {en ? "Hotels" : "الفنادق"}
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
              locale={en ? "en" : "ar"}
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Heritage hero plinth — cream surface, ochre rail, ink type */}
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
                <HotelIcon className="h-8 w-8" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
              </div>
              <div className="min-w-0">
                <div className="heri-eyebrow heri-eyebrow-ink mb-1.5">
                  {loc(TIERS_AR, TIERS_EN, getLocale(), hotel.tier)} · {"★".repeat(hotel.starRating)}
                </div>
                <h2
                  className="text-2xl font-semibold md:text-3xl"
                  style={{ color: "var(--heri-ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}
                >
                  {en ? (hotel.nameEn ?? hotel.name) : hotel.name}
                </h2>
                {!en && hotel.nameEn ? (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--heri-ink-3)" }} dir="ltr">
                    {hotel.nameEn}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--heri-ink-3)" }}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {hotel.city} · {countryName(hotel.country, en)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {formatNumber(hotel.totalRooms)} {en ? "rooms" : "غرفة"}
                  </span>
                  <Link
                    href={`/companies/${hotel.companyId}`}
                    className="hover:underline"
                    style={{ color: "var(--heri-ochre)" }}
                  >
                    {en ? (hotel.company.nameEn ?? hotel.company.name) : hotel.company.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {hotel.description ? (
            <p className="mt-4 max-w-3xl text-sm" style={{ color: "var(--heri-ink-2)", lineHeight: 1.55 }}>
              {hotel.description}
            </p>
          ) : null}
        </section>

        {/* KPI strip — HeriKpi with CountUpValue */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={en ? "Current occupancy" : "إشغال حالي"}
            raw={occ}
            kind="percent"
            accent={occ >= 0.6 ? "var(--heri-teal, #1f4e4a)" : undefined}
            hint={`${formatNumber(activeRooms)} / ${formatNumber(hotel.totalRooms)} ${en ? "rooms" : "غرفة"}`}
          />
          <HeriKpi
            label={en ? "Revenue (30 days)" : "إيرادات 30 يوم"}
            raw={revenue30}
            kind="money"
            hint={`${formatNumber(bookings30)} ${en ? "bookings" : "حجز"}`}
          />
          <HeriKpi
            label={en ? "Avg. revenue / booking" : "متوسط إيراد/حجز"}
            raw={avgRevenuePerBooking}
            kind="money"
            hint={en ? "Last 30 days" : "آخر 30 يوم"}
          />
          <HeriKpi
            label={en ? "Total bookings" : "إجمالي الحجوزات"}
            raw={hotel._count.bookings}
            kind="number"
            hint={en ? "Since launch" : "منذ الانطلاق"}
          />
        </section>

        {/* Live occupancy bar */}
        <section className="heri-card">
          <header className="mb-2 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <BedDouble
                className="h-4 w-4"
                style={{ color: "var(--heri-ochre)" }}
                strokeWidth={1.5}
              />
              {en ? "Occupancy pulse" : "نبض الإشغال"}
            </h3>
            <span className="heri-eyebrow heri-eyebrow-ink">{en ? "Live now" : "نشط الآن"}</span>
          </header>
          <div className="space-y-1.5">
            <div
              className="flex justify-between text-xs font-bold"
              style={{ color: "var(--heri-ink-3)" }}
            >
              <span>
                <span style={{ color: "var(--heri-ink)" }}>
                  {formatNumber(activeRooms)}
                </span>{" "}
                {en ? "booked" : "محجوز"}
              </span>
              <span>
                {formatNumber(Math.max(0, hotel.totalRooms - activeRooms))} {en ? "available" : "متاح"}
              </span>
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
                  width: `${occ * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)",
                  boxShadow: "0 0 24px var(--heri-ochre)",
                  transition: "width .8s cubic-bezier(.21,.92,.32,1)",
                }}
              />
            </div>
          </div>
        </section>

        {/* Two columns — staggered cascade */}
        <div className="grid gap-6 heri-stagger lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            {/* Upcoming arrivals */}
            <section className="heri-card">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <ChevronsRight
                    className="h-4 w-4"
                    style={{ color: "var(--heri-ochre)" }}
                    strokeWidth={1.5}
                  />
                  {en ? "Upcoming arrivals (14 days)" : "وصول وشيك (14 يوم)"}
                </h3>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {formatNumber(upcoming.length)} {en ? "bookings" : "حجز"}
                </span>
              </header>
              {upcoming.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {en
                    ? "No upcoming arrivals in the next two weeks."
                    : "لا توجد وصولات وشيكة في الأسبوعين القادمين."}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {upcoming.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {b.guestName}
                          </span>
                          <StatusBadge status={b.status} />
                        </div>
                        <div
                          className="text-[11px] font-mono"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {b.reference} • {loc(ROOM_TYPES_AR, ROOM_TYPES_EN, getLocale(), b.roomType)} •{" "}
                          {b.rooms} {en ? "rooms" : "غرفة"} • {b.guests} {en ? "guests" : "ضيف"}
                        </div>
                      </div>
                      <div className="text-end">
                        <div
                          className="text-xs font-bold"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {formatShortDate(b.checkIn)}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--heri-ink-3)" }}
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
            <section className="heri-card">
              <header className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <Clock
                    className="h-4 w-4"
                    style={{ color: "var(--heri-ochre)" }}
                    strokeWidth={1.5}
                  />
                  {en ? "Latest bookings (30 days)" : "أحدث الحجوزات (30 يوم)"}
                </h3>
              </header>
              {recentBookings.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {en
                    ? "No bookings in the last 30 days."
                    : "لا توجد حجوزات في آخر 30 يوم."}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {recentBookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {b.guestName}
                          </span>
                          <StatusBadge status={b.status} />
                        </div>
                        <div
                          className="text-[11px] font-mono"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {b.reference} • {formatShortDate(b.checkIn)} →{" "}
                          {formatShortDate(b.checkOut)}
                        </div>
                      </div>
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: "var(--heri-ink)" }}
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
              <section className="heri-card">
                <h3
                  className="mb-3 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {en ? "Bookings by status" : "توزيع الحجوزات حسب الحالة"}
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
                          <span style={{ color: "var(--heri-ink)" }}>
                            {formatNumber(g._count)}
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full"
                          style={{
                            background:
                              "color-mix(in srgb, var(--heri-ink-3) 14%, transparent)",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(90deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)",
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
            <section className="heri-card">
              <h3
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                {en ? "Property card" : "بطاقة العقار"}
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Tier" : "الفئة"} value={loc(TIERS_AR, TIERS_EN, getLocale(), hotel.tier)} />
                <Fact
                  label={en ? "Rating" : "التقييم"}
                  value={`${"★".repeat(hotel.starRating)} (${hotel.starRating}/5)`}
                />
                <Fact
                  label={en ? "Total rooms" : "إجمالي الغرف"}
                  value={formatNumber(hotel.totalRooms)}
                />
                <Fact label={en ? "Baseline ADR" : "ADR مرجعي"} value={formatMoney(hotel.baselineADR)} />
                <Fact
                  label={en ? "Location" : "الموقع"}
                  value={`${hotel.city}${en ? ", " : "، "}${countryName(hotel.country, en)}`}
                />
                <Fact
                  label={en ? "Owning company" : "الشركة المالكة"}
                  value={en ? (hotel.company.nameEn ?? hotel.company.name) : hotel.company.name}
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
    <div className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
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
