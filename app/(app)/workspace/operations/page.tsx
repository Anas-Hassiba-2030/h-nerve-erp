// /workspace/operations — the deep sector operations module.
//
// Flagship: Maha Dairy gets a full production board (status columns),
// QC pass-rate, expiry watch list, throughput. Other sectors get a
// respectable module of their own. Everything is auto-scoped to the
// active company.

import { redirect } from "next/navigation";
import {
  Milk, Hotel, Sprout, GraduationCap, AlertTriangle, ShieldCheck, Briefcase,
} from "lucide-react";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { StatusBadge } from "@/components/StatusBadge";
import { advanceBatchStatus } from "../actions";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkspaceOperationsPage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { sector: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";

  if (company.sector === "DAIRY") return <DairyOps ar={ar} />;
  if (company.sector === "HOSPITALITY") return <HospitalityOps ar={ar} />;
  if (company.sector === "AGRICULTURE") return <AgricultureOps ar={ar} />;
  if (company.sector === "EDUCATION") return <EducationOps ar={ar} />;
  return <HoldingOps ar={ar} />;
}

// ---------------------------------------------------------------------------
// DAIRY — flagship production board
// ---------------------------------------------------------------------------
async function DairyOps({ ar }: { ar: boolean }) {
  const batches = await prisma.dairyBatch.findMany({
    orderBy: { productionDate: "desc" },
    take: 400,
  });

  const now = Date.now();
  const DAY = 86_400_000;
  const totalLiters = batches.reduce((a, b) => a + (b.quantityLiters ?? 0), 0);
  const gradeA = batches.filter((b) => b.qualityGrade === "A").length;
  const gradeOk = batches.filter((b) =>
    ["A", "B"].includes(b.qualityGrade),
  ).length;
  const qcRate = batches.length
    ? Math.round((gradeOk / batches.length) * 100)
    : 0;

  const STATUS_ORDER = ["IN_PRODUCTION", "READY", "SHIPPED", "RETAIL", "EXPIRED"];
  const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
    IN_PRODUCTION: { ar: "قيد الإنتاج", en: "In production" },
    READY: { ar: "جاهز", en: "Ready" },
    SHIPPED: { ar: "مُرحّل", en: "Shipped" },
    RETAIL: { ar: "تجزئة", en: "Retail" },
    EXPIRED: { ar: "منتهي", en: "Expired" },
  };
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s] ?? { ar: s, en: s },
    items: batches.filter((b) => b.status === s),
  })).filter((c) => c.items.length > 0);

  // Expiry watch — batches within 5 days of expiry, not already expired
  const expiring = batches
    .filter((b) => {
      const dleft = (new Date(b.expiryDate).getTime() - now) / DAY;
      return dleft >= 0 && dleft <= 5 && b.status !== "RETAIL";
    })
    .sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );

  // Throughput — liters produced per month, last 6 months oldest→newest
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const tp = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now - i * 30 * DAY);
    tp.set(monthKey(d), 0);
  }
  for (const b of batches) {
    const k = monthKey(new Date(b.productionDate));
    if (tp.has(k)) tp.set(k, (tp.get(k) ?? 0) + (b.quantityLiters ?? 0));
  }
  const throughput = Array.from(tp.entries()).map(([k, v]) => ({
    label: k.slice(5),
    liters: Math.round(v),
  }));
  const tpMax = Math.max(1, ...throughput.map((t) => t.liters));

  // Destination split — where shipped/retail batches are routed
  const destAgg = new Map<string, number>();
  for (const b of batches) {
    const d = (b.destination ?? "").trim() || (ar ? "غير محدّد" : "Unassigned");
    destAgg.set(d, (destAgg.get(d) ?? 0) + 1);
  }
  const destinations = Array.from(destAgg.entries())
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);
  const destTotal = destinations.reduce((a, d) => a + d.n, 0) || 1;

  return (
    <div className="ws-page">
      <section className="ws-stat-row">
        <Kpi label={ar ? "إجمالي الدفعات" : "Total batches"} value={formatNumber(batches.length)} icon={<Milk className="h-3.5 w-3.5" />} />
        <Kpi label={ar ? "إجمالي اللترات" : "Total liters"} value={formatNumber(Math.round(totalLiters))} />
        <Kpi label={ar ? "نسبة اجتياز الجودة" : "QC pass rate"} value={`${qcRate}%`} accent={qcRate < 85} />
        <Kpi label={ar ? "قرب الانتهاء" : "Near expiry"} value={formatNumber(expiring.length)} accent={expiring.length > 0} />
      </section>

      {/* Production board */}
      <HeritageSection
        eyebrow={ar ? "خط الإنتاج لحظياً" : "Live production line"}
        title={ar ? "لوحة الإنتاج" : "Production board"}
      >
        <div className="ws-board">
          {byStatus.map((col) => (
            <div key={col.status} className="ws-board-col">
              <header className="ws-board-col-head">
                <span>{ar ? col.label.ar : col.label.en}</span>
                <span className="ws-board-col-count">{col.items.length}</span>
              </header>
              <div className="ws-board-col-body">
                {col.items.slice(0, 12).map((b) => {
                  const dleft = Math.round(
                    (new Date(b.expiryDate).getTime() - now) / DAY,
                  );
                  return (
                    <div key={b.id} className="ws-board-card">
                      <div className="ws-board-card-title">
                        {ar ? (b.productAr ?? b.product) : b.product}
                      </div>
                      <div className="ws-board-card-meta">
                        <span className="ws-mono">{b.batchNumber}</span>
                        <span className="ws-board-card-sep">·</span>
                        <span>{formatNumber(Math.round(b.quantityLiters))}{ar ? " ل" : " L"}</span>
                        <span className="ws-board-card-sep">·</span>
                        <span>{ar ? "درجة" : "Grade"} {b.qualityGrade}</span>
                      </div>
                      {b.status !== "EXPIRED" && b.status !== "RETAIL" ? (
                        <div
                          className="ws-board-card-expiry"
                          data-urgent={dleft <= 3 ? "true" : "false"}
                        >
                          {dleft < 0
                            ? ar ? "منتهٍ" : "expired"
                            : ar
                              ? `ينتهي خلال ${dleft} يوم`
                              : `expires in ${dleft}d`}
                        </div>
                      ) : null}
                      {["IN_PRODUCTION", "READY", "SHIPPED"].includes(
                        b.status,
                      ) ? (
                        <form action={advanceBatchStatus} className="ws-act-form">
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="ws-act">
                            {ar ? "تقديم" : "Advance"}
                            <span aria-hidden>{ar ? " ←" : " →"}</span>
                          </button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
                {col.items.length > 12 ? (
                  <div className="ws-board-more">
                    +{col.items.length - 12} {ar ? "أخرى" : "more"}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </HeritageSection>

      {/* Throughput + routing */}
      <div className="ws-two-col">
        <HeritageSection
          eyebrow={ar ? "اللترات شهرياً — ٦ أشهر" : "Liters per month — 6 mo"}
          title={ar ? "الإنتاجية" : "Throughput"}
        >
          <div className="ws-trend">
            {throughput.map((t) => (
              <div key={t.label} className="ws-trend-col">
                <div className="ws-trend-bar-wrap">
                  <span
                    className="ws-trend-bar"
                    style={{ height: `${Math.max(4, (t.liters / tpMax) * 100)}%` }}
                  />
                </div>
                <div className="ws-trend-val ws-mono">
                  {t.liters >= 1000
                    ? `${(t.liters / 1000).toFixed(1)}k`
                    : formatNumber(t.liters)}
                </div>
                <div className="ws-trend-label ws-mono">{t.label}</div>
              </div>
            ))}
          </div>
        </HeritageSection>

        <HeritageSection
          eyebrow={ar ? "أين تذهب الدفعات" : "Where batches route"}
          title={ar ? "توزيع الوجهات" : "Destination split"}
        >
          <ul className="ws-dest">
            {destinations.map((d) => {
              const pct = Math.round((d.n / destTotal) * 100);
              return (
                <li key={d.name} className="ws-dest-row">
                  <div className="ws-dest-head">
                    <span className="ws-dest-name">{d.name}</span>
                    <span className="ws-mono ws-dest-pct">{pct}%</span>
                  </div>
                  <div className="ws-dest-bar">
                    <span
                      className="ws-dest-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="ws-dest-n ws-mono">
                    {formatNumber(d.n)} {ar ? "دفعة" : "batches"}
                  </div>
                </li>
              );
            })}
          </ul>
        </HeritageSection>
      </div>

      {/* Expiry watch + QC */}
      <div className="ws-two-col">
        <HeritageSection
          eyebrow={ar ? "أولوية قصوى" : "Top priority"}
          title={ar ? "مراقبة الصلاحية" : "Expiry watch"}
        >
          {expiring.length === 0 ? (
            <Empty ar={ar} ok />
          ) : (
            <ul className="ws-list">
              {expiring.slice(0, 14).map((b) => {
                const dleft = Math.round(
                  (new Date(b.expiryDate).getTime() - now) / DAY,
                );
                return (
                  <li key={b.id} className="ws-list-row">
                    <span className="ws-list-icon" data-urgent={dleft <= 3 ? "true" : "false"}>
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </span>
                    <div className="ws-list-main">
                      <div className="ws-list-title">
                        {ar ? (b.productAr ?? b.product) : b.product}
                      </div>
                      <div className="ws-list-sub ws-mono">{b.batchNumber}</div>
                    </div>
                    <HeritagePill tone={dleft <= 3 ? "critical" : "warn"}>
                      {dleft <= 0
                        ? ar ? "اليوم" : "today"
                        : ar
                          ? `${dleft} يوم`
                          : `${dleft}d`}
                    </HeritagePill>
                  </li>
                );
              })}
            </ul>
          )}
        </HeritageSection>

        <HeritageSection
          eyebrow={ar ? "ضبط الجودة" : "Quality control"}
          title={ar ? "توزيع الدرجات" : "Grade distribution"}
        >
          <div className="ws-grade-grid">
            {["A", "B", "C", "D"].map((g) => {
              const n = batches.filter((b) => b.qualityGrade === g).length;
              const pct = batches.length
                ? Math.round((n / batches.length) * 100)
                : 0;
              return (
                <div key={g} className="ws-grade">
                  <div className="ws-grade-head">
                    <span className="ws-grade-letter">{ar ? "درجة " : "Grade "}{g}</span>
                    <span className="ws-grade-pct">{pct}%</span>
                  </div>
                  <div className="ws-grade-bar">
                    <span
                      className="ws-grade-fill"
                      data-grade={g}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="ws-grade-n">{formatNumber(n)} {ar ? "دفعة" : "batches"}</div>
                </div>
              );
            })}
          </div>
          <div className="ws-qc-summary">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.6} />
            <span>
              {ar
                ? `${gradeA} دفعة درجة A — ${qcRate}% ضمن مواصفة JS 1112`
                : `${gradeA} grade-A batches — ${qcRate}% within JS 1112 spec`}
            </span>
          </div>
        </HeritageSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HOSPITALITY
// ---------------------------------------------------------------------------
async function HospitalityOps({ ar }: { ar: boolean }) {
  // Hotels are workspace-scoped by the middleware. Bookings are not
  // (no companyId) — scope them via the hotel ids we just fetched.
  const hotels = await prisma.hotel.findMany({
    orderBy: { totalRooms: "desc" },
  });
  const hotelIds = hotels.map((h) => h.id);
  const bookings = hotelIds.length
    ? await prisma.booking.findMany({
        where: { hotelId: { in: hotelIds } },
        orderBy: { checkIn: "desc" },
        take: 600,
      })
    : [];

  const now = Date.now();
  const DAY = 86_400_000;
  const totalRooms = hotels.reduce((a, h) => a + (h.totalRooms ?? 0), 0);
  const live = (b: (typeof bookings)[number]) =>
    b.status !== "CANCELLED" &&
    new Date(b.checkIn).getTime() <= now &&
    new Date(b.checkOut).getTime() > now;

  // Per-hotel occupancy
  const occByHotel = hotels.map((h) => {
    const hb = bookings.filter((b) => b.hotelId === h.id && live(b));
    const occRooms = Math.min(
      h.totalRooms,
      hb.reduce((a, b) => a + (b.rooms ?? 1), 0),
    );
    return {
      hotel: h,
      occRooms,
      pct: h.totalRooms ? Math.round((occRooms / h.totalRooms) * 100) : 0,
      activeBookings: hb.length,
    };
  });
  const occupiedRooms = occByHotel.reduce((a, o) => a + o.occRooms, 0);
  const occupancyPct = totalRooms
    ? Math.round((occupiedRooms / totalRooms) * 100)
    : 0;

  // ADR from real booking revenue; RevPAR = occupancy × ADR
  const revenueBookings = bookings.filter((b) => b.status !== "CANCELLED");
  const adr =
    revenueBookings.length > 0
      ? Math.round(
          revenueBookings.reduce(
            (a, b) => a + (b.revenue ?? 0) / Math.max(1, b.rooms ?? 1),
            0,
          ) / revenueBookings.length,
        )
      : Math.round(
          hotels.reduce((a, h) => a + (h.baselineADR ?? 0), 0) /
            Math.max(1, hotels.length),
        );
  const revpar = Math.round((occupancyPct / 100) * adr);

  // Room-type mix
  const mix = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "CANCELLED") continue;
    mix.set(b.roomType, (mix.get(b.roomType) ?? 0) + 1);
  }
  const roomMix = Array.from(mix.entries())
    .map(([type, n]) => ({ type, n }))
    .sort((a, b) => b.n - a.n);
  const mixTotal = roomMix.reduce((a, m) => a + m.n, 0) || 1;

  // Upcoming check-ins (next 14 days)
  const upcoming = bookings
    .filter((b) => {
      const ci = new Date(b.checkIn).getTime();
      return b.status !== "CANCELLED" && ci >= now && ci - now <= 14 * DAY;
    })
    .sort((a, b) => +new Date(a.checkIn) - +new Date(b.checkIn));

  return (
    <div className="ws-page">
      <section className="ws-stat-row">
        <Kpi label={ar ? "الفنادق" : "Hotels"} value={formatNumber(hotels.length)} icon={<Hotel className="h-3.5 w-3.5" />} />
        <Kpi label={ar ? "الإشغال" : "Occupancy"} value={`${occupancyPct}%`} accent={occupancyPct < 60} />
        <Kpi label={ar ? "متوسط السعر ADR" : "ADR"} value={formatMoney(adr)} />
        <Kpi label={ar ? "RevPAR" : "RevPAR"} value={formatMoney(revpar)} />
      </section>

      {/* Occupancy by property */}
      <HeritageSection
        eyebrow={ar ? "الإشغال الحالي لكل فندق" : "Live occupancy per property"}
        title={ar ? "لوحة الإشغال" : "Occupancy board"}
      >
        <ul className="ws-dest">
          {occByHotel.map((o) => (
            <li key={o.hotel.id} className="ws-dest-row">
              <div className="ws-dest-head">
                <span className="ws-dest-name">
                  {ar ? o.hotel.name : o.hotel.nameEn ?? o.hotel.name}
                  <span className="ws-mono" style={{ color: "var(--heri-ink-3)", fontWeight: 400 }}>
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
                        ? "var(--heri-teal)"
                        : o.pct >= 50
                          ? "var(--heri-copper)"
                          : "var(--heri-terracotta)",
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
      </HeritageSection>

      <div className="ws-two-col">
        <HeritageSection
          eyebrow={ar ? "تركيبة أنواع الغرف" : "Room-type mix"}
          title={ar ? "مزيج الحجوزات" : "Booking mix"}
        >
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
        </HeritageSection>

        <HeritageSection
          eyebrow={ar ? "أقرب ١٤ يوماً" : "Next 14 days"}
          title={ar ? "وصولات قادمة" : "Arrival pace"}
        >
          {upcoming.length === 0 ? (
            <div className="ws-empty" data-ok="true">
              {ar ? "لا وصولات مجدولة قريباً." : "No arrivals scheduled soon."}
            </div>
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
                    <HeritagePill tone={din <= 2 ? "warn" : "neutral"}>
                      {din === 0
                        ? ar ? "اليوم" : "today"
                        : ar
                          ? `${din} يوم`
                          : `${din}d`}
                    </HeritagePill>
                  </li>
                );
              })}
            </ul>
          )}
        </HeritageSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AGRICULTURE
// ---------------------------------------------------------------------------
async function AgricultureOps({ ar }: { ar: boolean }) {
  // Farms are workspace-scoped; Crops aren't (no companyId) — scope
  // them via the farm ids we just fetched.
  const farms = await prisma.farm.findMany({ orderBy: { name: "asc" } });
  const farmIds = farms.map((f) => f.id);
  const crops = farmIds.length
    ? await prisma.crop.findMany({
        where: { farmId: { in: farmIds } },
        orderBy: { expectedHarvest: "asc" },
        take: 500,
      })
    : [];

  const now = Date.now();
  const DAY = 86_400_000;
  const growing = crops.filter((c) => c.status === "GROWING");
  const harvested = crops.filter(
    (c) => c.status === "HARVESTED" && c.actualYieldKg != null,
  );
  const expSum = harvested.reduce((a, c) => a + (c.expectedYieldKg ?? 0), 0);
  const actSum = harvested.reduce((a, c) => a + (c.actualYieldKg ?? 0), 0);
  const yieldReal = expSum > 0 ? Math.round((actSum / expSum) * 100) : 0;
  const nearHarvest = growing
    .filter((c) => {
      const d = (new Date(c.expectedHarvest).getTime() - now) / DAY;
      return d >= 0 && d <= 14;
    })
    .sort(
      (a, b) =>
        +new Date(a.expectedHarvest) - +new Date(b.expectedHarvest),
    );

  const STATUS_ORDER = ["PLANTED", "GROWING", "HARVESTED", "FAILED"];
  const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
    PLANTED: { ar: "مزروع", en: "Planted" },
    GROWING: { ar: "ينمو", en: "Growing" },
    HARVESTED: { ar: "محصود", en: "Harvested" },
    FAILED: { ar: "فاشل", en: "Failed" },
  };
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s] ?? { ar: s, en: s },
    items: crops.filter((c) => c.status === s),
  })).filter((col) => col.items.length > 0);

  return (
    <div className="ws-page">
      <section className="ws-stat-row">
        <Kpi label={ar ? "المزارع" : "Farms"} value={formatNumber(farms.length)} icon={<Sprout className="h-3.5 w-3.5" />} />
        <Kpi label={ar ? "محاصيل تنمو" : "Growing crops"} value={formatNumber(growing.length)} />
        <Kpi label={ar ? "تحقّق الإنتاجية" : "Yield realization"} value={`${yieldReal}%`} accent={yieldReal > 0 && yieldReal < 85} />
        <Kpi label={ar ? "قرب الحصاد" : "Near harvest"} value={formatNumber(nearHarvest.length)} accent={nearHarvest.length > 0} />
      </section>

      {/* Crop-cycle board */}
      <HeritageSection
        eyebrow={ar ? "دورة المحاصيل لحظياً" : "Live crop cycle"}
        title={ar ? "لوحة الدورة" : "Crop-cycle board"}
      >
        <div className="ws-board">
          {byStatus.map((col) => (
            <div key={col.status} className="ws-board-col">
              <header className="ws-board-col-head">
                <span>{ar ? col.label.ar : col.label.en}</span>
                <span className="ws-board-col-count">{col.items.length}</span>
              </header>
              <div className="ws-board-col-body">
                {col.items.slice(0, 12).map((c) => {
                  const f = farms.find((x) => x.id === c.farmId);
                  const dh = Math.round(
                    (new Date(c.expectedHarvest).getTime() - now) / DAY,
                  );
                  return (
                    <div key={c.id} className="ws-board-card">
                      <div className="ws-board-card-title">
                        {c.name}
                        {c.variety ? ` · ${c.variety}` : ""}
                      </div>
                      <div className="ws-board-card-meta">
                        <span>{f?.name ?? ""}</span>
                        <span className="ws-board-card-sep">·</span>
                        <span>
                          {formatNumber(Math.round(c.expectedYieldKg))}
                          {ar ? " كغ متوقّع" : " kg exp"}
                        </span>
                      </div>
                      {c.status === "GROWING" ? (
                        <div
                          className="ws-board-card-expiry"
                          data-urgent={dh >= 0 && dh <= 7 ? "true" : "false"}
                        >
                          {dh < 0
                            ? ar ? "تجاوز الموعد" : "overdue"
                            : ar
                              ? `الحصاد خلال ${dh} يوم`
                              : `harvest in ${dh}d`}
                        </div>
                      ) : c.status === "HARVESTED" && c.actualYieldKg != null ? (
                        <div className="ws-board-card-expiry">
                          {formatNumber(Math.round(c.actualYieldKg))}
                          {ar ? " كغ فعلي" : " kg actual"}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {col.items.length > 12 ? (
                  <div className="ws-board-more">
                    +{col.items.length - 12} {ar ? "أخرى" : "more"}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </HeritageSection>

      <div className="ws-two-col">
        <HeritageSection
          eyebrow={ar ? "أقرب ١٤ يوماً" : "Next 14 days"}
          title={ar ? "مراقبة الحصاد" : "Harvest watch"}
        >
          {nearHarvest.length === 0 ? (
            <div className="ws-empty" data-ok="true">
              {ar ? "لا حصاد وشيك. كل المحاصيل ضمن دورتها." : "No imminent harvest. All crops mid-cycle."}
            </div>
          ) : (
            <ul className="ws-list">
              {nearHarvest.slice(0, 12).map((c) => {
                const f = farms.find((x) => x.id === c.farmId);
                const dh = Math.round(
                  (new Date(c.expectedHarvest).getTime() - now) / DAY,
                );
                return (
                  <li key={c.id} className="ws-list-row">
                    <div className="ws-list-main">
                      <div className="ws-list-title">
                        {c.name}{c.variety ? ` · ${c.variety}` : ""}
                      </div>
                      <div className="ws-list-sub ws-mono">
                        {f?.name ?? ""} ·{" "}
                        {formatNumber(Math.round(c.expectedYieldKg))}
                        {ar ? " كغ" : " kg"}
                      </div>
                    </div>
                    <HeritagePill tone={dh <= 5 ? "warn" : "neutral"}>
                      {dh === 0 ? (ar ? "اليوم" : "today") : ar ? `${dh} يوم` : `${dh}d`}
                    </HeritagePill>
                  </li>
                );
              })}
            </ul>
          )}
        </HeritageSection>

        <HeritageSection
          eyebrow={ar ? "فعلي مقابل متوقّع" : "Actual vs forecast"}
          title={ar ? "تحقّق الإنتاجية" : "Yield realization"}
        >
          {harvested.length === 0 ? (
            <div className="ws-empty">
              {ar ? "لا محاصيل محصودة بعد." : "No harvested crops yet."}
            </div>
          ) : (
            <ul className="ws-dest">
              {harvested.slice(0, 8).map((c) => {
                const exp = c.expectedYieldKg || 1;
                const pct = Math.round(((c.actualYieldKg ?? 0) / exp) * 100);
                return (
                  <li key={c.id} className="ws-dest-row">
                    <div className="ws-dest-head">
                      <span className="ws-dest-name">
                        {c.name}{c.variety ? ` · ${c.variety}` : ""}
                      </span>
                      <span className="ws-mono ws-dest-pct">{pct}%</span>
                    </div>
                    <div className="ws-dest-bar">
                      <span
                        className="ws-dest-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background:
                            pct >= 95
                              ? "var(--heri-teal)"
                              : pct >= 80
                                ? "var(--heri-copper)"
                                : "var(--heri-terracotta)",
                        }}
                      />
                    </div>
                    <div className="ws-dest-n ws-mono">
                      {formatNumber(Math.round(c.actualYieldKg ?? 0))} /{" "}
                      {formatNumber(Math.round(c.expectedYieldKg))}{" "}
                      {ar ? "كغ" : "kg"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </HeritageSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDUCATION
// ---------------------------------------------------------------------------
async function EducationOps({ ar }: { ar: boolean }) {
  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalFunding = programs.reduce((a, p) => a + (p.fundingJod ?? 0), 0);
  const cohorts = Array.from(new Set(programs.map((p) => p.cohort))).sort();

  // Stage board — incubator pipeline
  const STAGE_ORDER = ["INTAKE", "SCREENING", "ACTIVE", "DEMO", "GRADUATED", "EXITED"];
  const STAGE_LABEL: Record<string, { ar: string; en: string }> = {
    INTAKE: { ar: "استقبال", en: "Intake" },
    SCREENING: { ar: "فرز", en: "Screening" },
    ACTIVE: { ar: "نشط", en: "Active" },
    DEMO: { ar: "عرض", en: "Demo day" },
    GRADUATED: { ar: "متخرّج", en: "Graduated" },
    EXITED: { ar: "خروج", en: "Exited" },
  };
  const seen = Array.from(new Set(programs.map((p) => p.stage)));
  const ordered = [
    ...STAGE_ORDER.filter((s) => seen.includes(s)),
    ...seen.filter((s) => !STAGE_ORDER.includes(s)).sort(),
  ];
  const byStage = ordered
    .map((s) => ({
      stage: s,
      label: STAGE_LABEL[s] ?? { ar: s, en: s },
      items: programs.filter((p) => p.stage === s),
    }))
    .filter((c) => c.items.length > 0);

  // Funding by cohort
  const fundByCohort = cohorts
    .map((c) => ({
      cohort: c,
      total: programs
        .filter((p) => p.cohort === c)
        .reduce((a, p) => a + (p.fundingJod ?? 0), 0),
      n: programs.filter((p) => p.cohort === c).length,
    }))
    .sort((a, b) => b.total - a.total);
  const fundMax = Math.max(1, ...fundByCohort.map((f) => f.total));

  return (
    <div className="ws-page">
      <section className="ws-stat-row">
        <Kpi label={ar ? "البرامج" : "Programs"} value={formatNumber(programs.length)} icon={<GraduationCap className="h-3.5 w-3.5" />} />
        <Kpi label={ar ? "الكوهورتات" : "Cohorts"} value={formatNumber(cohorts.length)} />
        <Kpi label={ar ? "إجمالي التمويل" : "Total funding"} value={formatMoney(totalFunding)} />
        <Kpi label={ar ? "نشطة" : "Active"} value={formatNumber(programs.filter((p) => p.stage === "ACTIVE").length)} />
      </section>

      {/* Incubator pipeline board */}
      <HeritageSection
        eyebrow={ar ? "مسار الحاضنة" : "Incubator pipeline"}
        title={ar ? "لوحة المراحل" : "Stage board"}
      >
        <div className="ws-board">
          {byStage.map((col) => (
            <div key={col.stage} className="ws-board-col">
              <header className="ws-board-col-head">
                <span>{ar ? col.label.ar : col.label.en}</span>
                <span className="ws-board-col-count">{col.items.length}</span>
              </header>
              <div className="ws-board-col-body">
                {col.items.slice(0, 12).map((p) => (
                  <div key={p.id} className="ws-board-card">
                    <div className="ws-board-card-title">
                      {ar ? p.name : p.nameEn ?? p.name}
                    </div>
                    <div className="ws-board-card-meta">
                      <span>{p.founder}</span>
                      <span className="ws-board-card-sep">·</span>
                      <span className="ws-mono">{p.cohort}</span>
                    </div>
                    {p.fundingJod > 0 ? (
                      <div className="ws-board-card-expiry">
                        {formatMoney(p.fundingJod)}
                      </div>
                    ) : null}
                  </div>
                ))}
                {col.items.length > 12 ? (
                  <div className="ws-board-more">
                    +{col.items.length - 12} {ar ? "أخرى" : "more"}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </HeritageSection>

      <HeritageSection
        eyebrow={ar ? "التمويل لكل كوهورت" : "Funding per cohort"}
        title={ar ? "توزيع التمويل" : "Funding distribution"}
      >
        <ul className="ws-dest">
          {fundByCohort.map((f) => {
            const pct = Math.round((f.total / fundMax) * 100);
            return (
              <li key={f.cohort} className="ws-dest-row">
                <div className="ws-dest-head">
                  <span className="ws-dest-name">
                    {ar ? "كوهورت " : "Cohort "}{f.cohort}
                  </span>
                  <span className="ws-mono ws-dest-pct">
                    {formatMoney(f.total)}
                  </span>
                </div>
                <div className="ws-dest-bar">
                  <span className="ws-dest-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="ws-dest-n ws-mono">
                  {formatNumber(f.n)} {ar ? "برنامج" : "programs"}
                </div>
              </li>
            );
          })}
        </ul>
      </HeritageSection>
    </div>
  );
}

// Holding = the parent. Its "operations" ARE the portfolio. We use the
// UNSCOPED client deliberately: a holding workspace should see every
// sub-unit, not just its own (near-empty) rows.
async function HoldingOps({ ar }: { ar: boolean }) {
  const companies = await prismaUnscoped.company.findMany({
    orderBy: { employees: "desc" },
  });
  const now = Date.now();
  const DAY = 86_400_000;
  const since = new Date(now - 30 * DAY);

  const rows = await Promise.all(
    companies.map(async (c) => {
      const [rev, exp, headcount] = await Promise.all([
        prismaUnscoped.transaction.aggregate({
          _sum: { amount: true },
          where: { companyId: c.id, kind: "REVENUE", occurredAt: { gte: since } },
        }),
        prismaUnscoped.transaction.aggregate({
          _sum: { amount: true },
          where: { companyId: c.id, kind: "EXPENSE", occurredAt: { gte: since } },
        }),
        prismaUnscoped.user.count({ where: { companyId: c.id } }),
      ]);
      const r = rev._sum.amount ?? 0;
      const e = exp._sum.amount ?? 0;
      return {
        c,
        rev: r,
        net: r - e,
        margin: r > 0 ? Math.round(((r - e) / r) * 100) : 0,
        headcount,
      };
    }),
  );
  rows.sort((a, b) => b.rev - a.rev);

  const groupRev = rows.reduce((a, x) => a + x.rev, 0);
  const groupNet = rows.reduce((a, x) => a + x.net, 0);
  const groupStaff = companies.reduce((a, c) => a + (c.employees ?? 0), 0);
  const revMax = Math.max(1, ...rows.map((x) => x.rev));

  const SECTOR_LABEL: Record<string, { ar: string; en: string }> = {
    HOSPITALITY: { ar: "ضيافة", en: "Hospitality" },
    DAIRY: { ar: "ألبان", en: "Dairy" },
    AGRICULTURE: { ar: "زراعة", en: "Agriculture" },
    EDUCATION: { ar: "تعليم", en: "Education" },
    INVESTMENT: { ar: "استثمار", en: "Investment" },
    TRADE: { ar: "تجارة", en: "Trade" },
  };

  return (
    <div className="ws-page">
      <section className="ws-stat-row">
        <Kpi label={ar ? "الوحدات" : "Units"} value={formatNumber(companies.length)} icon={<Briefcase className="h-3.5 w-3.5" />} />
        <Kpi label={ar ? "إيراد المجموعة ٣٠ي" : "Group rev 30d"} value={formatMoney(groupRev)} />
        <Kpi label={ar ? "صافي المجموعة" : "Group net"} value={formatMoney(groupNet)} accent={groupNet < 0} />
        <Kpi label={ar ? "إجمالي الموظفين" : "Total staff"} value={formatNumber(groupStaff)} />
      </section>

      <HeritageSection
        eyebrow={ar ? "مساهمة كل وحدة بالإيراد — ٣٠ يوماً" : "Revenue contribution per unit — 30d"}
        title={ar ? "محفظة المجموعة" : "Portfolio roll-up"}
      >
        <ul className="ws-dest">
          {rows.map((x) => {
            const pct = Math.round((x.rev / revMax) * 100);
            const sec = SECTOR_LABEL[x.c.sector] ?? { ar: x.c.sector, en: x.c.sector };
            return (
              <li key={x.c.id} className="ws-dest-row">
                <div className="ws-dest-head">
                  <span className="ws-dest-name">
                    {ar ? x.c.name : x.c.nameEn ?? x.c.name}
                    <span className="ws-mono" style={{ color: "var(--heri-ink-3)", fontWeight: 400 }}>
                      {"  "}· {ar ? sec.ar : sec.en} · {formatNumber(x.headcount)} {ar ? "فرد" : "ppl"}
                    </span>
                  </span>
                  <span className="ws-mono ws-dest-pct">{formatMoney(x.rev)}</span>
                </div>
                <div className="ws-dest-bar">
                  <span
                    className="ws-dest-fill"
                    style={{
                      width: `${pct}%`,
                      background:
                        x.margin >= 25
                          ? "var(--heri-teal)"
                          : x.margin >= 0
                            ? "var(--heri-copper)"
                            : "var(--heri-terracotta)",
                    }}
                  />
                </div>
                <div className="ws-dest-n ws-mono">
                  {ar ? "صافي" : "net"} {formatMoney(x.net)} · {ar ? "هامش" : "margin"} {x.margin}%
                </div>
              </li>
            );
          })}
        </ul>
      </HeritageSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Kpi({
  label, value, icon, accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="ws-stat">
      <div className="ws-stat-label">
        {icon ? <span className="ws-stat-icon">{icon}</span> : null}
        {label}
      </div>
      <div
        className="ws-stat-value"
        style={accent ? { color: "var(--heri-terracotta)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Empty({ ar, ok }: { ar: boolean; ok?: boolean }) {
  return (
    <div className="ws-empty" data-ok={ok ? "true" : "false"}>
      {ok
        ? ar ? "لا دفعات قرب الانتهاء. كل شيء ضمن المهلة." : "Nothing near expiry. All within window."
        : ar ? "لا بيانات تشغيلية لهذه الوحدة." : "No operational data for this unit."}
    </div>
  );
}
