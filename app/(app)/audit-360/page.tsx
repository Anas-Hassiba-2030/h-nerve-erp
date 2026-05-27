// /audit-360 — single-record cross-module trace.
//
// URL contract: ?entity=<TYPE>&id=<id>
//   entity ∈ COMPANY | HOTEL | BOOKING | DAIRY | FARM | PROGRAM
//          | FORECAST | INSIGHT | TASK | PROJECT | TRANSACTION | USER
//   id     = the record's primary key
//
// Without a selection, the page renders a "recent activity" picker grouped
// by entity so users can drill into anything that's been touched lately.

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
  ArrowRight,
  Search,
  Compass,
  Hash,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { PageContainer } from "@/components/PageContainer";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { isSafeId } from "@/lib/authz";
import { formatNumber, formatRelative } from "@/lib/utils";

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

const ACTION_TONE: Record<string, string> = {
  CREATE: "badge-emerald",
  UPDATE: "badge-blue",
  DELETE: "badge-red",
  RESTORE: "badge-violet",
  LOGIN: "badge-slate",
  EXPORT: "badge-amber",
  FORECAST: "badge-violet",
  INSIGHT: "badge-amber",
  APPROVE: "badge-emerald",
  REJECT: "badge-red",
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
    const Icon = meta.icon;
    const detailHref = meta.href(id);

    return (
      <>
        <Topbar
          eyebrow={ar ? "النظام · تتبع 360" : "System · Audit 360"}
          title={ar ? "تتبع السجل" : "Record trace"}
          subtitle={
            ar
              ? `كل تفاعل ولمسة على هذا العنصر — عبر كل وحدة في المنصة.`
              : "Every interaction and touch on this record — across every module."
          }
          actions={
            <Link href="/audit-360" className="btn-ghost">
              <Search className="h-4 w-4" />
              {ar ? "تتبع آخر" : "Trace another"}
            </Link>
          }
        />
        <PageContainer>
          {/* Entity card */}
          <section
            className="relative overflow-hidden rounded-2xl p-6 text-white anim-rise-glow"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${meta.tint} 80%, #000) 0%, ${meta.tint} 50%, color-mix(in srgb, ${meta.tint} 50%, white) 110%)`,
              minHeight: 160,
            }}
          >
            <div className="relative flex flex-wrap items-start gap-5">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  backdropFilter: "blur(6px)",
                }}
                aria-hidden
              >
                <Icon className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.32)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {ar ? meta.ar : meta.en}
                </div>
                <h2
                  className="mt-2 text-2xl font-bold md:text-3xl"
                  style={{ letterSpacing: "-0.018em", textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
                >
                  {resolved?.label ?? (ar ? "سجل غير موجود" : "Record not found")}
                </h2>
                {resolved?.sub ? (
                  <p className="mt-1 max-w-2xl text-sm opacity-90">{resolved.sub}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    }}
                  >
                    <Hash className="h-3 w-3" />
                    {id}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    }}
                  >
                    <ActivityIcon className="h-3 w-3" />
                    {formatNumber(activity.length)}{" "}
                    {ar ? "حدث" : activity.length === 1 ? "event" : "events"}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {formatNumber(threads.length)}{" "}
                    {ar ? "نقاش" : threads.length === 1 ? "thread" : "threads"}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    }}
                  >
                    <PinIcon className="h-3 w-3" />
                    {formatNumber(pinCount)}{" "}
                    {ar ? "تثبيت" : "pin" + (pinCount === 1 ? "" : "s")}
                  </span>
                  {detailHref ? (
                    <Link
                      href={detailHref}
                      className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1 text-[12px] font-semibold transition hover:scale-105"
                      style={{ color: meta.tint }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {ar ? "فتح السجل" : "Open record"}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Two-column layout: timeline + side rail */}
          <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
            {/* Activity timeline */}
            <section className="card overflow-hidden">
              <header
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--heri-rule)" }}
              >
                <h3
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <ActivityIcon className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
                  {ar ? "الجدول الزمني" : "Activity timeline"}
                </h3>
                <span className="font-mono text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                  {formatNumber(activity.length)}
                </span>
              </header>
              {activity.length === 0 ? (
                <div
                  className="px-4 py-6 text-center text-[12px]"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {ar
                    ? "لا توجد لمسات مسجلة على هذا العنصر بعد."
                    : "No recorded touches on this record yet."}
                </div>
              ) : (
                <ol className="relative">
                  <span
                    aria-hidden
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      insetInlineStart: 30,
                      background: "var(--heri-rule)",
                    }}
                  />
                  {activity.map((a, i) => (
                    <li
                      key={a.id}
                      className="relative grid items-start gap-3 px-4 py-3 anim-fade-up"
                      style={{
                        gridTemplateColumns: "32px 1fr auto",
                        animationDelay: `${Math.min(i, 10) * 30}ms`,
                        borderTop: i === 0 ? "none" : "1px solid color-mix(in srgb, var(--heri-rule) 60%, transparent)",
                      }}
                    >
                      <span
                        className="z-10 flex h-7 w-7 items-center justify-center rounded-full text-white"
                        style={{ background: meta.tint }}
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`${ACTION_TONE[a.action] ?? "badge-slate"} font-mono`}
                          >
                            {ar ? ACTION_AR[a.action] ?? a.action : a.action}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {ar ? a.summary : a.summaryEn ?? a.summary}
                          </span>
                        </div>
                        <div
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {a.actorName ? (
                            <span>
                              <UserIcon className="me-1 inline h-3 w-3" />
                              {a.actorName}
                            </span>
                          ) : (
                            <span>{ar ? "النظام" : "System"}</span>
                          )}
                          {a.module ? (
                            <span className="ms-2">· {a.module}</span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className="whitespace-nowrap text-[11px] font-mono"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {formatRelative(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Side rail: discussions + meta */}
            <aside className="space-y-4">
              <section className="card card-pad">
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <MessageSquare className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
                  {ar ? "نقاشات حول السجل" : "Discussions"}
                </h3>
                {threads.length === 0 ? (
                  <p className="text-[12px]" style={{ color: "var(--heri-ink-3)" }}>
                    {ar
                      ? "لم يفتح أحد نقاشاً عن هذا العنصر بعد."
                      : "No discussion thread anchored to this record yet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--heri-rule)]">
                    {threads.map((t) => (
                      <li key={t.id} className="py-2.5">
                        <Link
                          href={`/messages/${t.id}`}
                          className="block hover:underline"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          <div className="text-sm font-semibold">
                            {t.title ?? (ar ? "نقاش بدون عنوان" : "Untitled thread")}
                          </div>
                          <div
                            className="mt-0.5 flex items-center gap-3 text-[11px] font-mono"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            <span>
                              {formatNumber(t._count.messages)}{" "}
                              {ar ? "رسالة" : "msgs"}
                            </span>
                            <span>
                              {formatNumber(t._count.participants)}{" "}
                              {ar ? "مشارك" : "people"}
                            </span>
                            <span>{formatRelative(t.updatedAt)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card card-pad">
                <h3
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <PinIcon className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
                  {ar ? "تثبيتات" : "Pins"}
                </h3>
                <p className="text-[12px]" style={{ color: "var(--heri-ink-3)" }}>
                  {pinCount === 0
                    ? ar
                      ? "لم يثبّت أحد هذا السجل بعد."
                      : "No one has pinned this record yet."
                    : ar
                      ? `${formatNumber(pinCount)} مستخدم ثبّت هذا السجل في مفضلته.`
                      : `${formatNumber(pinCount)} user${pinCount === 1 ? "" : "s"} pinned this record.`}
                </p>
              </section>
            </aside>
          </div>
        </PageContainer>
      </>
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
    <>
      <Topbar
        eyebrow={ar ? "النظام · تتبع 360" : "System · Audit 360"}
        title={ar ? "تتبع السجلات" : "Audit 360"}
        subtitle={
          ar
            ? "اختر سجلاً لرؤية كل لمسة عليه عبر كل وحدة عمل في المجموعة."
            : "Pick a record to see every touch on it across every business unit."
        }
      />
      <PageContainer>
        {/* Manual entry — paste-id form */}
        <section className="card card-pad">
          <h3
            className="mb-2 flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--heri-ink)" }}
          >
            <Compass className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
            {ar ? "تتبع سجل بمعرفه" : "Trace by record ID"}
          </h3>
          <p
            className="mb-3 text-[12px]"
            style={{ color: "var(--heri-ink-3)" }}
          >
            {ar
              ? "اختر نوع السجل والصق المعرّف. يدعم الأنواع الـ 12 أدناه."
              : "Pick a record type and paste its ID. All 12 entity kinds are supported."}
          </p>
          {/* Plain GET form so the entire URL (entity + id) is shareable. */}
          <form
            action="/audit-360"
            method="get"
            className="grid gap-2 sm:grid-cols-[200px_1fr_auto]"
          >
            <select name="entity" className="select" defaultValue="BOOKING">
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
              className="input font-mono"
              required
              maxLength={64}
              pattern="[A-Za-z0-9_-]+"
            />
            <button type="submit" className="btn-primary">
              <Search className="h-4 w-4" />
              {ar ? "تتبع" : "Trace"}
            </button>
          </form>
        </section>

        {/* Recent activity picker */}
        <section className="card overflow-hidden">
          <header
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--heri-rule)" }}
          >
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              <ActivityIcon className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} />
              {ar ? "أكثر السجلات تفاعلاً مؤخراً" : "Recently active records"}
            </h3>
            <span
              className="text-[11px] font-mono"
              style={{ color: "var(--heri-ink-3)" }}
            >
              {formatNumber(records.length)}
            </span>
          </header>
          {records.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title={ar ? "لا يوجد نشاط حديث" : "No recent activity"}
              description={
                ar
                  ? "ما إن يبدأ التفاعل عبر الوحدات حتى تظهر السجلات هنا."
                  : "Once touches start flowing across modules, records will surface here."
              }
            />
          ) : (
            <ul>
              {records.map((r, i) => {
                const meta = ENTITY_META[r.entity];
                const Icon = meta.icon;
                const href = `/audit-360?entity=${r.entity}&id=${encodeURIComponent(r.entityId)}`;
                return (
                  <li
                    key={`${r.entity}:${r.entityId}`}
                    className="anim-fade-up"
                    style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                  >
                    <Link
                      href={href}
                      className="grid items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--heri-cream-2)]"
                      style={{
                        gridTemplateColumns: "32px 1fr auto auto",
                        borderTop: i === 0 ? "none" : "1px solid color-mix(in srgb, var(--heri-rule) 60%, transparent)",
                      }}
                    >
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ background: meta.tint }}
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="badge-slate">
                            {ar ? meta.ar : meta.en}
                          </span>
                          <span
                            className={`${ACTION_TONE[r.lastAction] ?? "badge-slate"} font-mono`}
                          >
                            {ar ? ACTION_AR[r.lastAction] ?? r.lastAction : r.lastAction}
                          </span>
                          <span
                            className="truncate text-sm font-bold"
                            style={{ color: "var(--heri-ink)" }}
                          >
                            {ar ? r.summary : r.summaryEn ?? r.summary}
                          </span>
                        </div>
                        <div
                          className="mt-0.5 truncate text-[11px] font-mono"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          {r.entityId}
                          {r.actorName ? <span className="ms-2">· {r.actorName}</span> : null}
                        </div>
                      </div>
                      <span
                        className="whitespace-nowrap text-[11px] font-bold"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {formatNumber(r.count)} ×
                      </span>
                      <span
                        className="whitespace-nowrap text-[11px]"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {formatRelative(r.lastAt)}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 rtl:-scale-x-100"
                        style={{ color: "var(--heri-ink-3)", gridColumn: "5" }}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageContainer>
    </>
  );
}
