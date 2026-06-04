// Roadmap source-of-truth. Three buckets — Now / Next / Later — render as a
// 3-column kanban on /roadmap. Each entry carries Arabic + English copy and a
// tone hint so the badge picks the right colour from globals.css.

export type RoadmapStatus = "now" | "next" | "later";
export type RoadmapTone =
  | "emerald"
  | "amber"
  | "violet"
  | "blue"
  | "slate"
  | "gold"
  | "red";

export type RoadmapItem = {
  id: string;
  status: RoadmapStatus;
  tone: RoadmapTone;
  eta?: string; // free text like "Q3 2026" or "v1.4"
  areaAr: string;
  areaEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
};

export const ROADMAP: RoadmapItem[] = [
  // ============== NOW ==============
  {
    id: "postgresql-deploy",
    status: "now",
    tone: "emerald",
    eta: "v1.5 ✓",
    areaAr: "بنية تحتية",
    areaEn: "Infrastructure",
    titleAr: "نشر PostgreSQL + Vercel",
    titleEn: "PostgreSQL on Vercel + stable build",
    descAr:
      "الانتقال من SQLite إلى PostgreSQL عبر Prisma Postgres، إصلاح البناء الإنتاجي، وضمان عرض بيانات حية عبر 31 صفحة.",
    descEn:
      "Migrated from SQLite to PostgreSQL via Prisma Postgres, fixed production build crashes, and guaranteed live data across 31 pages.",
  },
  {
    id: "bulk-actions",
    status: "now",
    tone: "blue",
    eta: "v1.5",
    areaAr: "إنتاجية",
    areaEn: "Productivity",
    titleAr: "إجراءات جماعية على الجداول",
    titleEn: "Bulk actions on list tables",
    descAr:
      "تحديد عدة صفوف وتنفيذ موافقة/رفض/حذف في طلب واحد عبر كل وحدات العمل.",
    descEn:
      "Multi-select rows and approve / reject / delete in one round trip across every module.",
  },
  {
    id: "trash-bin",
    status: "now",
    tone: "emerald",
    eta: "v1.4",
    areaAr: "استرداد",
    areaEn: "Recovery",
    titleAr: "سلة المحذوفات الكاملة",
    titleEn: "Full trash bin recovery surface",
    descAr:
      "صفحة /trash تجمع كل المحذوفات الناعمة من المهام والمشاريع والإشارات والتنبؤات، مع استرجاع جماعي وعدّاد تنازلي حتى لحظة الحذف الدائم.",
    descEn:
      "/trash page aggregates every soft-deleted task / project / insight / forecast with bulk restore and a countdown to the permanent purge.",
  },
  {
    id: "bulk-actions",
    status: "now",
    tone: "blue",
    eta: "v1.4",
    areaAr: "إنتاجية",
    areaEn: "Productivity",
    titleAr: "إجراءات جماعية على الجداول",
    titleEn: "Bulk actions on list tables",
    descAr:
      "تحديد عدة صفوف وتنفيذ موافقة/رفض/حذف في طلب واحد عبر كل وحدات العمل.",
    descEn:
      "Multi-select rows and approve / reject / delete in one round trip across every module.",
  },
  {
    id: "saved-views",
    status: "now",
    tone: "violet",
    eta: "v1.4",
    areaAr: "تخصيص",
    areaEn: "Personalization",
    titleAr: "حفظ مرشحات التصفية",
    titleEn: "Saved filter views",
    descAr:
      "تثبيت مرشحات على صفحات القوائم (مثل: مهامي العاجلة، تنبؤات بثقة > 80٪) ومشاركتها برابط.",
    descEn:
      "Pin filter combos on list pages (e.g. my urgent tasks, forecasts above 80% confidence) and share them by URL.",
  },
  {
    id: "audit-log-viewer",
    status: "now",
    tone: "amber",
    eta: "v1.4",
    areaAr: "حوكمة",
    areaEn: "Governance",
    titleAr: "عارض سجل النشاط الموحّد",
    titleEn: "Unified activity-log viewer",
    descAr:
      "كل CREATE / UPDATE / DELETE / RESTORE يسجَّل فعلياً — يبقى توصيله بشاشة /activity ومرشحات على المستخدم والوحدة.",
    descEn:
      "Every CREATE / UPDATE / DELETE / RESTORE is already captured — wire it to /activity with filters by user and module.",
  },

  // ============== NEXT ==============
  {
    id: "ai-briefing",
    status: "next",
    tone: "violet",
    eta: "Q3 2026",
    areaAr: "ذكاء",
    areaEn: "AI",
    titleAr: "إيجاز تنفيذي يومي بالذكاء الاصطناعي",
    titleEn: "Daily AI executive briefing",
    descAr:
      "تقرير صباحي مولّد آلياً يلخّص حركة المجموعة في 5 أسطر — حجوزات، إنتاج، مالية، شذوذ، ومهمة اليوم.",
    descEn:
      "An auto-generated morning brief summarising the group's pulse in 5 lines — bookings, production, cash, anomalies, and today's focus.",
  },
  {
    id: "mobile-pwa",
    status: "next",
    tone: "blue",
    eta: "Q3 2026",
    areaAr: "تطبيق",
    areaEn: "App",
    titleAr: "تطبيق جوال PWA",
    titleEn: "Mobile PWA companion",
    descAr:
      "نسخة محسّنة لشاشات الهاتف لكبار المسؤولين — KPIs ولوحات إشارات قابلة للتمرير، إخطارات Push.",
    descEn:
      "Phone-optimised companion for execs on the move — scrollable KPI cards, push notifications.",
  },
  {
    id: "api-tokens",
    status: "next",
    tone: "slate",
    eta: "Q3 2026",
    areaAr: "تكامل",
    areaEn: "Integration",
    titleAr: "رموز API + Webhooks",
    titleEn: "API tokens + Webhooks",
    descAr:
      "إصدار رموز للوصول البرمجي إلى موارد العرض الفقط، و Webhooks لتنبيه أنظمة طرف ثالث عند أحداث معيّنة.",
    descEn:
      "Issue read-only API tokens and emit webhooks so third-party systems can react to ERP events.",
  },
  {
    id: "saas-tenants",
    status: "next",
    tone: "gold",
    eta: "Q4 2026",
    areaAr: "SaaS",
    areaEn: "SaaS",
    titleAr: "وضع SaaS متعدد المستأجرين",
    titleEn: "Multi-tenant SaaS mode",
    descAr:
      "الخطوة الأولى نحو ترخيص H‑Nerve لمجموعات الشرق الأوسط الأخرى — عزل بيانات لكل مستأجر، إعدادات علامة تجارية، فوترة.",
    descEn:
      "First step toward licensing H‑Nerve to other Middle-East groups — per-tenant isolation, branding, billing.",
  },

  // ============== LATER ==============
  {
    id: "cashflow-engine",
    status: "later",
    tone: "emerald",
    eta: "2026 H2",
    areaAr: "مالية",
    areaEn: "Finance",
    titleAr: "محرك التدفق النقدي التنبؤي",
    titleEn: "Predictive cash-flow engine",
    descAr:
      "توقع 90 يوم للسيولة لكل شركة بناءً على دورات الإيرادات والمصاريف وأنماط الموسمية الفندقية.",
    descEn:
      "90-day liquidity projection per company driven by revenue/expense cycles and hospitality seasonality patterns.",
  },
  {
    id: "partner-portal",
    status: "later",
    tone: "blue",
    eta: "2026 H2",
    areaAr: "شركاء",
    areaEn: "Partners",
    titleAr: "بوابة B2B للموردين والعملاء",
    titleEn: "B2B partner portal",
    descAr:
      "بوابة محدودة الصلاحيات للموردين الرئيسيين لرفع طلبات تجديد المخزون مباشرة، وللعملاء الكبار لمتابعة طلباتهم.",
    descEn:
      "Scoped portal for major suppliers to file restock requests directly and for key clients to follow their orders.",
  },
  {
    id: "marketplace",
    status: "later",
    tone: "amber",
    eta: "2027",
    areaAr: "نمو",
    areaEn: "Growth",
    titleAr: "تكامل أسواق منتجات المها",
    titleEn: "Maha marketplace integration",
    descAr:
      "ربط المها مباشرة بمنصات البيع التجزيئية الإقليمية مع مزامنة المخزون والأسعار على الفور.",
    descEn:
      "Plug Maha straight into regional retail marketplaces with instant inventory + price sync.",
  },
  {
    id: "voice-cmd",
    status: "later",
    tone: "violet",
    eta: "2027",
    areaAr: "تجربة",
    areaEn: "UX",
    titleAr: "أوامر صوتية بالعربية",
    titleEn: "Arabic voice commands",
    descAr:
      'الانتقال بين الوحدات وتنفيذ إجراءات شائعة بالأمر الصوتي — "اعرض إشغال أرينا".',
    descEn:
      'Navigate modules and run common actions by voice — "show Arena occupancy".',
  },
];
