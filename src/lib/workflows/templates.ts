// templates.ts — registry of workflow primitives.
//
// Every node on the studio canvas is an instance of one of these.
// Triggers fire on a domain event; conditions filter; actions execute.
// New verticals add to this catalog without touching the runtime.
//
// Phase 12 of docs/governance/PHASES-INTELLIGENCE.md.

export type ParamSpec =
  | { name: string; label: string; type: "number"; default: number; min?: number; max?: number; suffix?: string }
  | { name: string; label: string; type: "string"; default: string; placeholder?: string }
  | { name: string; label: string; type: "select"; default: string; options: { value: string; label: string }[] };

export type Template = {
  key: string;
  kind: "trigger" | "condition" | "action";
  module: "DAIRY" | "HOTELS" | "FARMS" | "FINANCE" | "GROUP" | "EDUCATION" | "TIME";
  labelEn: string;
  labelAr: string;
  description: string;
  // Default visual column on the canvas.
  // 1 = trigger lane, 2 = condition lane, 3 = action lane.
  defaultColumn: 1 | 2 | 3;
  params: ParamSpec[];
  // Compact one-line summary used inside a node card.
  summary: (params: any) => string;
};

const TEMPLATES_RAW: Template[] = [
  // ── TRIGGERS ─────────────────────────────────────────────────────
  {
    key: "dairy.expiry_within",
    kind: "trigger",
    module: "DAIRY",
    labelEn: "Dairy expiry approaching",
    labelAr: "اقتراب انتهاء صلاحية ألبان",
    description: "Fires when any dairy batch has expiry within N days.",
    defaultColumn: 1,
    params: [
      { name: "days", label: "Within days", type: "number", default: 3, min: 1, max: 30 },
    ],
    summary: (p) => `expiry within ${p.days ?? 3}d`,
  },
  {
    key: "hotel.occupancy_below",
    kind: "trigger",
    module: "HOTELS",
    labelEn: "Hotel occupancy drop",
    labelAr: "انخفاض إشغال فندقي",
    description: "Fires when group occupancy crosses below a threshold.",
    defaultColumn: 1,
    params: [
      { name: "pct", label: "Below percent", type: "number", default: 30, min: 5, max: 95, suffix: "%" },
    ],
    summary: (p) => `occupancy < ${p.pct ?? 30}%`,
  },
  {
    key: "farm.moisture_below",
    kind: "trigger",
    module: "FARMS",
    labelEn: "Farm moisture critical",
    labelAr: "رطوبة مزرعة حرجة",
    description: "Fires when soil moisture stays below floor for N hours.",
    defaultColumn: 1,
    params: [
      { name: "pct", label: "Floor", type: "number", default: 30, min: 10, max: 60, suffix: "%" },
      { name: "hours", label: "Sustained for", type: "number", default: 24, min: 1, max: 168, suffix: "h" },
    ],
    summary: (p) => `moisture < ${p.pct ?? 30}% for ${p.hours ?? 24}h`,
  },
  {
    key: "revenue.delta_above",
    kind: "trigger",
    module: "FINANCE",
    labelEn: "Revenue spike",
    labelAr: "ارتفاع إيرادات",
    description: "Fires when group revenue moves > N% in the active window.",
    defaultColumn: 1,
    params: [
      { name: "pct", label: "Move above", type: "number", default: 15, min: 1, max: 200, suffix: "%" },
    ],
    summary: (p) => `revenue Δ > ${p.pct ?? 15}%`,
  },
  {
    key: "time.daily",
    kind: "trigger",
    module: "TIME",
    labelEn: "Daily at time",
    labelAr: "يومياً في وقت محدد",
    description: "Fires once a day at the specified hour (24h, server tz).",
    defaultColumn: 1,
    params: [
      { name: "hour", label: "Hour", type: "number", default: 9, min: 0, max: 23 },
    ],
    summary: (p) => `daily @ ${String(p.hour ?? 9).padStart(2, "0")}:00`,
  },

  // ── CONDITIONS ───────────────────────────────────────────────────
  {
    key: "filter.business_hours",
    kind: "condition",
    module: "GROUP",
    labelEn: "Business hours only",
    labelAr: "ضمن ساعات العمل فقط",
    description: "Pass only if current time is within business hours (08-17).",
    defaultColumn: 2,
    params: [],
    summary: () => "08:00 – 17:00",
  },
  {
    key: "filter.weekday",
    kind: "condition",
    module: "GROUP",
    labelEn: "Weekday only",
    labelAr: "أيام العمل فقط",
    description: "Pass only Sunday through Thursday.",
    defaultColumn: 2,
    params: [],
    summary: () => "Sun – Thu",
  },
  {
    key: "filter.severity_at_least",
    kind: "condition",
    module: "GROUP",
    labelEn: "Severity at least",
    labelAr: "خطورة لا تقل عن",
    description: "Pass only if the trigger payload's severity ≥ level.",
    defaultColumn: 2,
    params: [
      {
        name: "level",
        label: "Level",
        type: "select",
        default: "WARN",
        options: [
          { value: "INFO", label: "Info" },
          { value: "WARN", label: "Warn" },
          { value: "CRITICAL", label: "Critical" },
        ],
      },
    ],
    summary: (p) => `≥ ${p.level ?? "WARN"}`,
  },
  {
    key: "filter.tenant_pack",
    kind: "condition",
    module: "GROUP",
    labelEn: "Tenant has pack",
    labelAr: "لدى المستأجر الحزمة",
    description: "Pass only if the active tenant has the named industry pack enabled.",
    defaultColumn: 2,
    params: [
      {
        name: "pack",
        label: "Pack",
        type: "select",
        default: "dairy",
        options: [
          { value: "hospitality", label: "Hospitality" },
          { value: "dairy", label: "Dairy" },
          { value: "agri", label: "Agriculture" },
          { value: "education", label: "Education" },
          { value: "finance", label: "Finance" },
        ],
      },
    ],
    summary: (p) => `pack = ${p.pack ?? "dairy"}`,
  },

  // ── ACTIONS ──────────────────────────────────────────────────────
  {
    key: "action.notify_slack",
    kind: "action",
    module: "GROUP",
    labelEn: "Notify Slack",
    labelAr: "إشعار Slack",
    description: "Post a message to a Slack channel (via the Integrations Hub).",
    defaultColumn: 3,
    params: [
      { name: "channel", label: "Channel", type: "string", default: "procurement", placeholder: "channel-name" },
    ],
    summary: (p) => `#${p.channel ?? "procurement"}`,
  },
  {
    key: "action.notify_email",
    kind: "action",
    module: "GROUP",
    labelEn: "Email recipients",
    labelAr: "إرسال بريد",
    description: "Send an email digest to one or more recipients.",
    defaultColumn: 3,
    params: [
      { name: "to", label: "To", type: "string", default: "ops@hourani.jo", placeholder: "name@domain" },
    ],
    summary: (p) => `to ${p.to ?? "ops@…"}`,
  },
  {
    key: "action.create_insight",
    kind: "action",
    module: "GROUP",
    labelEn: "Create insight",
    labelAr: "إنشاء إشارة",
    description: "Create an AIInsight visible in /insights.",
    defaultColumn: 3,
    params: [
      {
        name: "severity",
        label: "Severity",
        type: "select",
        default: "WARN",
        options: [
          { value: "INFO", label: "Info" },
          { value: "WARN", label: "Warn" },
          { value: "CRITICAL", label: "Critical" },
          { value: "OPPORTUNITY", label: "Opportunity" },
        ],
      },
    ],
    summary: (p) => `insight @ ${p.severity ?? "WARN"}`,
  },
  {
    key: "action.generate_plan",
    kind: "action",
    module: "GROUP",
    labelEn: "Generate plan",
    labelAr: "توليد خطة",
    description: "Hand the trigger payload to the Planner and produce a draft plan.",
    defaultColumn: 3,
    params: [],
    summary: () => "→ /plans",
  },
  {
    key: "action.convene_council",
    kind: "action",
    module: "GROUP",
    labelEn: "Convene council",
    labelAr: "عقد المجلس",
    description: "Run the multi-agent council on a topic templated from the trigger.",
    defaultColumn: 3,
    params: [
      { name: "topic", label: "Topic template", type: "string", default: "Triage incoming signal", placeholder: "Should we …?" },
    ],
    summary: (p) => `council("${(p.topic ?? "topic").slice(0, 24)}…")`,
  },
  {
    key: "action.record_memory",
    kind: "action",
    module: "GROUP",
    labelEn: "Record to memory",
    labelAr: "تسجيل في الذاكرة",
    description: "Persist the event into the long-term memory lake.",
    defaultColumn: 3,
    params: [],
    summary: () => "→ memory lake",
  },
];

export const TEMPLATES: Record<string, Template> = Object.fromEntries(
  TEMPLATES_RAW.map((t) => [t.key, t])
);

export function templatesByKind(kind: Template["kind"]): Template[] {
  return TEMPLATES_RAW.filter((t) => t.kind === kind);
}

export function getTemplate(key: string): Template | null {
  return TEMPLATES[key] ?? null;
}

export function defaultParams(t: Template): Record<string, any> {
  const out: Record<string, any> = {};
  for (const p of t.params) out[p.name] = p.default;
  return out;
}
