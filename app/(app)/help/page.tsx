// Help center — keyboard shortcuts, tour of modules, FAQ.
// First-class onboarding so new users can self-serve.

import Link from "next/link";
import {
  Keyboard, Sparkles, Brain, Hotel, Milk, Sprout, GraduationCap,
  Wallet, TrendingUp, Leaf, FlaskConical, ListChecks, Trophy,
  Activity, Search, FileText, ArrowLeftRight, Building2, Command,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { getLocale } from "@/lib/i18n.server";

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
  icon: any;
  tone: string;
};

const MODULES: Module[] = [
  { href: "/dashboard", ar: "اللوحة التنفيذية", en: "Executive dashboard", desc_ar: "نظرة شاملة على نبض المجموعة في شاشة واحدة.", desc_en: "Whole-group pulse in one screen.", icon: Sparkles, tone: "emerald" },
  { href: "/search", ar: "البحث الشامل", en: "Global search", desc_ar: "بحث عميق عبر 14 جدول بيانات.", desc_en: "Deep search across 14 data tables.", icon: Search, tone: "blue" },
  { href: "/companies", ar: "الشركات", en: "Companies", desc_ar: "سجل القابضة وكل وحدة أعمال.", desc_en: "Holdings registry per business unit.", icon: Building2, tone: "emerald" },
  { href: "/compare", ar: "مقارنة شركتين", en: "Compare", desc_ar: "وجه لوجه بين أي شركتين بكل المؤشرات.", desc_en: "Side-by-side head-to-head.", icon: ArrowLeftRight, tone: "violet" },
  { href: "/hotels", ar: "أرينا للضيافة", en: "Arena Hospitality", desc_ar: "فنادق وحجوزات ومعدلات إشغال.", desc_en: "Hotels, bookings, occupancy.", icon: Hotel, tone: "amber" },
  { href: "/dairy", ar: "المها للألبان", en: "Maha Dairy", desc_ar: "دفعات إنتاج وجودة وتوزيع.", desc_en: "Production batches, quality, distribution.", icon: Milk, tone: "sky" },
  { href: "/farms", ar: "لوران الزراعية", en: "Loran Agri", desc_ar: "دفيئات ذكية ومحاصيل ومستشعرات.", desc_en: "Smart greenhouses, crops, sensors.", icon: Sprout, tone: "emerald" },
  { href: "/education", ar: "حاضنة The Tank", en: "The Tank", desc_ar: "ستارت أب تحت مظلة الجامعة الأهلية.", desc_en: "Startups under the AAU umbrella.", icon: GraduationCap, tone: "indigo" },
  { href: "/supply-chain", ar: "جسر AI", en: "AI Bridge", desc_ar: "تنبؤات تربط إشغال الفنادق بإنتاج الألبان والزراعة.", desc_en: "Forecasts linking occupancy → dairy/produce.", icon: Brain, tone: "violet" },
  { href: "/insights", ar: "إشارات الذكاء", en: "Insights", desc_ar: "تنبيهات ذكية وفرص اكتشفها AI.", desc_en: "AI-discovered alerts & opportunities.", icon: Sparkles, tone: "amber" },
  { href: "/finance", ar: "المركز المالي", en: "Finance", desc_ar: "السجل المالي عبر كل الشركات.", desc_en: "Cross-company ledger.", icon: Wallet, tone: "emerald" },
  { href: "/markets", ar: "الأسواق العالمية", en: "Markets", desc_ar: "متابعة أسهم MENA + عالمية.", desc_en: "MENA + global watchlist.", icon: TrendingUp, tone: "blue" },
  { href: "/sustainability", ar: "الاستدامة ESG", en: "Sustainability", desc_ar: "بيئة + اجتماعي + حوكمة.", desc_en: "Environmental + social + governance.", icon: Leaf, tone: "emerald" },
  { href: "/projects", ar: "خط الأنابيب", en: "Pipeline", desc_ar: "مشاريع مستقبلية لكل شركة.", desc_en: "Future projects per company.", icon: FlaskConical, tone: "violet" },
  { href: "/tasks", ar: "المهام والXP", en: "Tasks & XP", desc_ar: "نظام مهام ملعّب يكسبك نقاط ورتبة.", desc_en: "Gamified tasks earning XP & rank.", icon: ListChecks, tone: "blue" },
  { href: "/achievements", ar: "الإنجازات", en: "Achievements", desc_ar: "ميداليات + رتبة شطرنجية للموظف.", desc_en: "Medals + chess rank.", icon: Trophy, tone: "amber" },
  { href: "/reports", ar: "التقارير الرسمية", en: "Reports", desc_ar: "تقرير من صفحة واحدة لكل شركة، جاهز PDF.", desc_en: "One-pager per company, print-ready PDF.", icon: FileText, tone: "indigo" },
  { href: "/activity", ar: "سجل النشاط", en: "Activity log", desc_ar: "تتبع كل عملية في النظام.", desc_en: "Audit trail of every action.", icon: Activity, tone: "slate" },
];

