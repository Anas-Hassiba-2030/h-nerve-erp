import Link from "next/link";
import {
  Hotel as HotelIcon, Plus, Star, MapPin, BedDouble, TrendingUp,
  Calendar, CircleDollarSign, Download, Filter, Users2, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer, PageSection } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { ExportMenu } from "@/components/ExportMenu";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { Sparkline } from "@/components/Sparkline";
import { HeatMap, HeatMapLegend, type HeatMapCell } from "@/components/charts/HeatMap";
import { prisma } from "@/lib/db";
import {
  formatMoney, formatNumber, formatPercent, formatShortDate,
  ROOM_TYPES_AR, ROOM_TYPES_EN, TIERS_AR, TIERS_EN, loc,
} from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { deleteHotel, deleteBooking } from "./actions";

export const dynamic = "force-dynamic";

const COUNTRY_NAMES_AR: Record<string, string> = { JO: "الأردن", BG: "بلغاريا" };
const COUNTRY_NAMES_EN: Record<string, string> = { JO: "Jordan", BG: "Bulgaria" };

export default async function HotelsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const hotels = await prisma.hotel.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      company: true,
      _count: { select: { bookings: true } },
      bookings: {
        where: { checkIn: { gte: last30 } },
        select: { revenue: true, status: true, rooms: true, checkIn: true },
      },
    },
  });

  // Recent-bookings table is scoped to THIS page's hotels. Booking is
  // tenant-scoped (tenantId) while Hotel is workspace-scoped (companyId) —
  // querying bookings independently let a tenant-mismatched workspace list
  // bookings for hotels it can't see. Tying the table to `hotels` ids keeps
  // it consistent with the property list (empty hotels → empty table).
  const recentBookings = await prisma.booking.findMany({
    where: { hotelId: { in: hotels.map((h) => h.id) } },
    orderBy: { checkIn: "desc" },
    take: 12,
    include: { hotel: true },
  });

  // === Single-source KPIs ===
  // Every headline number is derived from `hotels` (+ their included last-30d
  // bookings), NOT from independent booking/room aggregates. That was the
  // data-inconsistency bug: a workspace with zero hotels still showed revenue
  // and active bookings because those aggregates read the tenant axis, not the
  // company axis. One source → the counts always agree with the list below.
  const allHotelBookings = hotels.flatMap((h) => h.bookings);
  const totalRooms = hotels.reduce((a, h) => a + h.totalRooms, 0);
  const revenue30 = allHotelBookings.reduce((a, b) => a + b.revenue, 0);
  const occupiedRooms = hotels.reduce(
    (a, h) =>
      a +
      h.bookings
        .filter((b) => b.status === "CONFIRMED" || b.status === "CHECKED_IN")
        .reduce((s, b) => s + b.rooms, 0),
    0,
  );
  const occ = totalRooms ? Math.min(occupiedRooms / totalRooms, 1) : 0;
  // ADR (average daily rate) across last 30 days — same booking set.
  const adr30 = allHotelBookings.length > 0 ? revenue30 / allHotelBookings.length : 0;

  // 7-day per-day revenue trend per hotel (sparkline)
  const buildTrend = (bookings: { checkIn: Date; revenue: number }[]) => {
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      arr.push(
        bookings
          .filter((b) => b.checkIn >= day && b.checkIn < next)
          .reduce((a, b) => a + b.revenue, 0)
      );
    }
    return arr;
  };

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الضيافة والفنادق" : "Hospitality"}
        title={ar ? "أرينا سبيس — شبكة الفنادق" : "Arena Space — Hotel network"}
        subtitle={ar
          ? "إشغال حي، حجوزات وشيكة، وأداء كل عقار في الأردن وبلغاريا."
          : "Live occupancy, upcoming bookings, per-property performance."}
      />

      <PageContainer>
        {/* Action rail */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "آخر 30 يوماً" : "Last 30 days"}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/hotels/bookings/new" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "حجز جديد" : "New booking"}
            </Link>
            <Link href="/hotels/new" className="heri-btn heri-btn-secondary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "فندق جديد" : "New hotel"}
            </Link>
            <ExportMenu type="hotels" companyCode="ARENA" locale={lc} />
          </div>
        </div>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "عقارات نشطة" : "Active properties"}
            raw={hotels.length}
            kind="number"
            hint={`${hotels.filter((h) => h.country === "JO").length} ${ar ? "أردن" : "JO"} · ${hotels.filter((h) => h.country === "BG").length} ${ar ? "بلغاريا" : "BG"}`}
          />
          <HeriKpi
            label={ar ? "إجمالي الغرف" : "Total rooms"}
            raw={totalRooms}
            kind="number"
            hint={`${formatNumber(occupiedRooms)} ${ar ? "غرفة محجوزة" : "occupied"}`}
          />
          <HeriKpi
            label={ar ? "نسبة الإشغال" : "Occupancy"}
            raw={occ}
            kind="percent"
            accent={occ >= 0.6 ? "var(--heri-teal, #1f4e4a)" : undefined}
            hint={occ >= 0.6 ? (ar ? "أداء ممتاز" : "Excellent") : (ar ? "هامش للنمو" : "Room to grow")}
          />
          <HeriKpi
            label={ar ? "إيرادات 30 يوم" : "Revenue 30d"}
            raw={revenue30}
            kind="money"
            hint={`${ar ? "متوسط/حجز" : "Avg/booking"} ${formatMoney(adr30)}`}
          />
        </section>

        {/* Booking heat map — rooms occupied per hotel × day, last 14 days */}
        {hotels.length > 0 ? (() => {
          const heatDays: Array<{ key: string; label: string; date: Date }> = [];
          for (let i = 13; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            d.setHours(0, 0, 0, 0);
            heatDays.push({
              key: d.toISOString().slice(0, 10),
              label: new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { day: "numeric" }).format(d),
              date: d,
            });
          }
          const heatRows = hotels.map((h) => ({ key: h.id, label: ar ? h.name : (h.nameEn ?? h.name) }));
          const heatCells: HeatMapCell[] = [];
          for (const h of hotels) {
            for (const day of heatDays) {
              const next = new Date(day.date.getTime() + 24 * 60 * 60 * 1000);
              const occRooms = h.bookings.filter((b) => {
                const ci = new Date(b.checkIn);
                return ci >= day.date && ci < next;
              }).reduce((a, b) => a + b.rooms, 0);
              heatCells.push({
                rowKey: h.id,
                colKey: day.key,
                value: occRooms,
                label: `${h.name} · ${day.label}: ${occRooms} ${ar ? "غرفة" : "rooms"}`,
              });
            }
          }
          const heatMax = Math.max(0, ...heatCells.map((c) => c.value));

          return (
            <PageSection
              title={ar ? "كثافة الحجوزات" : "Booking density"}
              description={ar ? "خريطة حرارية: غرف محجوزة لكل فندق × يوم — آخر 14 يوم" : "Heat map: rooms booked per hotel × day — last 14 days"}
            >
              <div className="card card-pad">
                <HeatMap
                  rows={heatRows}
                  cols={heatDays.map((d) => ({ key: d.key, label: d.label }))}
                  cells={heatCells}
                  cellSize={26}
                  rowLabelWidth={140}
                  formatValue={(v) => v.toString()}
                  locale={ar ? "ar" : "en"}
                />
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <HeatMapLegend min={0} max={heatMax} ar={ar} />
                </div>
              </div>
            </PageSection>
          );
        })() : null}

        {/* Hotel grid */}
        <PageSection
          title={ar ? "العقارات" : "Properties"}
          description={ar ? "أداء كل عقار في آخر 7 أيام" : "Per-property performance, last 7 days"}
        >
          {hotels.length === 0 ? (
            <EmptyState
              icon={HotelIcon}
              title={ar ? "لا توجد فنادق مسجلة" : "No hotels yet"}
              action={
                <Link href="/hotels/new" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  {ar ? "أضف أول فندق" : "Add first hotel"}
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 heri-stagger lg:grid-cols-2">
              {hotels.map((h) => {
                const hotelRevenue = h.bookings.reduce((acc, b) => acc + b.revenue, 0);
                const occRoomsHere = h.bookings.filter(
                  (b) => b.status === "CONFIRMED" || b.status === "CHECKED_IN"
                ).reduce((acc, b) => acc + b.rooms, 0);
                const occHere = h.totalRooms ? Math.min(occRoomsHere / h.totalRooms, 1) : 0;
                const trend = buildTrend(h.bookings);
                return (
                  <div key={h.id} className="card card-hover card-pad">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold" style={{ color: "var(--heri-ink)" }}>
                            {h.name}
                          </h3>
                          <span className="badge-amber">{loc(TIERS_AR, TIERS_EN, lc, h.tier)}</span>
                          <span className="inline-flex items-center gap-0.5 text-amber-500" title={`${h.starRating} stars`}>
                            {[...Array(h.starRating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-500" />
                            ))}
                          </span>
                        </div>
                        {h.nameEn ? (
                          <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }} dir="ltr">
                            {h.nameEn}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: "var(--heri-ink-3)" }}>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {h.city} · {(ar ? COUNTRY_NAMES_AR : COUNTRY_NAMES_EN)[h.country] ?? h.country}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <BedDouble className="h-3.5 w-3.5" />
                            {formatNumber(h.totalRooms)} {ar ? "غرفة" : "rooms"}
                          </span>
                        </div>
                      </div>
                      <DeleteButton
                        action={deleteHotel}
                        payload={{ id: h.id }}
                        label={ar ? `حذف ${h.name}؟` : `Delete ${h.name}?`}
                        description={ar ? "سيتم حذف الفندق وكل الحجوزات المرتبطة." : "The hotel and all bookings will be deleted."}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Stat label={ar ? "إشغال" : "Occupancy"} value={formatPercent(occHere, 0)} />
                      <Stat label={ar ? "إيراد 30ي" : "Revenue 30d"} value={formatMoney(hotelRevenue)} />
                      <Stat label={ar ? "سعر مرجعي" : "Baseline ADR"} value={formatMoney(h.baselineADR)} />
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-[10px]" style={{ color: "var(--heri-ink-3)" }}>
                        <span className="font-bold uppercase tracking-widest">{ar ? "إشغال حالي" : "Current occupancy"}</span>
                        <span className="font-mono">{Math.round(occHere * 100)}%</span>
                      </div>
                      <div className="bar"><div className="bar-fill" style={{ width: `${occHere * 100}%` }} /></div>
                    </div>

                    {trend.some((v) => v > 0) ? (
                      <div className="mt-3 -mx-1">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
                          {ar ? "إيرادات آخر 7 أيام" : "Last 7-day revenue"}
                        </div>
                        <Sparkline data={trend} width={420} height={48} positive />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </PageSection>

        {/* Recent bookings */}
        <PageSection
          title={ar ? "حجوزات حديثة" : "Recent bookings"}
          action={
            <Link href="/hotels/bookings/new" className="btn-secondary btn-sm">
              <Plus className="h-3.5 w-3.5" /> {ar ? "حجز جديد" : "New booking"}
            </Link>
          }
        >
          {recentBookings.length === 0 ? (
            <EmptyState icon={Calendar} title={ar ? "لا توجد حجوزات بعد" : "No bookings yet"} />
          ) : (
            <div className="table-wrap table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{ar ? "المرجع" : "Reference"}</th>
                    <th>{ar ? "الضيف" : "Guest"}</th>
                    <th>{ar ? "الفندق" : "Hotel"}</th>
                    <th>{ar ? "النوع" : "Type"}</th>
                    <th>{ar ? "وصول" : "Check-in"}</th>
                    <th>{ar ? "مغادرة" : "Check-out"}</th>
                    <th>{ar ? "غرف" : "Rooms"}</th>
                    <th>{ar ? "إيراد" : "Revenue"}</th>
                    <th>{ar ? "الحالة" : "Status"}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-[11px] text-slate-500">{b.reference}</td>
                      <td className="font-semibold" style={{ color: "var(--heri-ink)" }}>{b.guestName}</td>
                      <td>{b.hotel.name}</td>
                      <td>{loc(ROOM_TYPES_AR, ROOM_TYPES_EN, lc, b.roomType)}</td>
                      <td className="text-[11px] tabular-nums">{formatShortDate(b.checkIn, lc)}</td>
                      <td className="text-[11px] tabular-nums">{formatShortDate(b.checkOut, lc)}</td>
                      <td className="tabular-nums">{formatNumber(b.rooms)}</td>
                      <td className="font-mono text-[11px] tabular-nums">{formatMoney(b.revenue)}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <DeleteButton
                          action={deleteBooking}
                          payload={{ id: b.id }}
                          label={ar ? `حذف الحجز ${b.reference}؟` : `Delete booking ${b.reference}?`}
                          description={ar ? "سيتم حذف هذا الحجز نهائياً." : "This booking will be permanently deleted."}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      </PageContainer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums" style={{ color: "var(--heri-ink)" }}>
        {value}
      </div>
    </div>
  );
}

