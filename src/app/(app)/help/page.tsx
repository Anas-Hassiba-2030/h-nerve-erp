// Help center — keyboard shortcuts, tour of modules, FAQ.
// Ported to the daylight "info" reference (docs/design/system/sections/
// info.html — the help tab): .sec-head header + .panel cards with
// .panel-head / .panel-title and inline-styled <kbd> rows, recoloured to
// the ivory daylight register. First-class onboarding so new users can
// self-serve.

import { getLocale } from "@/lib/i18n/i18n.server";
import "../daylight.css";
import "./info.css";

type Shortcut = { keys: string[]; ar: string; en: string };

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], ar: "فتح لوحة الأوامر", en: "Open command palette" },
  { keys: ["⌘", "B"], ar: "طي/فتح القائمة الجانبية", en: "Toggle sidebar" },
  { keys: ["⌘", "/"], ar: "فتح هذه الصفحة", en: "Open this help" },
  { keys: ["G", "D"], ar: "اذهب إلى اللوحة التنفيذية", en: "Go to dashboard" },
  { keys: ["G", "S"], ar: "اذهب إلى البحث", en: "Go to search" },
  { keys: ["G", "C"], ar: "اذهب إلى الشركات", en: "Go to companies" },
  { keys: ["Esc"], ar: "إغلاق أي حوار", en: "Close any dialog" },
];

type Module = {
  href: string;
  ar: string;
  en: string;
  desc_ar: string;
  desc_en: string;
};

// Developer-facing surfaces (B3 homing) — linked from here, no nav pills.
const DEV_LINKS: Module[] = [
  { href: "/changelog", ar: "سجل التغييرات", en: "Changelog", desc_ar: "ما الجديد في كل إصدار من النظام.", desc_en: "What changed in every release." },
  { href: "/design-system", ar: "نظام التصميم", en: "Design system", desc_ar: "ألوان وخطوط ومكونات Heritage Modern.", desc_en: "Heritage Modern colors, type, and components." },
  { href: "/showcase", ar: "المعرض", en: "Showcase", desc_ar: "عرض حي لمكونات الواجهة وأنماطها.", desc_en: "Live gallery of UI components and patterns." },
];

const MODULES: Module[] = [
  { href: "/dashboard", ar: "اللوحة التنفيذية", en: "Executive dashboard", desc_ar: "نظرة شاملة على نبض المجموعة في شاشة واحدة.", desc_en: "Whole-group pulse in one screen." },
  { href: "/search", ar: "البحث الشامل", en: "Global search", desc_ar: "بحث عميق عبر 14 جدول بيانات.", desc_en: "Deep search across 14 data tables." },
  { href: "/companies", ar: "الشركات", en: "Companies", desc_ar: "سجل القابضة وكل وحدة أعمال.", desc_en: "Holdings registry per business unit." },
  { href: "/compare", ar: "مقارنة شركتين", en: "Compare", desc_ar: "وجه لوجه بين أي شركتين بكل المؤشرات.", desc_en: "Side-by-side head-to-head." },
  { href: "/hotels", ar: "أرينا للضيافة", en: "Arena Hospitality", desc_ar: "فنادق وحجوزات ومعدلات إشغال.", desc_en: "Hotels, bookings, occupancy." },
  { href: "/dairy", ar: "المها للألبان", en: "Maha Dairy", desc_ar: "دفعات إنتاج وجودة وتوزيع.", desc_en: "Production batches, quality, distribution." },
  { href: "/farms", ar: "لوران الزراعية", en: "Loran Agri", desc_ar: "دفيئات ذكية ومحاصيل ومستشعرات.", desc_en: "Smart greenhouses, crops, sensors." },
  { href: "/education", ar: "حاضنة The Tank", en: "The Tank", desc_ar: "ستارت أب تحت مظلة الجامعة الأهلية.", desc_en: "Startups under the AAU umbrella." },
  { href: "/supply-chain", ar: "جسر AI", en: "AI Bridge", desc_ar: "تنبؤات تربط إشغال الفنادق بإنتاج الألبان والزراعة.", desc_en: "Forecasts linking occupancy → dairy/produce." },
  { href: "/insights", ar: "إشارات الذكاء", en: "Insights", desc_ar: "تنبيهات ذكية وفرص اكتشفها AI.", desc_en: "AI-discovered alerts & opportunities." },
  { href: "/finance", ar: "المركز المالي", en: "Finance", desc_ar: "السجل المالي عبر كل الشركات.", desc_en: "Cross-company ledger." },
  { href: "/markets", ar: "الأسواق العالمية", en: "Markets", desc_ar: "متابعة أسهم MENA + عالمية.", desc_en: "MENA + global watchlist." },
  { href: "/sustainability", ar: "الاستدامة ESG", en: "Sustainability", desc_ar: "بيئة + اجتماعي + حوكمة.", desc_en: "Environmental + social + governance." },
  { href: "/projects", ar: "خط الأنابيب", en: "Pipeline", desc_ar: "مشاريع مستقبلية لكل شركة.", desc_en: "Future projects per company." },
  { href: "/tasks", ar: "المهام والXP", en: "Tasks & XP", desc_ar: "نظام مهام ملعّب يكسبك نقاط ورتبة.", desc_en: "Gamified tasks earning XP & rank." },
  { href: "/achievements", ar: "الإنجازات", en: "Achievements", desc_ar: "ميداليات + رتبة شطرنجية للموظف.", desc_en: "Medals + chess rank." },
  { href: "/reports", ar: "التقارير الرسمية", en: "Reports", desc_ar: "تقرير من صفحة واحدة لكل شركة، جاهز PDF.", desc_en: "One-pager per company, print-ready PDF." },
  { href: "/activity", ar: "سجل النشاط", en: "Activity log", desc_ar: "تتبع كل عملية في النظام.", desc_en: "Audit trail of every action." },
];

