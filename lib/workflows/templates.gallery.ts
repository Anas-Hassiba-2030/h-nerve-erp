// lib/workflows/templates.gallery.ts — Phase NS-3.
// Named workflow templates the /workflows landing exposes as a "use
// this template" gallery. Each template = name + description + nodes
// + edges. All templateKeys must come from the registered runtime
// templates in lib/workflows/templates.ts; this file is consumed by
// both the landing-page render and the createWorkflowFromTemplate
// server action.

export type GalleryTemplate = {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  flowAr: string;
  flowEn: string;
  enabledByDefault: boolean;
  nodes: Array<{
    kind: "trigger" | "condition" | "action";
    key: string;
    params?: Record<string, any>;
  }>;
  edges: Array<{ from: number; to: number }>;
};

export const TEMPLATE_GALLERY: GalleryTemplate[] = [
  {
    id: "dairy-expiry-redirect",
    nameAr: "انتهاء صلاحية ألبان → تحويل للموزّع",
    nameEn: "Dairy expiry → distributor redirect",
    descAr: "ينبّه المشتريات عند اقتراب صلاحية أي دفعة، يولّد خطة إعادة توجيه، ويسجّل الحدث للذاكرة.",
    descEn: "When a batch is within 3 days of expiry, ping procurement, generate a redirect plan, and record the event.",
    flowAr: "صلاحية ألبان → شدّة على الأقل → سلاك + خطة + ذاكرة",
    flowEn: "Dairy expiry → severity ≥ WARN → Slack + plan + memory",
    enabledByDefault: true,
    nodes: [
      { kind: "trigger",   key: "dairy.expiry_within",      params: { days: 3 } },
      { kind: "condition", key: "filter.severity_at_least", params: { level: "WARN" } },
      { kind: "action",    key: "action.notify_slack",      params: { channel: "procurement" } },
      { kind: "action",    key: "action.generate_plan",     params: {} },
      { kind: "action",    key: "action.record_memory",     params: {} },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ],
  },
  {
    id: "farm-moisture-escalate",
    nameAr: "تنبيه مزرعة حرج → تصعيد",
    nameEn: "Critical farm alert → escalation",
    descAr: "عند هبوط رطوبة التربة تحت 30٪ لـ 24 ساعة، ينشئ إشارة حرجة، ينبّه فريق العمليات، ويعقد المجلس.",
    descEn: "When soil moisture stays under 30% for 24h, create a CRITICAL insight, email ops, and convene the council.",
    flowAr: "رطوبة منخفضة → يوم عمل → إشارة + بريد + مجلس",
    flowEn: "Moisture low → weekday → Insight + email + council",
    enabledByDefault: false,
    nodes: [
      { kind: "trigger",   key: "farm.moisture_below",  params: { pct: 30, hours: 24 } },
      { kind: "condition", key: "filter.weekday",       params: {} },
      { kind: "action",    key: "action.create_insight", params: { severity: "CRITICAL" } },
      { kind: "action",    key: "action.notify_email",   params: { to: "ops@hourani.jo" } },
      { kind: "action",    key: "action.convene_council",params: { topic: "Farm moisture failure — triage now" } },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ],
  },
  {
    id: "hotel-occupancy-escalate",
    nameAr: "إشغال فندق منخفض → تنبيه المدير العام",
    nameEn: "Hotel occupancy low → notify GM",
    descAr: "عند نزول إشغال فندق دون 50٪ خلال ساعات العمل، ينبّه المدير العام بالبريد.",
    descEn: "When hotel occupancy drops below 50% during business hours, email the GM.",
    flowAr: "إشغال < 50٪ → ساعات عمل → بريد",
    flowEn: "Occupancy < 50% → business hours → email",
    enabledByDefault: false,
    nodes: [
      { kind: "trigger",   key: "hotel.occupancy_below",   params: { pct: 50 } },
      { kind: "condition", key: "filter.business_hours",   params: {} },
      { kind: "action",    key: "action.notify_email",     params: { to: "gm@hourani.jo" } },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  },
  {
    id: "revenue-delta-finance",
    nameAr: "تذبذب إيرادات كبير → مراجعة مالية",
    nameEn: "Revenue swing → finance review",
    descAr: "عند تجاوز الإيرادات اليومية لأي شركة تذبذب 25٪ مقارنة بالأمس، ينبّه المالية + يسجّل ذاكرة.",
    descEn: "When daily revenue swings ±25% vs prior day on any company, email finance + record memory.",
    flowAr: "إيراد ± 25٪ → بريد + ذاكرة",
    flowEn: "Revenue ±25% → email + memory",
    enabledByDefault: false,
    nodes: [
      { kind: "trigger",   key: "revenue.delta_above",  params: { pct: 25 } },
      { kind: "action",    key: "action.notify_email",  params: { to: "finance@hourani.jo" } },
      { kind: "action",    key: "action.record_memory", params: {} },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
    ],
  },
  {
    id: "daily-ops-brief",
    nameAr: "ملخّص العمليات اليومي 8 صباحاً",
    nameEn: "Daily 8am operations brief",
    descAr: "كل صباح في الثامنة، يولّد خطّة عمليات اليوم ويرسلها لقناة سلاك.",
    descEn: "Every weekday at 08:00, generate an ops plan and post it to Slack.",
    flowAr: "8ص يومياً → يوم عمل → خطة + سلاك",
    flowEn: "08:00 daily → weekday → plan + Slack",
    enabledByDefault: false,
    nodes: [
      { kind: "trigger",   key: "time.daily",          params: { hour: 8 } },
      { kind: "condition", key: "filter.weekday",      params: {} },
      { kind: "action",    key: "action.generate_plan",params: {} },
      { kind: "action",    key: "action.notify_slack", params: { channel: "operations" } },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
    ],
  },
  {
    id: "high-sev-insight-council",
    nameAr: "إشارة عالية الخطورة → مجلس",
    nameEn: "High-severity insight → council",
    descAr: "أي إشارة جديدة بمستوى CRITICAL، تُحوّل تلقائياً لجلسة مجلس + ذاكرة.",
    descEn: "Any new insight at CRITICAL severity → auto-convene the council + record memory.",
    flowAr: "إشارة جديدة → شدّة CRITICAL → مجلس + ذاكرة",
    flowEn: "New insight → severity CRITICAL → council + memory",
    enabledByDefault: false,
    nodes: [
      { kind: "trigger",   key: "revenue.delta_above",     params: { pct: 50 } },
      { kind: "condition", key: "filter.severity_at_least",params: { level: "CRITICAL" } },
      { kind: "action",    key: "action.convene_council",  params: { topic: "Auto-escalated CRITICAL signal" } },
      { kind: "action",    key: "action.record_memory",    params: {} },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
    ],
  },
];

export function getGalleryTemplate(id: string): GalleryTemplate | undefined {
  return TEMPLATE_GALLERY.find((t) => t.id === id);
}
