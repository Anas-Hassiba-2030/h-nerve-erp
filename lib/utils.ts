import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// IMPORTANT: numbers are ALWAYS rendered with en-US digits (Western Arabic
// numerals) regardless of UI language. Only the surrounding text translates.
// Months & relative time labels follow the active locale.
const NUM_LOCALE = "en-US";

export function formatMoney(value: number, currency = "JOD") {
  return new Intl.NumberFormat(NUM_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

// Money with cents — ALWAYS 2 decimals (0.80, 12.00, 1,250.00). No currency
// symbol; use where the column header already carries the unit. Separate
// from formatNumber so non-money callers keep trailing-zero trimming.
export function formatMoney2(value: number) {
  return new Intl.NumberFormat(NUM_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat(NUM_LOCALE, {
    maximumFractionDigits: fractionDigits,
  }).format(value || 0);
}

export function formatPercent(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat(NUM_LOCALE, {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(d: Date | string | null | undefined, locale: "ar" | "en" = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  // Use locale's calendar for month names but still en-US digits via numberingSystem.
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return fmt.format(date);
}

export function formatShortDate(d: Date | string | null | undefined, locale: "ar" | "en" = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-US", {
    month: "short",
    day: "numeric",
  });
  return fmt.format(date);
}

export function formatDateTime(d: Date | string | null | undefined, locale: "ar" | "en" = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(date);
}

export function formatRelative(d: Date | string | null | undefined, locale: "ar" | "en" = "en") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-US", { numeric: "auto" });
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return rtf.format(diffHours, "hour");
  }
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  return rtf.format(diffMonths, "month");
}

export function generateNumber(prefix: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}${d}-${r}`;
}

// ----- Domain dictionaries (Arabic, used when locale=ar) -----
export const SECTORS_AR: Record<string, string> = {
  HOSPITALITY: "ضيافة وفنادق",
  DAIRY: "صناعات غذائية - ألبان",
  AGRICULTURE: "زراعة وثروة حيوانية",
  EDUCATION: "تعليم وأبحاث",
  INVESTMENT: "استثمار قابض",
  TRADE: "تجارة وتوزيع",
};
export const SECTORS_EN: Record<string, string> = {
  HOSPITALITY: "Hospitality & Hotels",
  DAIRY: "Food Industries — Dairy",
  AGRICULTURE: "Agriculture & Livestock",
  EDUCATION: "Education & Research",
  INVESTMENT: "Holding Investment",
  TRADE: "Trade & Distribution",
};

export const STATUS_AR: Record<string, string> = {
  ACTIVE: "نشطة", PAUSED: "متوقفة", RAMPING: "في طور التوسع",
  DRAFT: "مسودة", APPROVED: "موافق عليها", EXECUTED: "منفّذة", DISMISSED: "مرفوضة",
  PENDING: "قيد الانتظار", CONFIRMED: "مؤكد", CHECKED_IN: "تم تسجيل الدخول",
  COMPLETED: "مكتمل", CHECKED_OUT: "تم تسجيل الخروج", CANCELLED: "ملغى",
  IN_PRODUCTION: "قيد الإنتاج", QC: "ضبط جودة", READY: "جاهز",
  DISTRIBUTED: "تم التوزيع", RECALLED: "مسحوب",
  GROWING: "ينمو", HARVESTING: "في الحصاد", HARVESTED: "تم الحصاد", FAILED: "متعثر",
  INTAKE: "استقبال", ACCELERATING: "في التسريع", GRADUATED: "متخرج", STALLED: "متعثر",
  OPEN: "مفتوح", ACKNOWLEDGED: "مقروء", RESOLVED: "محلول",
  OK: "طبيعي", WARN: "تحذير", CRITICAL: "حرج",
  TODO: "للتنفيذ", IN_PROGRESS: "جارية", DONE: "منجزة", BLOCKED: "متعثرة",
  IDEA: "فكرة", RESEARCH: "أبحاث", PLANNED: "مخطط",
  ON_HOLD: "معلّق",
};
export const STATUS_EN: Record<string, string> = {
  ACTIVE: "Active", PAUSED: "Paused", RAMPING: "Ramping",
  DRAFT: "Draft", APPROVED: "Approved", EXECUTED: "Executed", DISMISSED: "Dismissed",
  PENDING: "Pending", CONFIRMED: "Confirmed", CHECKED_IN: "Checked-in",
  COMPLETED: "Completed", CHECKED_OUT: "Checked-out", CANCELLED: "Cancelled",
  IN_PRODUCTION: "In production", QC: "Quality control", READY: "Ready",
  DISTRIBUTED: "Distributed", RECALLED: "Recalled",
  GROWING: "Growing", HARVESTING: "Harvesting", HARVESTED: "Harvested", FAILED: "Failed",
  INTAKE: "Intake", ACCELERATING: "Accelerating", GRADUATED: "Graduated", STALLED: "Stalled",
  OPEN: "Open", ACKNOWLEDGED: "Acknowledged", RESOLVED: "Resolved",
  OK: "Healthy", WARN: "Warning", CRITICAL: "Critical",
  TODO: "Todo", IN_PROGRESS: "In progress", DONE: "Done", BLOCKED: "Blocked",
  IDEA: "Idea", RESEARCH: "Research", PLANNED: "Planned",
  ON_HOLD: "On hold",
};

export const ROOM_TYPES_AR: Record<string, string> = {
  STANDARD: "عادية", DELUXE: "فاخرة", SUITE: "جناح", PRESIDENTIAL: "جناح رئاسي",
};
export const ROOM_TYPES_EN: Record<string, string> = {
  STANDARD: "Standard", DELUXE: "Deluxe", SUITE: "Suite", PRESIDENTIAL: "Presidential",
};

export const TIERS_AR: Record<string, string> = {
  LUXURY: "فاخر", BUSINESS: "أعمال", RESORT: "منتجع", BOUTIQUE: "بوتيك",
};
export const TIERS_EN: Record<string, string> = {
  LUXURY: "Luxury", BUSINESS: "Business", RESORT: "Resort", BOUTIQUE: "Boutique",
};

export const FARM_TYPES_AR: Record<string, string> = {
  GREENHOUSE: "دفيئة ذكية", OPEN_FIELD: "حقل مفتوح", LIVESTOCK: "ثروة حيوانية", POULTRY: "دواجن",
};
export const FARM_TYPES_EN: Record<string, string> = {
  GREENHOUSE: "Smart Greenhouse", OPEN_FIELD: "Open Field", LIVESTOCK: "Livestock", POULTRY: "Poultry",
};

export const VERTICALS_AR: Record<string, string> = {
  AI: "ذكاء اصطناعي", FINTECH: "تقنية مالية", ECOMMERCE: "تجارة إلكترونية",
  AGRITECH: "تقنية زراعية", EDTECH: "تقنية تعليم", OTHER: "أخرى",
};
export const VERTICALS_EN: Record<string, string> = {
  AI: "Artificial Intelligence", FINTECH: "FinTech", ECOMMERCE: "E-commerce",
  AGRITECH: "AgriTech", EDTECH: "EdTech", OTHER: "Other",
};

export const ROLES_AR: Record<string, string> = {
  ADMIN: "مدير النظام", EXECUTIVE: "إدارة عليا", MANAGER: "مدير وحدة", STAFF: "موظف",
};
export const ROLES_EN: Record<string, string> = {
  ADMIN: "System Admin", EXECUTIVE: "Executive", MANAGER: "Unit Manager", STAFF: "Staff",
};

export const CATEGORIES_AR: Record<string, string> = {
  DAIRY: "ألبان", PRODUCE: "خضروات وفواكه", MEAT: "لحوم", BAKERY: "مخبوزات", BEVERAGE: "مشروبات",
};
export const CATEGORIES_EN: Record<string, string> = {
  DAIRY: "Dairy", PRODUCE: "Produce", MEAT: "Meat", BAKERY: "Bakery", BEVERAGE: "Beverage",
};

export function ar(dict: Record<string, string>, key: string | null | undefined) {
  if (!key) return "—";
  return dict[key] ?? key;
}

// Pick the right dictionary based on locale.
export function loc(
  dictAr: Record<string, string>,
  dictEn: Record<string, string>,
  locale: "ar" | "en",
  key: string | null | undefined,
): string {
  if (!key) return "—";
  const d = locale === "ar" ? dictAr : dictEn;
  return d[key] ?? key;
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "badge-emerald", READY: "badge-emerald", DISTRIBUTED: "badge-emerald",
    HARVESTED: "badge-emerald", CONFIRMED: "badge-emerald", CHECKED_IN: "badge-emerald",
    APPROVED: "badge-emerald", EXECUTED: "badge-blue", OK: "badge-emerald",
    GROWING: "badge-blue", RAMPING: "badge-amber", PENDING: "badge-amber",
    DRAFT: "badge-slate", INTAKE: "badge-slate", ACCELERATING: "badge-blue",
    GRADUATED: "badge-emerald", QC: "badge-amber", IN_PRODUCTION: "badge-blue",
    HARVESTING: "badge-amber", WARN: "badge-amber", CRITICAL: "badge-red",
    PAUSED: "badge-slate", DISMISSED: "badge-slate", CHECKED_OUT: "badge-slate",
    CANCELLED: "badge-red", RECALLED: "badge-red", FAILED: "badge-red",
    STALLED: "badge-red", OPEN: "badge-amber", ACKNOWLEDGED: "badge-blue",
    RESOLVED: "badge-emerald",
    TODO: "badge-slate", IN_PROGRESS: "badge-blue", DONE: "badge-emerald", BLOCKED: "badge-red",
    IDEA: "badge-slate", RESEARCH: "badge-blue", PLANNED: "badge-amber",
    ON_HOLD: "badge-slate",
  };
  return map[status] ?? "badge-slate";
}

export function severityBadge(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "badge-red";
    case "WARN": return "badge-amber";
    case "OPPORTUNITY": return "badge-gold";
    default: return "badge-blue";
  }
}

export function severityAr(severity: string): string {
  return ({
    INFO: "معلومة", WARN: "تحذير", CRITICAL: "حرج", OPPORTUNITY: "فرصة",
  } as Record<string, string>)[severity] ?? severity;
}
export function severityEn(severity: string): string {
  return ({
    INFO: "Info", WARN: "Warning", CRITICAL: "Critical", OPPORTUNITY: "Opportunity",
  } as Record<string, string>)[severity] ?? severity;
}