export default async function HelpPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const faq = [
    {
      q_ar: "كيف أبدّل بين العربية والإنجليزية؟",
      q_en: "How do I switch language?",
      a_ar: "من أيقونة اللغة في الأعلى يمين بجانب جرس الإشعارات.",
      a_en: "Click the language icon in the top-right next to the notification bell.",
    },
    {
      q_ar: "كيف أغير الثيم؟",
      q_en: "How do I change the theme?",
      a_ar: "أيقونة الثيم بجانب اللغة — 7 ثيمات متاحة.",
      a_en: "Theme icon next to language — 7 themes available.",
    },
    {
      q_ar: "هل يمكنني التراجع عن الحذف؟",
      q_en: "Can I undo a delete?",
      a_ar: "نعم — كل عملية حذف تظهر toast بزر تراجع لمدة 8 ثوان.",
      a_en: "Yes — every delete shows a toast with an undo button for 8 seconds.",
    },
    {
      q_ar: "كيف أكسب XP؟",
      q_en: "How do I earn XP?",
      a_ar: "إنجاز المهام يمنحك نقاطها. مهام SIDE تمنحك ضعف ونصف النقاط.",
      a_en: "Completing tasks awards their points. SIDE tasks award 1.5×.",
    },
    {
      q_ar: "كيف أصدّر تقرير شركة كـ PDF؟",
      q_en: "How do I export a company report as PDF?",
      a_ar: "اذهب إلى التقارير → اختر الشركة → اضغط طباعة → احفظ كـ PDF.",
      a_en: "Reports → pick company → Print → Save as PDF.",
    },
    {
      q_ar: "ما الفرق بين CORE و SIDE في المهام؟",
      q_en: "What's the difference between CORE and SIDE tasks?",
      a_ar: "CORE هي المهام الموكلة، SIDE هي مهام تطوعية بمكافأة XP أعلى.",
      a_en: "CORE is mandated work; SIDE is voluntary with higher XP reward.",
    },
  ];

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · المعلومات" : "System · Info"}
            </div>
            <h1 className="sec-title">
              {ar ? "مركز المساعدة" : "Help center"}
            </h1>
            <p className="sec-sub">
              {ar
                ? "اختصارات لوحة المفاتيح، جولة في الوحدات، وأسئلة شائعة."
                : "Keyboard shortcuts, a module tour, and frequently asked questions."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "مباشر" : "Live"}
            </span>
          </div>
        </div>

        {/* Keyboard shortcuts — reference help-tab panel */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">
              {ar ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts"}
            </span>
          </div>
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: "13.5px", color: "var(--ink)" }}>
                {ar ? s.ar : s.en}
              </span>
              <span style={{ display: "inline-flex", gap: 6 }}>
                {s.keys.map((kk, j) => (
                  <kbd
                    key={j}
                    style={{
                      fontFamily: "var(--font-mono,monospace)",
                      fontSize: 12,
                      background: "var(--ivory)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      padding: "3px 9px",
                      color: "var(--emerald)",
                    }}
                  >
                    {kk}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>

        {/* Module tour — reference panel + list rows */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">
              {ar ? "جولة في الوحدات" : "Module tour"}
            </span>
          </div>
          {MODULES.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="br-row"
              style={{ background: "var(--cream)", borderColor: "var(--line)" }}
            >
              <div className="rt">
                <div className="tt" style={{ color: "var(--ink)" }}>
                  {ar ? m.ar : m.en}
                </div>
                <div className="ts">{ar ? m.desc_ar : m.desc_en}</div>
              </div>
              <span className="ops-tag info">
                {ar ? "افتح" : "Open"}
              </span>
            </a>
          ))}
        </div>

        {/* FAQ — reference panel + disclosure rows */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">
              {ar ? "الأسئلة الشائعة" : "Frequently asked"}
            </span>
          </div>
          {faq.map((f, i) => (
            <details
              key={i}
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 0",
                  cursor: "pointer",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                <span>{ar ? f.q_ar : f.q_en}</span>
                <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  ▾
                </span>
              </summary>
              <div
                style={{
                  padding: "0 0 12px",
                  fontSize: "12.5px",
                  lineHeight: 1.7,
                  color: "var(--ink-muted)",
                }}
              >
                {ar ? f.a_ar : f.a_en}
              </div>
            </details>
          ))}
        </div>

        {/* For developers — B3 homing: changelog / design-system / showcase */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">
              {ar ? "للمطورين" : "For developers"}
            </span>
          </div>
          {DEV_LINKS.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="br-row"
              style={{ background: "var(--cream)", borderColor: "var(--line)" }}
            >
              <div className="rt">
                <div className="tt" style={{ color: "var(--ink)" }}>
                  {ar ? m.ar : m.en}
                </div>
                <div className="ts">{ar ? m.desc_ar : m.desc_en}</div>
              </div>
              <span className="ops-tag info">
                {ar ? "افتح" : "Open"}
              </span>
            </a>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "var(--ink-muted)",
          }}
        >
          H-Nerve ERP ·{" "}
          {ar
            ? "نظام الحوراني العصبي المركزي"
            : "Hourani Group's Central Nervous System"}
        </p>
      </div>
    </div>
  );
}
