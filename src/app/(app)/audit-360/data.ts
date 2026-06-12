// /audit-360 — server data module + shared metadata.
//
// Holds the entity metadata, action mappings, validity helpers, the
// single-record resolver, the trace fetch (selection branch), and the
// recent-records picker fetch (no-selection branch) — all moved verbatim
// from the page. Behaviour-preserving.

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
} from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { isSafeId } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";

export type EntityType =
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

export const VALID_ENTITIES: EntityType[] = [
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
export const ENTITY_META: Record<
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
export const ACTION_TAG: Record<string, "ok" | "warn" | "crit" | "info"> = {
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

export const ACTION_AR: Record<string, string> = {
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
export async function resolveEntity(
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
        select: { productLabel: true, productLabelEn: true, status: true },
      });
      return r ? { label: (await getLocale()) === "ar" ? r.productLabel : (r.productLabelEn || r.productLabel), sub: r.status } : null;
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

export function isValidEntity(v: string): v is EntityType {
  return VALID_ENTITIES.includes(v as EntityType);
}

// Selection branch — resolve the record plus its activity, threads, pins.
export async function getAuditTrace(entity: EntityType, id: string) {
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

  return { resolved, activity, threads, pinCount };
}
export type AuditTrace = Awaited<ReturnType<typeof getAuditTrace>>;

// No-selection branch — recent activity grouped into a picker list.
export async function getRecentRecords() {
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
  return records;
}
export type RecentRecord = Awaited<ReturnType<typeof getRecentRecords>>[number];