const TONE: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default async function HelpPage() {
  const locale = getLocale();
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
    <>
      <PageHeader
        eyebrow={ar ? "المساعدة" : "Help"}
        title={ar ? "مركز المساعدة" : "Help center"}
        subtitle={
          ar
            ? "اختصارات لوحة المفاتيح + جولة في الوحدات + أسئلة شائعة"
            : "Keyboard shortcuts + module tour + frequently asked questions"
        }
      />

      <PageContainer>
        {/* Keyboard shortcuts */}
        <section className="card card-pad">
          <div className="mb-3 flex items-center gap-2">
            <Keyboard
              className="h-4 w-4"
              style={{ color: "var(--heri-ochre)" }}
            />
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              {ar ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts"}
            </h2>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {SHORTCUTS.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-[var(--heri-cream-2)]"
                style={{ border: "1px solid var(--heri-rule)" }}
              >
                <span
                  className="text-[12px] font-bold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {ar ? s.ar : s.en}
                </span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k, j) => (
                    <kbd
                      key={j}
                      className="rounded-md px-2 py-1 font-mono text-[10px] font-semibold ring-1"
                      style={{
                        background: "var(--heri-cream)",
                        color: "var(--heri-ink)",
                        borderColor: "var(--heri-rule)",
                        boxShadow: "0 1px 0 0 var(--heri-rule)",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Module tour */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Command
              className="h-4 w-4"
              style={{ color: "var(--heri-ochre)" }}
            />
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              {ar ? "جولة في الوحدات" : "Module tour"}
            </h2>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="card card-hover flex items-start gap-3 p-3"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${TONE[m.tone]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-[12.5px] font-semibold"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {ar ? m.ar : m.en}
                    </div>
                    <div
                      className="line-clamp-2 text-[10.5px]"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {ar ? m.desc_ar : m.desc_en}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles
              className="h-4 w-4"
              style={{ color: "var(--heri-ochre)" }}
            />
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--heri-ink)" }}
            >
              {ar ? "الأسئلة الشائعة" : "Frequently asked"}
            </h2>
          </div>
          <div className="space-y-2">
            {faq.map((f, i) => (
              <details
                key={i}
                className="card group p-0 transition"
              >
                <summary
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-[12.5px] font-semibold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  <span>{ar ? f.q_ar : f.q_en}</span>
                  <span
                    className="text-[10px] transition group-open:rotate-180"
                    style={{ color: "var(--heri-ink-3)" }}
                  >
                    ▾
                  </span>
                </summary>
                <div
                  className="px-4 pb-3 text-[11.5px] leading-relaxed"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {ar ? f.a_ar : f.a_en}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Footer credit */}
        <p
          className="text-center text-[10.5px]"
          style={{ color: "var(--heri-ink-3)" }}
        >
          H-Nerve ERP · {ar ? "نظام الحوراني العصبي المركزي" : "Hourani Group's Central Nervous System"}
        </p>
      </PageContainer>
    </>
  );
}
