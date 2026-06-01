import Link from "next/link";
import { Hotel as HotelIcon, Plus, Star, MapPin, BedDouble, Calendar } from "lucide-react";
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
import "../daylight.css";

export const dynamic = "force-dynamic";

const COUNTRY_NAMES_AR: Record<string, string> = { JO: "الأردن", BG: "بلغاريا" };
const COUNTRY_NAMES_EN: Record<string, string> = { JO: "Jordan", BG: "Bulgaria" };

export default async function HotelsPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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

  const recentBookings = await prisma.booking.findMany({
    where: { hotelId: { in: hotels.map((h) => h.id) } },
    orderBy: { checkIn: "desc" },
    take: 12,
    include: { hotel: true },
  });

  // === Single-source KPIs (unchanged) — every number derives from `hotels`. ===
  const allHotelBookings = hotels.flatMap((h) => h.bookings);
  const totalRooms = hotels.reduce((a, h) => a + h.totalRooms, 0);
  const revenue30 = allHotelBookings.reduce((a, b) => a + b.revenue, 0);
  const occupiedRooms = hotels.reduce(
    (a, h) =>
      a + h.bookings
        .filter((b) => b.status === "CONFIRMED" || b.status === "CHECKED_IN")
        .reduce((s, b) => s + b.rooms, 0),
    0,
  );
  const occ = totalRooms ? Math.min(occupiedRooms / totalRooms, 1) : 0;
  const adr30 = allHotelBookings.length > 0 ? revenue30 / allHotelBookings.length : 0;
  const joCount = hotels.filter((h) => h.country === "JO").length;
  const bgCount = hotels.filter((h) => h.country === "BG").length;

  const buildTrend = (bookings: { checkIn: Date; revenue: number }[]) => {
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      arr.push(bookings.filter((b) => b.checkIn >= day && b.checkIn < next).reduce((a, b) => a + b.revenue, 0));
    }
    return arr;
  };

  // heat map data
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
  const heatCells: HeatMapCell[] = [];
  for (const h of hotels) {
    for (const day of heatDays) {
      const next = new Date(day.date.getTime() + 24 * 60 * 60 * 1000);
      const occRooms = h.bookings
        .filter((b) => { const ci = new Date(b.checkIn); return ci >= day.date && ci < next; })
        .reduce((a, b) => a + b.rooms, 0);
      heatCells.push({ rowKey: h.id, colKey: day.key, value: occRooms, label: `${h.name} · ${day.label}: ${occRooms}` });
    }
  }
  const heatMax = Math.max(0, ...heatCells.map((c) => c.value));

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "القطاعات · الضيافة" : "Sectors · Hospitality"}</div>
          <h1 className="sec-title">{ar ? "أرينا سبيس للضيافة" : "Arena Space Hospitality"}</h1>
          <p className="sec-sub">
            {ar
              ? "إشغال حي، حجوزات وشيكة، وأداء كل عقار في الأردن وبلغاريا — آخر ثلاثين يوماً."
              : "Live occupancy, upcoming bookings, and per-property performance across Jordan & Bulgaria — last 30 days."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · محدّث الآن" : "Live · updated now"}</span>
          <div className="sec-actions">
            <Link href="/hotels/bookings/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "حجز جديد" : "New booking"}</Link>
            <Link href="/hotels/new" className="dl-btn dl-btn-secondary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "فندق جديد" : "New hotel"}</Link>
            <ExportMenu type="hotels" companyCode="ARENA" locale={lc} />
          </div>
        </div>
      </header>

      {/* ── KPI band ── */}
      <section className="kpi-grid">
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "عقارات نشطة" : "Active properties"}</div>
          <div className="kpi-val">{formatNumber(hotels.length)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{`${joCount} ${ar ? "أردن" : "JO"} · ${bgCount} ${ar ? "بلغاريا" : "BG"}`}</span></div>
        </div>
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "إجمالي الغرف" : "Total rooms"}</div>
          <div className="kpi-val">{formatNumber(totalRooms)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{`${formatNumber(occupiedRooms)} ${ar ? "محجوزة" : "occupied"}`}</span></div>
        </div>
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "نسبة الإشغال" : "Occupancy"}</div>
          <div className="kpi-val">{formatPercent(occ, 0)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{occ >= 0.6 ? (ar ? "أداء ممتاز" : "Excellent") : (ar ? "هامش للنمو" : "Room to grow")}</span>
            <span className={`delta ${occ >= 0.6 ? "up" : "down"}`}>{occ >= 0.6 ? "▲" : "▾"} {formatPercent(occ, 0)}</span>
          </div>
        </div>
        <div className="kpi-card reveal">
          <div className="kpi-label">{ar ? "إيرادات ٣٠ يوم" : "Revenue 30d"}</div>
          <div className="kpi-val">{formatMoney(revenue30)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{`${ar ? "متوسط/حجز" : "Avg/booking"} ${formatMoney(adr30)}`}</span></div>
        </div>
      </section>

      {/* ── booking density heat map ── */}
      {hotels.length > 0 ? (
        <div className="panel reveal">
          <div className="panel-head">
            <div className="panel-title">{ar ? "كثافة الحجوزات" : "Booking density"}</div>
            <span className="panel-aside">{ar ? "غرف محجوزة لكل فندق × يوم — آخر ١٤ يوم" : "Rooms booked per hotel × day — last 14 days"}</span>
          </div>
          <HeatMap
            rows={hotels.map((h) => ({ key: h.id, label: ar ? h.name : (h.nameEn ?? h.name) }))}
            cols={heatDays.map((d) => ({ key: d.key, label: d.label }))}
            cells={heatCells}
            cellSize={26}
            rowLabelWidth={140}
            formatValue={(v) => v.toString()}
            locale={ar ? "ar" : "en"}
          />
          <div className="mt-3 flex items-center justify-between text-[11px]"><HeatMapLegend min={0} max={heatMax} ar={ar} /></div>
        </div>
      ) : null}

      {/* ── properties ── */}
      <div className="panel reveal">
        <div className="panel-head">
          <div className="panel-title">{ar ? "العقارات" : "Properties"}</div>
          <span className="panel-aside">{ar ? "أداء كل عقار في آخر ٧ أيام" : "Per-property performance, last 7 days"}</span>
        </div>
        {hotels.length === 0 ? (
          <EmptyState
            icon={HotelIcon}
            title={ar ? "لا توجد فنادق مسجلة" : "No hotels yet"}
            action={<Link href="/hotels/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" />{ar ? "أضف أول فندق" : "Add first hotel"}</Link>}
          />
        ) : (
          <div className="prop-grid">
            {hotels.map((h) => {
              const hotelRevenue = h.bookings.reduce((acc, b) => acc + b.revenue, 0);
              const occRoomsHere = h.bookings.filter((b) => b.status === "CONFIRMED" || b.status === "CHECKED_IN").reduce((acc, b) => acc + b.rooms, 0);
              const occHere = h.totalRooms ? Math.min(occRoomsHere / h.totalRooms, 1) : 0;
              const trend = buildTrend(h.bookings);
              return (
                <div key={h.id} className="prop-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{ar ? h.name : (h.nameEn ?? h.name)}</h3>
                        <span className="tag gold">{loc(TIERS_AR, TIERS_EN, lc, h.tier)}</span>
                        <span className="inline-flex items-center gap-0.5" style={{ color: "var(--gold)" }} title={`${h.starRating} stars`}>
                          {[...Array(h.starRating)].map((_, i) => (<Star key={i} className="h-3 w-3" style={{ fill: "var(--gold)" }} />))}
                        </span>
                      </div>
                      {h.nameEn ? <div style={{ fontSize: 11, color: "var(--ink-muted)" }} dir={ar ? "ltr" : "rtl"}>{ar ? h.nameEn : h.name}</div> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{h.city} · {(ar ? COUNTRY_NAMES_AR : COUNTRY_NAMES_EN)[h.country] ?? h.country}</span>
                        <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{formatNumber(h.totalRooms)} {ar ? "غرفة" : "rooms"}</span>
                      </div>
                    </div>
                    <DeleteButton action={deleteHotel} payload={{ id: h.id }} label={ar ? `حذف ${h.name}؟` : `Delete ${h.name}?`} description={ar ? "سيتم حذف الفندق وكل الحجوزات المرتبطة." : "The hotel and all bookings will be deleted."} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <PropStat label={ar ? "إشغال" : "Occupancy"} value={formatPercent(occHere, 0)} />
                    <PropStat label={ar ? "إيراد ٣٠ي" : "Revenue 30d"} value={formatMoney(hotelRevenue)} />
                    <PropStat label={ar ? "سعر مرجعي" : "Baseline ADR"} value={formatMoney(h.baselineADR)} />
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                      <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>{ar ? "إشغال حالي" : "Current occupancy"}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(occHere * 100)}%</span>
                    </div>
                    <div className="dl-bar"><i style={{ width: `${occHere * 100}%` }} /></div>
                  </div>
                  {trend.some((v) => v > 0) ? (
                    <div className="mt-3 -mx-1">
                      <div className="mb-1" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{ar ? "إيرادات آخر ٧ أيام" : "Last 7-day revenue"}</div>
                      <Sparkline data={trend} width={420} height={48} positive />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── recent bookings ── */}
      <div className="panel reveal">
        <div className="panel-head">
          <div className="panel-title">{ar ? "حجوزات حديثة" : "Recent bookings"}</div>
          <Link href="/hotels/bookings/new" className="dl-btn dl-btn-secondary" style={{ padding: "7px 14px" }}><Plus className="h-3.5 w-3.5" /> {ar ? "حجز جديد" : "New booking"}</Link>
        </div>
        {recentBookings.length === 0 ? (
          <EmptyState icon={Calendar} title={ar ? "لا توجد حجوزات بعد" : "No bookings yet"} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>{ar ? "المرجع" : "Reference"}</th>
                  <th>{ar ? "الضيف" : "Guest"}</th>
                  <th>{ar ? "الفندق" : "Hotel"}</th>
                  <th>{ar ? "النوع" : "Type"}</th>
                  <th>{ar ? "وصول" : "Check-in"}</th>
                  <th>{ar ? "مغادرة" : "Check-out"}</th>
                  <th className="num">{ar ? "غرف" : "Rooms"}</th>
                  <th className="num">{ar ? "إيراد" : "Revenue"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink-muted)" }}>{b.reference}</td>
                    <td style={{ fontWeight: 700, color: "var(--ink)" }}>{b.guestName}</td>
                    <td>{ar ? b.hotel.name : (b.hotel.nameEn ?? b.hotel.name)}</td>
                    <td>{loc(ROOM_TYPES_AR, ROOM_TYPES_EN, lc, b.roomType)}</td>
                    <td style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{formatShortDate(b.checkIn, lc)}</td>
                    <td style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{formatShortDate(b.checkOut, lc)}</td>
                    <td className="num">{formatNumber(b.rooms)}</td>
                    <td className="num" style={{ fontFamily: "monospace", fontSize: 11 }}>{formatMoney(b.revenue)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td><DeleteButton action={deleteBooking} payload={{ id: b.id }} label={ar ? `حذف الحجز ${b.reference}؟` : `Delete booking ${b.reference}?`} description={ar ? "سيتم حذف هذا الحجز نهائياً." : "This booking will be permanently deleted."} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PropStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
