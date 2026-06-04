import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Hotel as HotelIcon,
  BedDouble,
  Users2,
  CircleDollarSign,
  Clock,
  Sparkles,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/StatusBadge";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db/db";
import { isPinned } from "@/lib/utils/pins";
import {
  formatMoney,
  formatNumber,
  formatRelative,
  formatShortDate,
  formatDateTime,
  ROOM_TYPES_AR,
  TIERS_AR,
  ROOM_TYPES_EN,
  TIERS_EN,
  loc,
} from "@/lib/utils/utils";
import { getCompanyBrand } from "@/lib/utils/companyBrand";
import "../../../daylight.css";

const COUNTRY_NAMES: Record<string, string> = { JO: "الأردن", BG: "بلغاريا" };
const COUNTRY_NAMES_EN: Record<string, string> = { JO: "Jordan", BG: "Bulgaria" };

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      hotel: {
        include: { company: { select: { id: true, name: true, code: true } } },
      },
    },
  });
  if (!booking) notFound();

  const otherBookingsForGuest = await prisma.booking.findMany({
    where: {
      guestName: booking.guestName,
      id: { not: booking.id },
    },
    orderBy: { checkIn: "desc" },
    take: 5,
    include: { hotel: { select: { name: true, nameEn: true } } },
  });

  const en = getLocale() === "en";
  const now = new Date();
  const nights = Math.max(
    1,
    Math.round(
      (booking.checkOut.getTime() - booking.checkIn.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const perNight = nights > 0 ? booking.revenue / nights : booking.revenue;
  const perRoomNight =
    nights > 0 && booking.rooms > 0
      ? booking.revenue / nights / booking.rooms
      : 0;

  const isUpcoming = booking.checkIn > now;
  const isStaying = booking.checkIn <= now && booking.checkOut > now;
  const isPast = booking.checkOut <= now;

  const stayLabel = isStaying
    ? en
      ? "Staying now"
      : "يقيم الآن"
    : isUpcoming
      ? `${en ? "Upcoming" : "قادم"} — ${formatRelative(booking.checkIn)}`
      : `${en ? "Ended" : "انتهى"} — ${formatRelative(booking.checkOut)}`;

  const stayTone: "emerald" | "amber" | "slate" = isStaying
    ? "emerald"
    : isUpcoming
      ? "amber"
      : "slate";

  const brand = getCompanyBrand(booking.hotel.company.code);
  const pinned = await isPinned("BOOKING", booking.id);

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Hotel booking" : "حجز فندقي"}
        title={booking.guestName}
        subtitle={`${booking.reference} • ${en ? (booking.hotel.nameEn ?? booking.hotel.name) : booking.hotel.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/hotels" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              {en ? "Hotels" : "الفنادق"}
            </Link>
            <PinButton
              entityType="BOOKING"
              entityId={booking.id}
              label={`${booking.reference} — ${booking.guestName}`}
              href={`/hotels/bookings/${booking.id}`}
              icon="Calendar"
              initial={pinned}
              tone="default"
              locale={en ? "en" : "ar"}
            />
          </div>
        }
      />

      <div className="space-y-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{ background: brand.gradient, color: "white", minHeight: "200px" }}
        >
          <div
            className="absolute inset-0 opacity-15 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
            <div className="anim-pop">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold"
                style={{
                  background: "rgba(255,255,255,.2)",
                  border: "1px solid rgba(255,255,255,.35)",
                  backdropFilter: "blur(6px)",
                }}
              >
                {booking.guestName.slice(0, 1)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[11px]"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {booking.reference}
                </span>
                <StatusBadge status={booking.status} />
                <Link
                  href={`/hotels/${booking.hotel.id}`}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  <HotelIcon className="me-1 inline h-3 w-3" />
                  {en ? (booking.hotel.nameEn ?? booking.hotel.name) : booking.hotel.name}
                </Link>
              </div>
              <h2 className="mt-1 text-3xl font-bold md:text-4xl">
                {booking.guestName}
              </h2>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{
                    background: "rgba(255,255,255,.15)",
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <BedDouble className="h-3 w-3" />
                  {loc(ROOM_TYPES_AR, ROOM_TYPES_EN, getLocale(), booking.roomType)} •{" "}
                  {formatNumber(booking.rooms)} {en ? "rooms" : "غرفة"}
                </span>
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{
                    background: "rgba(255,255,255,.15)",
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <Users2 className="h-3 w-3" />
                  {formatNumber(booking.guests)} {en ? "guests" : "ضيف"}
                </span>
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{
                    background: "rgba(255,255,255,.15)",
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <Clock className="h-3 w-3" />
                  {stayLabel}
                </span>
              </div>
            </div>

            {/* Revenue block */}
            <div className="text-end">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-90">
                {en ? "Booking revenue" : "إيراد الحجز"}
              </div>
              <div
                className="font-mono text-4xl font-bold md:text-5xl"
                style={{
                  textShadow: "0 2px 14px rgba(0,0,0,.3)",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatMoney(booking.revenue)}
              </div>
              <div className="text-[11px] opacity-90">
                {formatNumber(nights)} {en ? "nights" : "ليلة"}
              </div>
            </div>
          </div>
        </section>

        {/* Stay timeline */}
        <DaylightPanel
          title={
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Stay period" : "فترة الإقامة"}
            </span>
          }
          aside={
            isStaying ? (en ? "In progress" : "قائمة الآن")
              : isUpcoming ? (en ? "Upcoming" : "قادمة")
              : (en ? "Ended" : "منتهية")
          }
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                {en ? "Check-in" : "وصول"}
              </div>
              <div className="text-base font-bold" style={{ color: "var(--ink)" }}>
                {formatShortDate(booking.checkIn)}
              </div>
              <div className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                {formatDateTime(booking.checkIn)}
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="flex w-full items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--gold)" }} />
                <div className="dl-bar flex-1">
                  <i style={{ width: isPast ? "100%" : isStaying ? `${Math.min(100, ((now.getTime() - booking.checkIn.getTime()) / (booking.checkOut.getTime() - booking.checkIn.getTime())) * 100)}%` : "0%" }} />
                </div>
                <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--ink-muted)" }} />
                <span className="block h-2 w-2 rounded-full" style={{ background: "var(--gold)" }} />
              </div>
            </div>
            <div className="text-end">
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                {en ? "Check-out" : "مغادرة"}
              </div>
              <div className="text-base font-bold" style={{ color: "var(--ink)" }}>
                {formatShortDate(booking.checkOut)}
              </div>
              <div className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                {formatDateTime(booking.checkOut)}
              </div>
            </div>
          </div>
          <div className="text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>
            {formatNumber(nights)} {en ? "nights" : "ليلة"} •{" "}
            {formatNumber(booking.rooms)} {en ? "rooms" : "غرفة"} •{" "}
            {formatNumber(booking.guests)} {en ? "guests" : "ضيف"}
          </div>
        </DaylightPanel>

        {/* KPIs */}
        <DaylightKpiGrid>
          <DaylightKpi label={en ? "Booking revenue" : "إيراد الحجز"} value={formatMoney(booking.revenue)} />
          <DaylightKpi label={en ? "Revenue per night" : "إيراد لكل ليلة"} value={formatMoney(perNight)} />
          <DaylightKpi
            label={en ? "Actual ADR / room" : "ADR فعلي / غرفة"}
            value={formatMoney(perRoomNight)}
            hint={en ? `vs ${formatMoney(booking.hotel.baselineADR)} baseline` : `بمقارنة ${formatMoney(booking.hotel.baselineADR)} مرجعي`}
          />
          <DaylightKpi label={en ? "Status" : "الحالة"} value={booking.status} />
        </DaylightKpiGrid>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            {/* Notes */}
            {booking.notes ? (
              <DaylightPanel title={en ? "Booking notes" : "ملاحظات الحجز"}>
                <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                  {booking.notes}
                </p>
              </DaylightPanel>
            ) : null}

            {/* Other bookings for the guest */}
            {otherBookingsForGuest.length > 0 ? (
              <DaylightPanel title={en ? "Other bookings for this guest" : "حجوزات أخرى للضيف"}>
                <ul className="divide-y divide-[var(--line)]">
                  {otherBookingsForGuest.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/hotels/bookings/${b.id}`} className="min-w-0 flex-1 hover:underline">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {b.reference}
                          </span>
                          <StatusBadge status={b.status} />
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                          {en ? (b.hotel.nameEn ?? b.hotel.name) : b.hotel.name} •{" "}
                          {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)}
                        </div>
                      </Link>
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--ink)" }}>
                        {formatMoney(b.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </DaylightPanel>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Hotel card */}
            <DaylightPanel
              title={
                <span className="flex items-center gap-2">
                  <HotelIcon className="h-4 w-4" style={{ color: "var(--gold)" }} />
                  {en ? "Property" : "العقار"}
                </span>
              }
            >
              <Link href={`/hotels/${booking.hotel.id}`} className="block rounded-xl p-2 transition hover:bg-[var(--cream)]">
                <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {en ? (booking.hotel.nameEn ?? booking.hotel.name) : booking.hotel.name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                  {booking.hotel.city} •{" "}
                  {(en ? COUNTRY_NAMES_EN : COUNTRY_NAMES)[booking.hotel.country] ?? booking.hotel.country}{" "}
                  • {loc(TIERS_AR, TIERS_EN, getLocale(), booking.hotel.tier)} •{" "}
                  {"★".repeat(booking.hotel.starRating)}
                </div>
              </Link>
            </DaylightPanel>

            {/* Quick facts */}
            <DaylightPanel title={en ? "Summary" : "البطاقة"}>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Reference" : "المرجع"} value={booking.reference} mono />
                <Fact label={en ? "Guest" : "الضيف"} value={booking.guestName} />
                <Fact label={en ? "Room type" : "نوع الغرفة"} value={loc(ROOM_TYPES_AR, ROOM_TYPES_EN, getLocale(), booking.roomType)} />
                <Fact label={en ? "Rooms" : "الغرف"} value={formatNumber(booking.rooms)} />
                <Fact label={en ? "Guests" : "الضيوف"} value={formatNumber(booking.guests)} />
                <Fact label={en ? "Nights" : "الليالي"} value={formatNumber(nights)} />
                <Fact label={en ? "Revenue" : "الإيراد"} value={formatMoney(booking.revenue)} />
                <Fact label={en ? "Check-in" : "وصول"} value={formatShortDate(booking.checkIn)} />
                <Fact label={en ? "Check-out" : "مغادرة"} value={formatShortDate(booking.checkOut)} />
              </dl>
            </DaylightPanel>
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
    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd
        className={`text-end font-bold ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--ink)" }}
      >
        {link ? (
          <Link href={link} className="hover:underline" style={{ color: "var(--gold)" }}>
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
