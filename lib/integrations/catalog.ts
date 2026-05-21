// catalog.ts — the 24 integrations H-Nerve ships with, organized into 6
// categories. Each entry carries a brand color, a one-line description,
// the OAuth scopes it would request in production, and a short list of
// "settings" the connect flow needs (e.g. Slack channels).
//
// Phase 13 of docs/PHASES-INTELLIGENCE.md.

export type IntegrationCategory =
  | "messaging"
  | "email"
  | "calendar"
  | "banking"
  | "iot"
  | "commerce";

// Phase V3-NEW-7 — buildout state, separate from per-tenant connection
// status. "READY_FOR_SETUP" = OAuth/API-key flow wired today (the
// Connect button works). "INFRASTRUCTURE_READY" = UI + DB + scopes
// listed; OAuth/webhook wiring rolls out per priority. "COMING_SOON"
// = roadmap only. Honest defaults below — flip to READY_FOR_SETUP /
// LIVE per provider as wiring lands.
export type FunctionalState =
  | "COMING_SOON"
  | "INFRASTRUCTURE_READY"
  | "READY_FOR_SETUP"
  | "LIVE";

export type IntegrationProvider = {
  key: string;
  name: string;
  nameAr: string;
  category: IntegrationCategory;
  // Brand-ish color used as the tile accent rail. Heritage palette where
  // possible; for explicit brands we use a tasteful muted variant.
  brandColor: string;
  // Short emoji/glyph mark (we don't ship third-party logos to avoid
  // licensing / attribution issues; the glyph evokes the brand).
  glyph: string;
  description: string;
  descriptionAr: string;
  scopes: string[];
  // Phase V3-NEW-7 — pitch-honest buildout state. Defaults below.
  functionalState: FunctionalState;
  // Per-provider connect-flow setting fields.
  settingFields?: Array<{ key: string; label: string; type: "text" | "select"; default?: string; options?: string[] }>;
};

// Tones map to HeritagePill ("success" | "warn" | "critical" |
// "info" | "neutral").
export const FUNCTIONAL_STATE_LABEL: Record<
  FunctionalState,
  { en: string; ar: string; tone: "neutral" | "warn" | "success" | "info" }
> = {
  COMING_SOON:          { en: "Coming soon",          ar: "قريباً",         tone: "neutral" },
  INFRASTRUCTURE_READY: { en: "Infrastructure ready", ar: "البنية جاهزة",   tone: "warn"    },
  READY_FOR_SETUP:      { en: "Ready for setup",      ar: "جاهز للإعداد",  tone: "success" },
  LIVE:                 { en: "Live",                 ar: "مفعّل",          tone: "success" },
};

export const CATEGORIES: Record<IntegrationCategory, { en: string; ar: string }> = {
  messaging: { en: "Messaging",  ar: "المراسلة" },
  email:     { en: "Email",      ar: "البريد الإلكتروني" },
  calendar:  { en: "Calendar",   ar: "التقويم" },
  banking:   { en: "Banking",    ar: "بنوك ومدفوعات" },
  iot:       { en: "IoT",        ar: "إنترنت الأشياء" },
  commerce:  { en: "Commerce",   ar: "تجارة" },
};

