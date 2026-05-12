// Alert Rule Engine — user-configurable threshold rules that auto-create
// AIInsights when triggered. Each rule kind has a definition + evaluator.

import "server-only";
import { prisma } from "./db";

export type AlertKind =
  | "REVENUE_DROP"
  | "OCCUPANCY_HIGH"
  | "OCCUPANCY_LOW"
  | "EXPIRY_SOON"
  | "FARM_CRITICAL"
  | "ESG_GAP"
  | "STALE_FORECAST"
  | "MARGIN_TOP";

export type AlertSeverity = "INFO" | "WARN" | "CRITICAL" | "OPPORTUNITY";

export type AlertKindDef = {
  kind: AlertKind;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  module: "HOTELS" | "DAIRY" | "FARMS" | "SUPPLY" | "FINANCE" | "EDUCATION";
  defaultSeverity: AlertSeverity;
  defaultThreshold: number;
  thresholdLabel_ar: string;
  thresholdLabel_en: string;
  thresholdSuffix: string;
  thresholdMin: number;
  thresholdMax: number;
  thresholdStep: number;
  icon: string; // lucide icon key
  tone: "rose" | "amber" | "emerald" | "blue" | "violet";
};

export const ALERT_KINDS: Record<AlertKind, AlertKindDef> = {
  REVENUE_DROP: {
    kind: "REVENUE_DROP",
    name_ar: "تراجع الإيرادات",
    name_en: "Revenue drop",
    description_ar: "ينطلق عند انخفاض إيرادات شركة بنسبة معينة مقارنة بـ 14 يوم سابقة.",
    description_en: "Triggers when a company's revenue drops by X% vs prior 14 days.",
    module: "FINANCE",
    defaultSeverity: "CRITICAL",
    defaultThreshold: 25,
    thresholdLabel_ar: "نسبة التراجع",
    thresholdLabel_en: "Drop threshold",
    thresholdSuffix: "%",
    thresholdMin: 5,
    thresholdMax: 90,
    thresholdStep: 5,
    icon: "TrendingDown",
    tone: "rose",
  },
  OCCUPANCY_HIGH: {
    kind: "OCCUPANCY_HIGH",
    name_ar: "إشغال فندقي مرتفع",
    name_en: "High hotel occupancy",
    description_ar: "ينطلق عند وصول إشغال فندق إلى نسبة معينة — فرصة لتنسيق التوريد.",
    description_en: "Triggers when a hotel's occupancy hits the threshold — supply chain opportunity.",
    module: "HOTELS",
    defaultSeverity: "OPPORTUNITY",
    defaultThreshold: 80,
    thresholdLabel_ar: "نسبة الإشغال",
    thresholdLabel_en: "Occupancy threshold",
    thresholdSuffix: "%",
    thresholdMin: 50,
    thresholdMax: 100,
    thresholdStep: 5,
    icon: "Hotel",
    tone: "amber",
  },
  OCCUPANCY_LOW: {
    kind: "OCCUPANCY_LOW",
    name_ar: "إشغال فندقي منخفض",
    name_en: "Low hotel occupancy",
    description_ar: "ينطلق عند انخفاض إشغال فندق دون نسبة معينة — راجع التسعير.",
    description_en: "Triggers when occupancy falls below threshold — pricing review needed.",
    module: "HOTELS",
    defaultSeverity: "WARN",
    defaultThreshold: 25,
    thresholdLabel_ar: "حد الإشغال الأدنى",
    thresholdLabel_en: "Min occupancy",
    thresholdSuffix: "%",
    thresholdMin: 10,
    thresholdMax: 50,
    thresholdStep: 5,
    icon: "TrendingDown",
    tone: "amber",
  },
  EXPIRY_SOON: {
    kind: "EXPIRY_SOON",
    name_ar: "صلاحية ألبان قريبة",
    name_en: "Dairy expiring soon",
    description_ar: "ينطلق عند اقتراب انتهاء صلاحية دفعات ألبان غير موزعة خلال X ساعة.",
    description_en: "Triggers when undistributed dairy batches expire within X hours.",
    module: "DAIRY",
    defaultSeverity: "WARN",
    defaultThreshold: 72,
    thresholdLabel_ar: "ساعات قبل الانتهاء",
    thresholdLabel_en: "Hours before expiry",
    thresholdSuffix: " hr",
    thresholdMin: 12,
    thresholdMax: 168,
    thresholdStep: 12,
    icon: "Clock",
    tone: "rose",
  },
  FARM_CRITICAL: {
    kind: "FARM_CRITICAL",
    name_ar: "تنبيه مزرعة حرج",
    name_en: "Farm critical alert",
    description_ar: "ينطلق عند وصول أي مزرعة لحالة حرجة (قراءات مستشعرات شاذة).",
    description_en: "Triggers when any farm enters CRITICAL state (anomalous sensor readings).",
    module: "FARMS",
    defaultSeverity: "CRITICAL",
    defaultThreshold: 1,
    thresholdLabel_ar: "حد العدد",
    thresholdLabel_en: "Count threshold",
    thresholdSuffix: "",
    thresholdMin: 1,
    thresholdMax: 10,
    thresholdStep: 1,
    icon: "AlertTriangle",
    tone: "rose",
  },
  ESG_GAP: {
    kind: "ESG_GAP",
    name_ar: "فجوة ESG",
    name_en: "ESG gap",
    description_ar: "ينطلق عند انخفاض ESG شركة عن متوسط المجموعة بنسبة معينة.",
    description_en: "Triggers when a company's ESG falls X points below group avg.",
    module: "FINANCE",
    defaultSeverity: "WARN",
    defaultThreshold: 10,
    thresholdLabel_ar: "فجوة النقاط",
    thresholdLabel_en: "Point gap",
    thresholdSuffix: " pts",
    thresholdMin: 3,
    thresholdMax: 30,
    thresholdStep: 1,
    icon: "Leaf",
    tone: "emerald",
  },
  STALE_FORECAST: {
    kind: "STALE_FORECAST",
    name_ar: "تنبؤات معلّقة",
    name_en: "Stale forecasts",
    description_ar: "ينطلق عندما تبقى تنبؤات بحالة DRAFT بدون قرار لأكثر من X يوم.",
    description_en: "Triggers when forecasts sit in DRAFT for more than X days.",
    module: "SUPPLY",
    defaultSeverity: "WARN",
    defaultThreshold: 7,
    thresholdLabel_ar: "أيام بدون قرار",
    thresholdLabel_en: "Days pending",
    thresholdSuffix: " d",
    thresholdMin: 1,
    thresholdMax: 30,
    thresholdStep: 1,
    icon: "Brain",
    tone: "violet",
  },
  MARGIN_TOP: {
    kind: "MARGIN_TOP",
    name_ar: "هامش ربح متفوق",
    name_en: "Top margin opportunity",
    description_ar: "ينطلق عند تجاوز هامش شركة لنسبة معينة — اقتراح زيادة الاستثمار.",
    description_en: "Triggers when a company's margin exceeds X% — invest more there.",
    module: "FINANCE",
    defaultSeverity: "OPPORTUNITY",
    defaultThreshold: 40,
    thresholdLabel_ar: "هامش الربح",
    thresholdLabel_en: "Margin threshold",
    thresholdSuffix: "%",
    thresholdMin: 20,
    thresholdMax: 80,
    thresholdStep: 5,
    icon: "TrendingUp",
    tone: "emerald",
  },
};

/** Seed default rules — call once after first deploy. */
export async function seedDefaultRules(userId: string | null) {
  const existing = await prisma.alertRule.count();
  if (existing > 0) return { seeded: 0, skipped: existing };

  let seeded = 0;
  for (const def of Object.values(ALERT_KINDS)) {
    await prisma.alertRule.create({
      data: {
        kind: def.kind,
        name: def.name_ar,
        nameEn: def.name_en,
        description: def.description_ar,
        severity: def.defaultSeverity,
        threshold: def.defaultThreshold,
        isActive: true,
        cooldownHours: 24,
        createdById: userId,
      },
    });
    seeded += 1;
  }
  return { seeded, skipped: 0 };
}
