import Link from "next/link";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { DaylightShell } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import {
  formatMoney, formatNumber, formatPercent, formatShortDate,
} from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { deleteHotel, deleteBooking, setBookingStatus } from "./actions";
import { ArenaTabs } from "./ArenaTabs";
import { BookingStatusSelect } from "./BookingStatusSelect";
import "../daylight.css";
import "./arena.css";

export const dynamic = "force-dynamic";

const COUNTRY_NAMES_AR: Record<string, string> = { JO: "الأردن", BG: "بلغاريا" };
const COUNTRY_NAMES_EN: Record<string, string> = { JO: "Jordan", BG: "Bulgaria" };

// Arena reference maps each hotel onto a strong / good / watch occupancy state.
// We derive it from real occupancy so the tag colours mean something.
function occState(occ: number): { tag: "ok" | "info" | "warn"; ar: string; en: string } {
  if (occ >= 0.75) return { tag: "ok", ar: "قوي", en: "Strong" };
  if (occ >= 0.65) return { tag: "info", ar: "جيد", en: "Good" };
  return { tag: "warn", ar: "مراقبة", en: "Watch" };
}

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
    take: 100,
  });

  const recentBookings = await prisma.booking.findMany({
    where: { hotelId: { in: hotels.map((h) => h.id) } },
    orderBy: { checkIn: "desc" },
    take: 12,
    include: { hotel: true },
  });

  // Revenue-vs-expenses bars: real monthly transactions for the hotel-owning
  // companies over the last 6 months (kind REVENUE / EXPENSE on Transaction).
  const companyIds = Array.from(new Set(hotels.map((h) => h.companyId)));
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyTx = companyIds.length
    ? await prisma.transaction.findMany({
        where: { companyId: { in: companyIds }, occurredAt: { gte: sixMonthsAgo } },
        select: { kind: true, amount: true, occurredAt: true },
        take: 2000,
      })
    : [];

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

  // ── monthly buckets for the bar chart ──
  const months: { label: string; rev: number; exp: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: new Intl.DateTimeFormat(ar ? "ar-JO" : "en-US", { month: "short" }).format(d),
      rev: 0,
      exp: 0,
    });
  }
  for (const t of monthlyTx) {
    const d = new Date(t.occurredAt);
    const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 5;
    if (idx >= 0 && idx < 6) {
      if (t.kind === "REVENUE") months[idx].rev += t.amount;
      else if (t.kind === "EXPENSE") months[idx].exp += t.amount;
    }
  }
  const barMax = Math.max(1, ...months.map((m) => m.rev + m.exp));
  const hasBarData = months.some((m) => m.rev > 0 || m.exp > 0);

  // Per-hotel rollups, reused by the overview table and the hotels tab.
  const hotelRows = hotels.map((h) => {
    const rev = h.bookings.reduce((a, b) => a + b.revenue, 0);
    const occRooms = h.bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "CHECKED_IN")
      .reduce((a, b) => a + b.rooms, 0);
    const o = h.totalRooms ? Math.min(occRooms / h.totalRooms, 1) : 0;
    return { h, rev, occ: o, state: occState(o) };
  });
  const topHotels = [...hotelRows].sort((a, b) => b.occ - a.occ).slice(0, 5);

  // ── Overview panel ──
  const overview = (
    <>
      <div className="kpi-grid reveal reveal-stagger">
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "إيراد ٣٠ يوم" : "Revenue 30d"}</div>
          <div className="kpi-val">{formatMoney(revenue30)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{`${ar ? "متوسط/حجز" : "Avg/booking"} ${formatMoney(adr30)}`}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "الإشغال" : "Occupancy"}</div>
          <div className="kpi-val">{formatPercent(occ, 0)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{`${formatNumber(occupiedRooms)} / ${formatNumber(totalRooms)} ${ar ? "غرفة" : "rooms"}`}</span>
            <span className={`delta ${occ >= 0.6 ? "up" : "down"}`}>{occ >= 0.6 ? "▲" : "▾"} {formatPercent(occ, 0)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "متوسط سعر الغرفة" : "Avg room rate"}</div>
          <div className="kpi-val">{formatMoney(adr30)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? "لكل حجز · آخر ٣٠ي" : "Per booking · last 30d"}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "عقارات نشطة" : "Active properties"}</div>
          <div className="kpi-val">{formatNumber(hotels.length)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{`${joCount} ${ar ? "أردن" : "JO"} · ${bgCount} ${ar ? "بلغاريا" : "BG"}`}</span>
          </div>
        </div>
      </div>

      {hasBarData ? (
        <div className="panel reveal">
          <div className="panel-head">
            <span className="panel-title">{ar ? "الإيراد مقابل المصاريف" : "Revenue vs Expenses"}</span>
            {/* The chart is always the trailing-months view; the period
                toggle here had no handler and changed nothing, so it's
                removed rather than left as a dead control. */}
            <span className="panel-hint">{ar ? "آخر الأشهر" : "Trailing months"}</span>
          </div>
          <div className="bars">
            {months.map((m, i) => (
              <div className="bar-col" key={i}>
                <div className="bar-stack">
                  <div className="bar rev" style={{ height: `${Math.round((m.rev / barMax) * 100)}%` }} />
                  <div className="bar exp" style={{ height: `${Math.round((m.exp / barMax) * 100)}%` }} />
                </div>
                <span className="bar-x">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "الفنادق" : "Hotels"}</span>
          <span className="panel-aside">{`${formatNumber(hotels.length)} ${ar ? "منشآت · مرتبة حسب الإشغال" : "properties · ranked by occupancy"}`}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{ar ? "المنشأة" : "Facility"}</th>
              <th>{ar ? "المدينة" : "City"}</th>
              <th className="num">{ar ? "الغرف" : "Rooms"}</th>
              <th className="num">{ar ? "الإشغال" : "Occupancy"}</th>
              <th className="num">{ar ? "إيراد ٣٠ي" : "Rev 30d"}</th>
              <th>{ar ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {topHotels.map(({ h, rev, occ: o, state }) => (
              <tr key={h.id}>
                <td>{ar ? h.name : (h.nameEn ?? h.name)}</td>
                <td>{h.city}</td>
                <td className="num">{formatNumber(h.totalRooms)}</td>
                <td className="num">{formatPercent(o, 0)}</td>
                <td className="num">{formatMoney(rev)}</td>
                <td><span className={`tag ${state.tag}`}>{ar ? state.ar : state.en}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  // ── Hotels tab (full list + delete) ──
  const hotelsPanel = (
    <div className="panel reveal">
      <div className="panel-head">
        <span className="panel-title">{ar ? "الفنادق" : "Hotels"}</span>
        <Link href="/hotels/new" className="dl-btn dl-btn-primary">＋ {ar ? "فندق جديد" : "New hotel"}</Link>
      </div>
      <table>
        <thead>
          <tr>
            <th>{ar ? "المنشأة" : "Facility"}</th>
            <th>{ar ? "المدينة" : "City"}</th>
            <th className="num">{ar ? "الغرف" : "Rooms"}</th>
            <th className="num">{ar ? "الإشغال" : "Occupancy"}</th>
            <th className="num">{ar ? "إيراد ٣٠ي" : "Rev 30d"}</th>
            <th>{ar ? "الحالة" : "Status"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {hotelRows.map(({ h, rev, occ: o, state }) => (
            <tr key={h.id}>
              <td>
                <Link href={`/hotels/${h.id}`} style={{ fontWeight: 700, color: "var(--ink)" }}>
                  {ar ? h.name : (h.nameEn ?? h.name)}
                </Link>
              </td>
              <td>{h.city} · {(ar ? COUNTRY_NAMES_AR : COUNTRY_NAMES_EN)[h.country] ?? h.country}</td>
              <td className="num">{formatNumber(h.totalRooms)}</td>
              <td className="num">{formatPercent(o, 0)}</td>
              <td className="num">{formatMoney(rev)}</td>
              <td><span className={`tag ${state.tag}`}>{ar ? state.ar : state.en}</span></td>
              <td>
                <DeleteButton
                  action={deleteHotel}
                  payload={{ id: h.id }}
                  label={ar ? `حذف ${h.name}؟` : `Delete ${h.name}?`}
                  description={ar ? "سيتم حذف الفندق وكل الحجوزات المرتبطة." : "The hotel and all bookings will be deleted."}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Bookings tab ──
  const bookingsPanel = (
    <div className="panel reveal">
      <div className="panel-head">
        <span className="panel-title">{ar ? "الحجوزات" : "Bookings"}</span>
        <Link href="/hotels/bookings/new" className="dl-btn dl-btn-primary">＋ {ar ? "حجز جديد" : "New booking"}</Link>
      </div>
      <table>
        <thead>
          <tr>
            <th>{ar ? "المرجع" : "Reference"}</th>
            <th>{ar ? "الضيف" : "Guest"}</th>
            <th>{ar ? "الفندق" : "Hotel"}</th>
            <th className="num">{ar ? "وصول" : "Check-in"}</th>
            <th className="num">{ar ? "مغادرة" : "Check-out"}</th>
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
              <td className="num" style={{ fontSize: 12 }}>{formatShortDate(b.checkIn, lc)}</td>
              <td className="num" style={{ fontSize: 12 }}>{formatShortDate(b.checkOut, lc)}</td>
              <td className="num">{formatNumber(b.rooms)}</td>
              <td className="num">{formatMoney(b.revenue)}</td>
              <td><BookingStatusSelect id={b.id} status={b.status} ar={ar} action={setBookingStatus} /></td>
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
  );

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "القطاعات · الضيافة" : "Sectors · Hospitality"}</div>
          <h1 className="sec-title">{ar ? "أرينا سبيس للضيافة" : "Arena Space Hospitality"}</h1>
          <p className="sec-sub">
            {ar
              ? `${formatNumber(hotels.length)} فنادق · ${formatNumber(totalRooms)} غرفة · أداء الإشغال والإيراد لآخر ثلاثين يوماً عبر محفظة الضيافة.`
              : `${hotels.length} hotels · ${totalRooms} rooms · occupancy & revenue performance across the hospitality portfolio over the last 30 days.`}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · محدّث الآن" : "Live · updated now"}</span>
          <div className="sec-actions">
            <Link className="dl-btn dl-btn-secondary" href="/finance">{ar ? "الأثر المالي" : "Financial impact"}</Link>
            <ExportMenu type="hotels" companyCode="ARENA" locale={lc} />
          </div>
        </div>
      </div>

      <ArenaTabs
        tabs={[
          { id: "overview", label: ar ? "نظرة عامة" : "Overview" },
          { id: "hotels", label: ar ? "الفنادق" : "Hotels" },
          { id: "bookings", label: ar ? "الحجوزات" : "Bookings" },
        ]}
        panels={{ overview, hotels: hotelsPanel, bookings: bookingsPanel }}
      />
    </DaylightShell>
  );
}
