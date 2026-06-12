import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { formatNumber, formatMoney } from "@/lib/utils/utils";
import type { HospitalityOpsData } from "../data";

export function HospitalityOps({ ar, data }: { ar: boolean; data: HospitalityOpsData }) {
  const {
    hotels,
    now,
    DAY,
    occByHotel,
    occupancyPct,
    adr,
    revpar,
    roomMix,
    mixTotal,
    upcoming,
  } = data;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات — الضيافة" : "Operations — Hospitality"}
        title={ar ? "لوحة الإشغال" : "Occupancy board"}
        subtitle={ar ? "الإشغال الحالي لكل فندق" : "Live occupancy per property"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "الفنادق" : "Hotels"} value={formatNumber(hotels.length)} />
        <DaylightKpi label={ar ? "الإشغال" : "Occupancy"} value={`${occupancyPct}%`} />
        <DaylightKpi label={ar ? "متوسط السعر ADR" : "ADR"} value={formatMoney(adr)} />
        <DaylightKpi label={ar ? "RevPAR" : "RevPAR"} value={formatMoney(revpar)} />
      </DaylightKpiGrid>

      {/* Occupancy by property */}
      <DaylightPanel title={ar ? "لوحة الإشغال" : "Occupancy board"} aside={ar ? "الإشغال الحالي لكل فندق" : "Live occupancy per property"}>
        <ul className="ws-dest">
          {occByHotel.map((o) => (
            <li key={o.hotel.id} className="ws-dest-row">
              <div className="ws-dest-head">
                <span className="ws-dest-name">
                  {ar ? o.hotel.name : o.hotel.nameEn ?? o.hotel.name}
                  <span className="ws-mono" style={{ color: "var(--ink-muted)", fontWeight: 400 }}>
                    {"  "}· {o.hotel.city} · {o.hotel.starRating}★
                  </span>
                </span>
                <span className="ws-mono ws-dest-pct">{o.pct}%</span>
              </div>
              <div className="ws-dest-bar">
                <span
                  className="ws-dest-fill"
                  style={{
                    width: `${o.pct}%`,
                    background:
                      o.pct >= 75
                        ? "var(--emerald)"
                        : o.pct >= 50
                          ? "var(--gold)"
                          : "var(--brick)",
                  }}
                />
              </div>
              <div className="ws-dest-n ws-mono">
                {formatNumber(o.occRooms)}/{formatNumber(o.hotel.totalRooms)}{" "}
                {ar ? "غرفة" : "rooms"} · {formatNumber(o.activeBookings)}{" "}
                {ar ? "حجز نشط" : "active"}
              </div>
            </li>
          ))}
        </ul>
      </DaylightPanel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DaylightPanel title={ar ? "مزيج الحجوزات" : "Booking mix"} aside={ar ? "تركيبة أنواع الغرف" : "Room-type mix"}>
          <ul className="ws-dest">
            {roomMix.map((m) => {
              const pct = Math.round((m.n / mixTotal) * 100);
              return (
                <li key={m.type} className="ws-dest-row">
                  <div className="ws-dest-head">
                    <span className="ws-dest-name">{m.type}</span>
                    <span className="ws-mono ws-dest-pct">{pct}%</span>
                  </div>
                  <div className="ws-dest-bar">
                    <span className="ws-dest-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="ws-dest-n ws-mono">
                    {formatNumber(m.n)} {ar ? "حجز" : "bookings"}
                  </div>
                </li>
              );
            })}
          </ul>
        </DaylightPanel>

        <DaylightPanel title={ar ? "وصولات قادمة" : "Arrival pace"} aside={ar ? "أقرب ١٤ يوماً" : "Next 14 days"}>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
              {ar ? "لا وصولات مجدولة قريباً." : "No arrivals scheduled soon."}
            </p>
          ) : (
            <ul className="ws-list">
              {upcoming.slice(0, 12).map((b) => {
                const din = Math.round(
                  (new Date(b.checkIn).getTime() - now) / DAY,
                );
                const h = hotels.find((x) => x.id === b.hotelId);
                return (
                  <li key={b.id} className="ws-list-row">
                    <div className="ws-list-main">
                      <div className="ws-list-title">{b.guestName}</div>
                      <div className="ws-list-sub ws-mono">
                        {h ? (ar ? h.name : h.nameEn ?? h.name) : ""} ·{" "}
                        {b.roomType} · {formatNumber(b.rooms)}{" "}
                        {ar ? "غرفة" : "rm"}
                      </div>
                    </div>
                    <span className={`tag ${din <= 2 ? "gold" : "ok"}`}>
                      {din === 0
                        ? ar ? "اليوم" : "today"
                        : ar
                          ? `${din} يوم`
                          : `${din}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DaylightPanel>
      </div>
    </DaylightShell>
  );
}
