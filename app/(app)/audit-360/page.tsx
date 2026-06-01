
export const dynamic = "force-dynamic";
// /audit-360 — single-record cross-module trace.
//
// URL contract: ?entity=<TYPE>&id=<id>
//   entity ∈ COMPANY | HOTEL | BOOKING | DAIRY | FARM | PROGRAM
//          | FORECAST | INSIGHT | TASK | PROJECT | TRANSACTION | USER
//   id     = the record's primary key
//
// Without a selection, the page renders a "recent activity" picker grouped
// by entity so users can drill into anything that's been touched lately.
//
// Visuals are ported to the Claude Design reference
// (docs/design/system/sections/audit.html + audit-ops.js): the .dl-page
// daylight register, .sec-head header, .ops-tabs/.ops-panel tabs, and the
// .ops-table / .ops-tr / .ops-cell / .ops-tag operations table. Real data
// comes from the Prisma queries below; only the look is the design.

import Link from "next/link";
import {
  Building2,
  Hotel,
  Milk,
  Sprout,
  GraduationCap,
  Brain,
  Sparkles,
  ListChecks,
  FlaskConical,
  Wallet,
  User as UserIcon,
  CalendarDays,
  Activity as ActivityIcon,
  MessageSquare,
  Pin as PinIcon,
  Eye,
  Search,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { isSafeId } from "@/lib/authz";
import { formatNumber, formatRelative } from "@/lib/utils";
import "../daylight.css";
import "./audit.css";

type EntityType =
  | "COMPANY"
  | "HOTEL"
  | "BOOKING"
  | "DAIRY"
  | "FARM"
  | "PROGRAM"
  | "FORECAST"
  | "INSIGHT"
  | "TASK"
  | "PROJECT"
  | "TRANSACTION"
  | "USER";

const VALID_ENTITIES: EntityType[] = [
  "COMPANY",
  "HOTEL",
  "BOOKING",
  "DAIRY",
  "FARM",
  "PROGRAM",
  "FORECAST",
  "INSIGHT",
  "TASK",
  "PROJECT",
  "TRANSACTION",
  "USER",
];

// Per-entity display metadata. Icons + labels feed the picker, the entity
// card, and the timeline rows uniformly.
const ENTITY_META: Record<
  EntityType,
  {
    ar: string;
    en: string;
    icon: typeof Building2;
    tint: string;
    href: (id: string) => string | null;
  }
> = {
  COMPANY: {
    ar: "شركة", en: "Company", icon: Building2, tint: "#0f7a5a",
    href: (id) => `/companies/${id}`,
  },
  HOTEL: {
    ar: "فندق", en: "Hotel", icon: Hotel, tint: "#3b82f6",
    href: (id) => `/hotels/${id}`,
  },
  BOOKING: {
    ar: "حجز", en: "Booking", icon: CalendarDays, tint: "#6366f1",
    href: (id) => `/hotels/bookings/${id}`,
  },
  DAIRY: {
    ar: "دفعة ألبان", en: "Dairy batch", icon: Milk, tint: "#0ea5e9",
    href: (id) => `/dairy/${id}`,
  },
  FARM: {
    ar: "مزرعة", en: "Farm", icon: Sprout, tint: "#10b981",
    href: (id) => `/farms/${id}`,
  },
  PROGRAM: {
    ar: "برنامج تعليمي", en: "Program", icon: GraduationCap, tint: "#8b5cf6",
    href: (id) => `/education/${id}`,
  },
  FORECAST: {
    ar: "تنبؤ", en: "Forecast", icon: Brain, tint: "#7c3aed",
    href: (id) => `/supply-chain/${id}`,
  },
  INSIGHT: {
    ar: "إشارة ذكاء", en: "Insight", icon: Sparkles, tint: "#f59e0b",
    href: (id) => `/insights/${id}`,
  },
  TASK: {
    ar: "مهمة", en: "Task", icon: ListChecks, tint: "#10b981",
    href: () => null,
  },
  PROJECT: {
    ar: "مشروع مستقبلي", en: "Future project", icon: FlaskConical, tint: "#a78bfa",
    href: () => null,
  },
  TRANSACTION: {
    ar: "حركة مالية", en: "Transaction", icon: Wallet, tint: "#0a8e54",
    href: (id) => `/finance/${id}`,
  },
  USER: {
    ar: "مستخدم", en: "User", icon: UserIcon, tint: "#64748b",
    href: (id) => `/users/${id}`,
  },
};

// Map a raw action to an .ops-tag tone class (ok / warn / crit / info),
// matching the reference audit-ops.js type→tag mapping.
const ACTION_TAG: Record<string, "ok" | "warn" | "crit" | "info"> = {
  CREATE: "ok",
  UPDATE: "info",
  DELETE: "crit",
  RESTORE: "warn",
  LOGIN: "info",
  EXPORT: "ok",
  FORECAST: "info",
  INSIGHT: "warn",
  APPROVE: "ok",
  REJECT: "crit",
};

const ACTION_AR: Record<string, string> = {
  CREATE: "إنشاء",
  UPDATE: "تحديث",
  DELETE: "حذف",
  RESTORE: "استعادة",
  LOGIN: "تسجيل دخول",
  EXPORT: "تصدير",
  FORECAST: "تنبؤ",
  INSIGHT: "إشارة",
  APPROVE: "موافقة",
  REJECT: "رفض",
};

// Resolve a record into a display label + secondary (sub) line.
async function resolveEntity(
  entity: EntityType,
  id: string,
): Promise<{ label: string; sub?: string } | null> {
  if (!isSafeId(id)) return null;
  switch (entity) {
    case "COMPANY": {
      const r = await prisma.company.findUnique({
        where: { id },
        select: { name: true, nameEn: true, sector: true, code: true },
      });
      return r ? { label: r.name, sub: `${r.code} · ${r.sector}` } : null;
    }
    case "HOTEL": {
      const r = await prisma.hotel.findUnique({
        where: { id },
        select: { name: true, city: true, country: true, totalRooms: true },
      });
      return r
        ? { label: r.name, sub: `${r.city}, ${r.country} · ${r.totalRooms} rooms` }
        : null;
    }
    case "BOOKING": {
      const r = await prisma.booking.findUnique({
        where: { id },
        select: { reference: true, guestName: true },
      });
      return r ? { label: r.reference, sub: r.guestName } : null;
    }
    case "DAIRY": {
      const r = await prisma.dairyBatch.findUnique({
        where: { id },
        select: { batchNumber: true, productAr: true, product: true },
      });
      return r ? { label: r.batchNumber, sub: r.productAr || r.product } : null;
    }
    case "FARM": {
      const r = await prisma.farm.findUnique({
        where: { id },
        select: { name: true, location: true, type: true },
      });
      return r ? { label: r.name, sub: `${r.location} · ${r.type}` } : null;
    }
    case "PROGRAM": {
      const r = await prisma.program.findUnique({
        where: { id },
        select: { name: true, founder: true, cohort: true },
      });
      return r ? { label: r.name, sub: `${r.founder} · ${r.cohort}` } : null;
    }
    case "FORECAST": {
      const r = await prisma.supplyForecast.findUnique({
        where: { id },
        select: { productLabel: true, status: true },
      });
      return r ? { label: r.productLabel, sub: r.status } : null;
    }
    case "INSIGHT": {
      const r = await prisma.aIInsight.findUnique({
        where: { id },
        select: { title: true, severity: true, module: true },
      });
      return r ? { label: r.title, sub: `${r.module} · ${r.severity}` } : null;
    }
    case "TASK": {
      const r = await prisma.task.findUnique({
        where: { id },
        select: { title: true, status: true, module: true },
      });
      return r ? { label: r.title, sub: `${r.module} · ${r.status}` } : null;
    }
    case "PROJECT": {
      const r = await prisma.futureProject.findUnique({
        where: { id },
        select: { title: true, stage: true },
      });
      return r ? { label: r.title, sub: r.stage } : null;
    }
    case "TRANSACTION": {
      const r = await prisma.transaction.findUnique({
        where: { id },
        select: { reference: true, kind: true, amount: true, currency: true },
      });
      return r
        ? { label: r.reference, sub: `${r.kind} · ${formatNumber(r.amount)} ${r.currency}` }
        : null;
    }
    case "USER": {
      const r = await prisma.user.findUnique({
        where: { id },
        select: { name: true, email: true, role: true },
      });
      return r ? { label: r.name, sub: `${r.email} · ${r.role}` } : null;
    }
  }
}

function isValidEntity(v: string): v is EntityType {
  return VALID_ENTITIES.includes(v as EntityType);
}

export default async function Audit360Page({
  searchParams,
}: {
  searchParams: { entity?: string; id?: string };
}) {
  const ar = getLocale() === "ar";

  const rawEntity = (searchParams.entity ?? "").toUpperCase();
  const rawId = searchParams.id ?? "";
  const hasSelection =
    isValidEntity(rawEntity) && isSafeId(rawId);

  if (hasSelection) {
    const entity = rawEntity as EntityType;
    const id = rawId;

    const [resolved, activity, threads, pinCount] = await Promise.all([
      resolveEntity(entity, id),
      prisma.activityLog.findMany({
        where: { entity, entityId: id },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.messageThread.findMany({
        where: { kind: "ENTITY", entityType: entity, entityId: id },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          _count: { select: { messages: true, participants: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.pin.count({ where: { entityType: entity, entityId: id } }),
    ]);

    const meta = ENTITY_META[entity];
    const detailHref = meta.href(id);

    return (
      <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
        <div className="wrap">
          <div className="sec-head reveal">
            <div>
              <div className="sec-eyebrow">
                <span className="tick" />
                {ar ? "النظام · تتبع 360" : "System · Audit 360"}
              </div>
              <h1 className="sec-title">{ar ? "تتبع السجل" : "Record trace"}</h1>
              <p className="sec-sub">
                {ar
                  ? "كل تفاعل ولمسة على هذا العنصر — عبر كل وحدة في المنصة."
                  : "Every interaction and touch on this record — across every module."}
              </p>
            </div>
            <div className="sec-head-aside">
              <span className="sec-status">
                <span className="dot" />
                {resolved?.label ?? (ar ? "سجل غير موجود" : "Record not found")}
              </span>
              <div className="sec-actions">
                <Link href="/audit-360" className="dl-btn dl-btn-secondary">
                  <Search className="h-4 w-4" />
                  {ar ? "تتبع آخر" : "Trace another"}
                </Link>
              </div>
            </div>
          </div>

          {/* Entity overview KPIs */}
          <section className="kpi-grid reveal">
            <div className="kpi-card">
              <div className="kpi-label">{ar ? "النوع" : "Entity"}</div>
              <div className="kpi-val" style={{ fontSize: 28 }}>
                {ar ? meta.ar : meta.en}
              </div>
              <div className="kpi-foot">
                <span className="kpi-hint" style={{ fontFamily: "monospace" }}>{id}</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">{ar ? "أحداث" : "Events"}</div>
              <div className="kpi-val">{formatNumber(activity.length)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">{ar ? "نقاشات" : "Threads"}</div>
              <div className="kpi-val">{formatNumber(threads.length)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">{ar ? "تثبيتات" : "Pins"}</div>
              <div className="kpi-val">{formatNumber(pinCount)}</div>
              {detailHref ? (
                <div className="kpi-foot">
                  <Link href={detailHref} className="kpi-hint" style={{ color: "var(--gold)", fontWeight: 700 }}>
                    <Eye className="me-1 inline h-3.5 w-3.5" />
                    {ar ? "فتح السجل" : "Open record"}
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          {/* Tabs — reference audit.html: التدقيق ٣٦٠ / النشاط */}
          <div className="ops-tabs">
            <span className="ops-tab on">{ar ? "التدقيق ٣٦٠" : "Audit 360"}</span>
            <Link href="/activity" className="ops-tab">
              {ar ? "النشاط" : "Activity"}
            </Link>
          </div>

          {/* Activity timeline as an ops-table */}
          <div className="ops-panel on">
            <div className="ops-toolbar">
              <h2>{ar ? "الجدول الزمني" : "Activity timeline"}</h2>
              <div className="ops-actions">
                <span className="panel-aside">{formatNumber(activity.length)}</span>
              </div>
            </div>
            <div className="ops-table">
              <div
                className="ops-tr head"
                style={{ gridTemplateColumns: "1.4fr 2fr 1.2fr .9fr" }}
              >
                <span className="ops-cell">{ar ? "الإجراء" : "Action"}</span>
                <span className="ops-cell name">{ar ? "الملخص" : "Summary"}</span>
                <span className="ops-cell">{ar ? "المستخدم" : "User"}</span>
                <span className="ops-cell num">{ar ? "الوقت" : "Time"}</span>
              </div>
              {activity.length === 0 ? (
                <div className="ops-empty">
                  <div className="oe-ic">◇</div>
                  <div className="oe-t">{ar ? "لا لمسات بعد" : "No touches yet"}</div>
                  <div className="oe-s">
                    {ar
                      ? "لا توجد لمسات مسجلة على هذا العنصر بعد."
                      : "No recorded touches on this record yet."}
                  </div>
                </div>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="ops-tr row"
                    style={{ gridTemplateColumns: "1.4fr 2fr 1.2fr .9fr" }}
                  >
                    <span className="ops-cell">
                      <span className={`ops-tag ${ACTION_TAG[a.action] ?? "info"}`}>
                        {ar ? ACTION_AR[a.action] ?? a.action : a.action}
                      </span>
                    </span>
                    <span className="ops-cell name">
                      {ar ? a.summary : a.summaryEn ?? a.summary}
                    </span>
                    <span className="ops-cell">
                      {a.actorName ?? (ar ? "النظام" : "System")}
                      {a.module ? ` · ${a.module}` : ""}
                    </span>
                    <span className="ops-cell num">{formatRelative(a.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Discussions + pins as a secondary ops-table */}
          <div className="ops-panel on">
            <div className="ops-toolbar">
              <h2>{ar ? "نقاشات حول السجل" : "Discussions"}</h2>
              <div className="ops-actions">
                <span className="panel-aside">
                  <MessageSquare className="me-1 inline h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
                  {formatNumber(threads.length)}
                </span>
              </div>
            </div>
            <div className="ops-table">
              <div
                className="ops-tr head"
                style={{ gridTemplateColumns: "2fr .8fr .8fr .9fr" }}
              >
                <span className="ops-cell">{ar ? "النقاش" : "Thread"}</span>
                <span className="ops-cell num">{ar ? "رسائل" : "Msgs"}</span>
                <span className="ops-cell num">{ar ? "مشاركون" : "People"}</span>
                <span className="ops-cell num">{ar ? "آخر تحديث" : "Updated"}</span>
              </div>
              {threads.length === 0 ? (
                <div className="ops-empty">
                  <div className="oe-ic">◇</div>
                  <div className="oe-t">{ar ? "لا نقاشات" : "No discussions"}</div>
                  <div className="oe-s">
                    {ar
                      ? "لم يفتح أحد نقاشاً عن هذا العنصر بعد."
                      : "No discussion thread anchored to this record yet."}
                  </div>
                </div>
              ) : (
                threads.map((t) => (
                  <Link
                    key={t.id}
                    href={`/messages/${t.id}`}
                    className="ops-tr row"
                    style={{ gridTemplateColumns: "2fr .8fr .8fr .9fr" }}
                  >
                    <span className="ops-cell name">
                      {t.title ?? (ar ? "نقاش بدون عنوان" : "Untitled thread")}
                    </span>
                    <span className="ops-cell num">{formatNumber(t._count.messages)}</span>
                    <span className="ops-cell num">{formatNumber(t._count.participants)}</span>
                    <span className="ops-cell num">{formatRelative(t.updatedAt)}</span>
                  </Link>
                ))
              )}
            </div>
            <p className="panel-aside" style={{ marginTop: 12 }}>
              <PinIcon className="me-1 inline h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
              {pinCount === 0
                ? ar
                  ? "لم يثبّت أحد هذا السجل بعد."
                  : "No one has pinned this record yet."
                : ar
                  ? `${formatNumber(pinCount)} مستخدم ثبّت هذا السجل في مفضلته.`
                  : `${formatNumber(pinCount)} user${pinCount === 1 ? "" : "s"} pinned this record.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ──── No selection: show a picker driven by recent activity ────
  const recent = await prisma.activityLog.findMany({
    where: { entityId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      action: true,
      entity: true,
      entityId: true,
      summary: true,
      summaryEn: true,
      actorName: true,
      createdAt: true,
    },
  });

  // Group by (entity, entityId) and keep the latest event per record.
  const grouped = new Map<
    string,
    {
      entity: EntityType;
      entityId: string;
      summary: string;
      summaryEn: string | null;
      actorName: string | null;
      lastAction: string;
      lastAt: Date;
      count: number;
    }
  >();
  for (const r of recent) {
    if (!r.entityId) continue;
    if (!isValidEntity(r.entity)) continue;
    const key = `${r.entity}:${r.entityId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(key, {
        entity: r.entity as EntityType,
        entityId: r.entityId,
        summary: r.summary,
        summaryEn: r.summaryEn,
        actorName: r.actorName,
        lastAction: r.action,
        lastAt: r.createdAt,
        count: 1,
      });
    }
  }
  const records = [...grouped.values()].slice(0, 30);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · تتبع 360" : "System · Audit 360"}
            </div>
            <h1 className="sec-title">{ar ? "تتبع السجلات" : "Audit 360"}</h1>
            <p className="sec-sub">
              {ar
                ? "اختر سجلاً لرؤية كل لمسة عليه عبر كل وحدة عمل في المجموعة."
                : "Pick a record to see every touch on it across every business unit."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "مباشر" : "Live"}
            </span>
          </div>
        </div>

        {/* Tabs — reference audit.html: التدقيق ٣٦٠ / النشاط */}
        <div className="ops-tabs">
          <span className="ops-tab on">{ar ? "التدقيق ٣٦٠" : "Audit 360"}</span>
          <Link href="/activity" className="ops-tab">
            {ar ? "النشاط" : "Activity"}
          </Link>
        </div>

        {/* Manual entry — paste-id form, styled as an ops-form */}
        <div className="panel reveal">
          <div className="panel-head">
            <div className="panel-title">{ar ? "تتبع سجل بمعرفه" : "Trace by record ID"}</div>
          </div>
          <p className="panel-aside" style={{ marginBottom: 12 }}>
            {ar
              ? "اختر نوع السجل والصق المعرّف. يدعم الأنواع الـ 12 أدناه."
              : "Pick a record type and paste its ID. All 12 entity kinds are supported."}
          </p>
          {/* Plain GET form so the entire URL (entity + id) is shareable. */}
          <form
            action="/audit-360"
            method="get"
            className="ops-form"
            style={{ gridTemplateColumns: "200px 1fr auto", border: 0, background: "transparent", padding: 0 }}
          >
            <select name="entity" defaultValue="BOOKING">
              {VALID_ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {ar ? ENTITY_META[e].ar : ENTITY_META[e].en} ({e})
                </option>
              ))}
            </select>
            <input
              type="text"
              name="id"
              placeholder={ar ? "المعرّف (cuid)" : "Record ID (cuid)"}
              style={{ fontFamily: "monospace" }}
              required
              maxLength={64}
              pattern="[A-Za-z0-9_-]+"
            />
            <button type="submit" className="ops-add">
              <Search className="h-4 w-4" />
              {ar ? "تتبع" : "Trace"}
            </button>
          </form>
        </div>

        {/* Recent activity picker as an ops-table */}
        <div className="ops-panel on">
          <div className="ops-toolbar">
            <h2>{ar ? "أكثر السجلات تفاعلاً مؤخراً" : "Recently active records"}</h2>
            <div className="ops-actions">
              <span className="panel-aside">{formatNumber(records.length)}</span>
            </div>
          </div>
          <div className="ops-table">
            <div
              className="ops-tr head"
              style={{ gridTemplateColumns: ".9fr 2fr 1fr .7fr .8fr" }}
            >
              <span className="ops-cell">{ar ? "النوع" : "Type"}</span>
              <span className="ops-cell name">{ar ? "الملخص" : "Summary"}</span>
              <span className="ops-cell">{ar ? "المستخدم" : "User"}</span>
              <span className="ops-cell num">{ar ? "مرات" : "Count"}</span>
              <span className="ops-cell num">{ar ? "الوقت" : "Time"}</span>
            </div>
            {records.length === 0 ? (
              <div className="ops-empty">
                <div className="oe-ic">◇</div>
                <div className="oe-t">{ar ? "لا يوجد نشاط حديث" : "No recent activity"}</div>
                <div className="oe-s">
                  {ar
                    ? "ما إن يبدأ التفاعل عبر الوحدات حتى تظهر السجلات هنا."
                    : "Once touches start flowing across modules, records will surface here."}
                </div>
              </div>
            ) : (
              records.map((r) => {
                const m = ENTITY_META[r.entity];
                const href = `/audit-360?entity=${r.entity}&id=${encodeURIComponent(r.entityId)}`;
                return (
                  <Link
                    key={`${r.entity}:${r.entityId}`}
                    href={href}
                    className="ops-tr row"
                    style={{ gridTemplateColumns: ".9fr 2fr 1fr .7fr .8fr" }}
                  >
                    <span className="ops-cell">
                      <span className="ops-tag info">{ar ? m.ar : m.en}</span>
                    </span>
                    <span className="ops-cell name">
                      <span className={`ops-tag ${ACTION_TAG[r.lastAction] ?? "info"}`} style={{ marginInlineEnd: 6 }}>
                        {ar ? ACTION_AR[r.lastAction] ?? r.lastAction : r.lastAction}
                      </span>
                      {ar ? r.summary : r.summaryEn ?? r.summary}
                    </span>
                    <span className="ops-cell">{r.actorName ?? "—"}</span>
                    <span className="ops-cell num">{formatNumber(r.count)} ×</span>
                    <span className="ops-cell num">{formatRelative(r.lastAt)}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