export const PROVIDERS: IntegrationProvider[] = [
  // ── MESSAGING ────────────────────────────────────────────────────
  {
    key: "slack",
    name: "Slack",
    nameAr: "سلاك",
    category: "messaging",
    brandColor: "#4A154B",
    glyph: "▦",
    description: "Stream alerts, plans, and council recommendations into Slack channels.",
    descriptionAr: "أرسل التنبيهات والخطط وتوصيات المجلس إلى قنوات Slack.",
    scopes: ["chat:write", "channels:read", "users:read"],
    functionalState: "INFRASTRUCTURE_READY",
    settingFields: [
      { key: "defaultChannel", label: "Default channel", type: "text", default: "procurement" },
    ],
  },
  {
    key: "teams",
    name: "Microsoft Teams",
    nameAr: "مايكروسوفت تيمز",
    category: "messaging",
    brandColor: "#4B53BC",
    glyph: "◫",
    description: "Post adaptive cards into Teams channels with one-click acknowledgement.",
    descriptionAr: "انشر بطاقات تكيّفية في قنوات تيمز مع تأكيد بنقرة واحدة.",
    scopes: ["ChannelMessage.Send", "Team.ReadBasic.All"],
    functionalState: "INFRASTRUCTURE_READY",
    settingFields: [
      { key: "team", label: "Team", type: "text", default: "Operations" },
    ],
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    nameAr: "واتساب أعمال",
    category: "messaging",
    brandColor: "#25D366",
    glyph: "❍",
    description: "Send approved templates to staff phones — works across MENA telcos.",
    descriptionAr: "أرسل قوالب معتمدة إلى هواتف الموظفين — متوافق مع شركات الاتصالات في المنطقة.",
    scopes: ["messages.send", "templates.read"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "telegram",
    name: "Telegram",
    nameAr: "تليجرام",
    category: "messaging",
    brandColor: "#0088cc",
    glyph: "✈",
    description: "Bot-driven group notifications for ops teams who already live in Telegram.",
    descriptionAr: "إشعارات مجموعات عبر بوت لفرق العمليات التي تعتمد تليجرام.",
    scopes: ["bot.send", "bot.read_chat"],
    functionalState: "INFRASTRUCTURE_READY",
  },

  // ── EMAIL ────────────────────────────────────────────────────────
  {
    key: "gmail",
    name: "Gmail",
    nameAr: "جي ميل",
    category: "email",
    brandColor: "#EA4335",
    glyph: "✉",
    description: "Send digests and approval requests via Gmail with executive-grade typography.",
    descriptionAr: "أرسل الملخصات وطلبات الموافقة عبر جي ميل بتنسيق تنفيذي.",
    scopes: ["gmail.send", "gmail.compose"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "outlook",
    name: "Outlook",
    nameAr: "أوتلوك",
    category: "email",
    brandColor: "#0078D4",
    glyph: "▣",
    description: "Microsoft 365 mailbox connector. Same surface as Gmail — different stack.",
    descriptionAr: "موصل صناديق بريد Microsoft 365 — نفس السطح، مكدس مختلف.",
    scopes: ["Mail.Send", "Mail.Read"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "sendgrid",
    name: "SendGrid",
    nameAr: "سند جريد",
    category: "email",
    brandColor: "#1A82E2",
    glyph: "▷",
    description: "Transactional email at scale with delivery analytics.",
    descriptionAr: "بريد معاملاتي بحجم كبير مع تحليلات التسليم.",
    scopes: ["mail.send"],
    // Phase Pre-pitch SWEEP-2 — reverted to INFRASTRUCTURE_READY.
    // The dedicated API-key modal + validation flow isn't built yet;
    // clicking Connect would mark the card CONNECTED without sending
    // a single email — that's pitch-misleading. Honest until wired.
    functionalState: "INFRASTRUCTURE_READY",
    settingFields: [
      { key: "fromAddress", label: "From address", type: "text", default: "ops@hourani.jo" },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    nameAr: "ريسند",
    category: "email",
    brandColor: "#000000",
    glyph: "◍",
    description: "Modern API-first email — beautiful templates, first-class tracking.",
    descriptionAr: "بريد إلكتروني عصري عبر API — قوالب أنيقة وتتبّع متقدّم.",
    scopes: ["emails:send"],
    // Phase Pre-pitch SWEEP-2 — see SendGrid comment.
    functionalState: "INFRASTRUCTURE_READY",
  },

  // ── CALENDAR ─────────────────────────────────────────────────────
  {
    key: "google_calendar",
    name: "Google Calendar",
    nameAr: "تقويم جوجل",
    category: "calendar",
    brandColor: "#4285F4",
    glyph: "▤",
    description: "Auto-schedule plan reviews and council sessions on the team calendar.",
    descriptionAr: "جدولة تلقائية لمراجعات الخطط وجلسات المجلس على تقويم الفريق.",
    scopes: ["calendar.events", "calendar.readonly"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "outlook_calendar",
    name: "Outlook Calendar",
    nameAr: "تقويم أوتلوك",
    category: "calendar",
    brandColor: "#0078D4",
    glyph: "▥",
    description: "Mirror of Google Calendar for Microsoft 365 shops.",
    descriptionAr: "نظير تقويم جوجل للمؤسسات على Microsoft 365.",
    scopes: ["Calendars.ReadWrite"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "calcom",
    name: "Cal.com",
    nameAr: "كال دوت كوم",
    category: "calendar",
    brandColor: "#111827",
    glyph: "◴",
    description: "Self-hostable scheduling — perfect for council intake from external founders.",
    descriptionAr: "جدولة قابلة للاستضافة الذاتية — مثالية لاستقبال المؤسسين الخارجيين.",
    scopes: ["bookings.read", "bookings.write"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "calendly",
    name: "Calendly",
    nameAr: "كالندلي",
    category: "calendar",
    brandColor: "#006BFF",
    glyph: "◵",
    description: "Drop a Calendly link into any plan — bookings flow back into the brain.",
    descriptionAr: "أرفق رابط Calendly بأي خطة — تعود الحجوزات إلى الدماغ.",
    scopes: ["scheduled_events.read"],
    functionalState: "INFRASTRUCTURE_READY",
  },

  // ── BANKING / PAYMENTS ───────────────────────────────────────────
  {
    key: "plaid",
    name: "Plaid",
    nameAr: "بلايد",
    category: "banking",
    brandColor: "#1A1A1A",
    glyph: "▰",
    description: "Bank account connectivity — read transactions, balances, and identity.",
    descriptionAr: "ربط الحسابات البنكية — قراءة المعاملات والأرصدة والهوية.",
    scopes: ["transactions", "accounts", "identity"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "open_banking_jo",
    name: "Open Banking JO",
    nameAr: "البنوك المفتوحة الأردن",
    category: "banking",
    brandColor: "#1F4E4A",
    glyph: "◇",
    description: "Jordanian PSD-style connector for direct CBJ-licensed institutions.",
    descriptionAr: "موصل بنوك أردنية مرخّصة من البنك المركزي بنمط PSD.",
    scopes: ["accounts.read", "transactions.read"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "stripe",
    name: "Stripe",
    nameAr: "سترايب",
    category: "banking",
    brandColor: "#635BFF",
    glyph: "𝓢",
    description: "Card processing + subscription billing for tenant SaaS plans.",
    descriptionAr: "معالجة البطاقات والاشتراكات لخطط SaaS للمستأجرين.",
    scopes: ["read_charges", "write_charges", "read_subscriptions"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "quickbooks",
    name: "QuickBooks",
    nameAr: "كويك بوكس",
    category: "banking",
    brandColor: "#2CA01C",
    glyph: "𝓠",
    description: "Two-way sync with the canonical SMB ledger for finance closes.",
    descriptionAr: "مزامنة ثنائية مع دفتر الأستاذ القياسي للمؤسسات الصغيرة.",
    scopes: ["com.intuit.quickbooks.accounting"],
    functionalState: "INFRASTRUCTURE_READY",
  },

  // ── IOT ──────────────────────────────────────────────────────────
  {
    key: "mqtt",
    name: "MQTT broker",
    nameAr: "وسيط MQTT",
    category: "iot",
    brandColor: "#660066",
    glyph: "⌬",
    description: "Subscribe to sensor topics; route into the brain's event stream.",
    descriptionAr: "اشترك بمواضيع المستشعرات وادفعها إلى تيار أحداث الدماغ.",
    scopes: ["topic.subscribe"],
    functionalState: "INFRASTRUCTURE_READY",
    settingFields: [
      { key: "host",  label: "Broker host", type: "text", default: "mqtt://broker.local:1883" },
      { key: "topic", label: "Subscribe topic", type: "text", default: "sensors/+/moisture" },
    ],
  },
  {
    key: "aws_iot",
    name: "AWS IoT Core",
    nameAr: "AWS IoT Core",
    category: "iot",
    brandColor: "#FF9900",
    glyph: "⌭",
    description: "Managed MQTT + device shadow + rules engine, hosted by AWS.",
    descriptionAr: "MQTT مُدار + ظلال أجهزة + محرك قواعد على AWS.",
    scopes: ["iot:Connect", "iot:Subscribe"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "sigfox",
    name: "Sigfox",
    nameAr: "سيج فوكس",
    category: "iot",
    brandColor: "#E50046",
    glyph: "◬",
    description: "Low-power wide-area sensor network — for remote farm telemetry.",
    descriptionAr: "شبكة مستشعرات منخفضة الطاقة واسعة النطاق — لقياس المزارع البعيدة.",
    scopes: ["device.read"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "particle",
    name: "Particle",
    nameAr: "بارتيكل",
    category: "iot",
    brandColor: "#00ADEF",
    glyph: "◌",
    description: "Cellular IoT modules with OTA fleet management.",
    descriptionAr: "وحدات IoT خلوية مع إدارة أسطول عبر الهواء.",
    scopes: ["devices.read", "events.subscribe"],
    functionalState: "INFRASTRUCTURE_READY",
  },

  // ── COMMERCE ─────────────────────────────────────────────────────
  {
    key: "shopify",
    name: "Shopify",
    nameAr: "شوبيفاي",
    category: "commerce",
    brandColor: "#7AB55C",
    glyph: "𝓢",
    description: "Storefront orders, inventory, and customer feedback into the brain.",
    descriptionAr: "طلبات المتجر والمخزون وتقييمات العملاء إلى الدماغ.",
    scopes: ["read_orders", "read_inventory"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "woocommerce",
    name: "WooCommerce",
    nameAr: "ووكوميرس",
    category: "commerce",
    brandColor: "#7F54B3",
    glyph: "𝓦",
    description: "WordPress-native e-commerce connector — same shape as Shopify.",
    descriptionAr: "موصل تجارة إلكترونية مدمج مع ووردبريس — نفس البنية.",
    scopes: ["read", "read_write"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "square",
    name: "Square",
    nameAr: "سكوير",
    category: "commerce",
    brandColor: "#3E4348",
    glyph: "▢",
    description: "Point-of-sale data for hospitality F&B — ties Arena tickets to dairy demand.",
    descriptionAr: "بيانات نقاط بيع للضيافة F&B — يربط فواتير أرينا بطلب المها.",
    scopes: ["MERCHANT_PROFILE_READ", "PAYMENTS_READ"],
    functionalState: "INFRASTRUCTURE_READY",
  },
  {
    key: "twilio",
    name: "Twilio",
    nameAr: "توايليو",
    category: "commerce",
    brandColor: "#F22F46",
    glyph: "◆",
    description: "SMS, voice, and verification flows for staff and customers.",
    descriptionAr: "رسائل SMS وصوت وتحقّق للموظفين والعملاء.",
    scopes: ["messages.send", "calls.create"],
    functionalState: "INFRASTRUCTURE_READY",
  },
];

export function getProvider(key: string): IntegrationProvider | null {
  return PROVIDERS.find((p) => p.key === key) ?? null;
}

export function providersByCategory(cat: IntegrationCategory): IntegrationProvider[] {
  return PROVIDERS.filter((p) => p.category === cat);
}
