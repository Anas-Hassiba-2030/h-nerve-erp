// Source-of-truth changelog data. Newest first. Each entry carries Arabic +
// English copy so the page can swap based on locale without re-fetching.

export type ChangelogCategory =
  | "feature"
  | "fix"
  | "polish"
  | "security"
  | "perf";

export type ChangelogEntry = {
  date: string; // ISO date (YYYY-MM-DD), kept en-US digits per spec
  version: string; // "1.3", "1.2", ...
  category: ChangelogCategory;
  modules: string[]; // free-text tags, e.g. ["forms", "tasks"]
  ar: { title: string; desc: string; bullets: string[] };
  en: { title: string; desc: string; bullets: string[] };
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-05-28",
    version: "1.5",
    category: "fix",
    modules: ["auth", "session", "deploy"],
    ar: {
      title: "إصلاح البناء الإنتاجي — كلمة مرور الجلسة وإعادة التوليد الثابت",
      desc:
        "إصلاح خطأ كان يمنع بناء Vercel من الاكتمال بسبب التحقق المبكر من SESSION_PASSWORD أثناء تحليل الوحدات الثابتة، وإصلاح 31 صفحة كانت تُولَّد ثابتة رغم استعلامها قاعدة البيانات.",
      bullets: [
        "تأجيل التحقق من SESSION_PASSWORD إلى وقت الطلب — البناء لا يفشل بعد الآن عند غياب المتغير",
        "إضافة force-dynamic لـ 31 صفحة تستعلم Prisma لضمان عرض البيانات الحية",
        "الانتقال من SQLite إلى PostgreSQL عبر Prisma Postgres على Vercel",
        "تشغيل seed الإنتاج تلقائياً عند كل نشر لضمان وجود بيانات المستخدم الأساسية",
        "إخفاء تلميح بيانات الاعتماد التجريبية في بيئة الإنتاج",
      ],
    },
    en: {
      title: "Production build fix — session password + static rendering",
      desc:
        "Fixed a crash that prevented Vercel builds from completing due to early SESSION_PASSWORD validation during module parsing, and fixed 31 pages that were statically generated despite querying the database.",
      bullets: [
        "Defer SESSION_PASSWORD validation to request-time — build no longer fails if env var is absent",
        "Added force-dynamic to 31 Prisma-querying pages so they always render live data",
        "Migrated from SQLite to PostgreSQL via Prisma Postgres on Vercel",
        "Auto-run production seed on every deploy to guarantee baseline user data",
        "Demo credentials hint hidden in production to avoid misleading users",
      ],
    },
  },
  {
    date: "2026-04-30",
    version: "1.3",
    category: "feature",
    modules: ["forms", "companies", "hotels", "dairy", "projects"],
    ar: {
      title: "تحقق نماذج فوري بطبقة Field موحّدة",
      desc:
        "كل نموذج CRUD أساسي يحصل الآن على تحقق فوري عبر مكوّن Field مشترك مع رسائل خطأ بالعربية، حلقة حمراء على الحقول غير الصحيحة، و Spinner تلقائي على زر الحفظ.",
      bullets: [
        "Zod parse → safeParse مع إرجاع رسائل أخطاء حقلية للنموذج",
        "إطار أحمر + أيقونة AlertCircle على الحقول غير الصحيحة",
        "Spinner تلقائي على زر الحفظ أثناء التنفيذ (useFormStatus)",
        "تكامل aria-invalid + aria-describedby لقارئات الشاشة",
        "كشف P2002 من Prisma وتوجيه الرسالة إلى الحقل المعني",
      ],
    },
    en: {
      title: "Inline form validation with a unified Field layer",
      desc:
        "Every primary CRUD form now has live inline validation via a shared Field component with Arabic error messages, red ring on invalid inputs, and an automatic spinner on submit.",
      bullets: [
        "Zod parse → safeParse migration with field-level error returns",
        "Red ring + AlertCircle icon on invalid fields",
        "Auto spinner on submit during pending (useFormStatus)",
        "aria-invalid + aria-describedby wired for screen readers",
        "Prisma P2002 detection routes the message to the offending field",
      ],
    },
  },
  {
    date: "2026-04-30",
    version: "1.3",
    category: "polish",
    modules: ["loading", "skeletons", "errors"],
    ar: {
      title: "هياكل تحميل وحدود أخطاء على مستوى المنصة",
      desc:
        "كل وحدة أعمال أصبحت تحمّل بهيكل وهمي يطابق ترتيب البطاقات والجداول الحقيقية، مع حدود أخطاء مخصصة وصفحة 404 ذات شخصية.",
      bullets: [
        "مكتبة هياكل: PageSkeleton, KpiSkeleton, TableSkeleton, ChartSkeleton, CardSkeleton",
        "loading.tsx لكل من /dashboard, /hotels, /supply-chain, /insights",
        "حد أخطاء (app)/error.tsx مع رأس متدرّج + زر إعادة محاولة + تفاصيل تقنية قابلة للطي",
        "صفحة 404 مخصصة بشعار H‑Nerve وشبكة وجهات مقترحة",
        "global-error.tsx كاحتياط للأعطال الجذرية بأسلوب مدمج كامل",
      ],
    },
    en: {
      title: "Platform-wide loading skeletons + error boundaries",
      desc:
        "Every module now loads with a placeholder that mirrors the real card/table rhythm, plus tailored error boundaries and a branded 404.",
      bullets: [
        "Skeleton library: PageSkeleton, KpiSkeleton, TableSkeleton, ChartSkeleton, CardSkeleton",
        "loading.tsx for /dashboard, /hotels, /supply-chain, /insights",
        "(app)/error.tsx boundary with gradient header + retry + collapsible technical details",
        "Custom 404 with the H-Nerve logo + suggestion grid",
        "global-error.tsx fallback for catastrophic root-layout failures",
      ],
    },
  },
  {
    date: "2026-04-30",
    version: "1.3",
    category: "feature",
    modules: ["toasts", "tasks", "projects", "insights", "supply-chain"],
    ar: {
      title: "نظام Toast/Undo مع حذف ناعم لمدة 24 ساعة",
      desc:
        "أي حذف لمهمة أو إشارة أو تنبؤ أو مشروع يصبح ناعماً ويعرض Toast ينزلق من الأسفل مع شريط تقدم وزر تراجع لمدة 8 ثوانٍ.",
      bullets: [
        "حقل deletedAt في Prisma لـ Task / FutureProject / AIInsight / SupplyForecast",
        "Toast بنغمات حسب النوع (deleted/restored/info) وتدرج تقدم متحرك",
        "تثبيت العداد عند المرور بالماوس — لا تختفي الرسالة أثناء القراءة",
        "حد أعلى 3 إشعارات في المكدس مع Stagger entry",
        "DeleteButton يدعم softDelete prop ويتجاوز نافذة التأكيد",
      ],
    },
    en: {
      title: "Toast/Undo notifications with 24h soft-delete",
      desc:
        "Deleting a task, insight, forecast, or project is now soft and surfaces a sliding toast with a progress bar and an undo button for 8 seconds.",
      bullets: [
        "deletedAt column in Prisma for Task / FutureProject / AIInsight / SupplyForecast",
        "Toast with tone variants (deleted/restored/info) and animated progress bar",
        "Hover pauses the countdown — won't dismiss while user is reading",
        "Stack capped at 3 with staggered entry",
        "DeleteButton.softDelete prop bypasses the confirm modal",
      ],
    },
  },
  {
    date: "2026-04-30",
    version: "1.3",
    category: "polish",
    modules: ["sidebar", "navigation"],
    ar: {
      title: "شريط جانبي قابل للطي + درج جوال + اختصار ⌘B",
      desc:
        "الشريط الجانبي يطوي إلى 72px على شاشات سطح المكتب مع تلميحات على الأيقونات، ودرج خارج الشاشة على الجوال يفتح بزر هامبرغر RTL-aware.",
      bullets: [
        "تخزين تفضيل الطي في كوكي h_nerve_sidebar",
        "اختصار ⌘/Ctrl+B لطي/توسيع الشريط (لا يخطف الكتابة في الحقول)",
        "درج جوال 280px مع backdrop ضبابي وإغلاق بـ Esc/زر/Backdrop",
        "تلميح يظهر بجانب الأيقونة عند الطي — يحترم الاتجاه RTL/LTR",
      ],
    },
    en: {
      title: "Collapsible sidebar + mobile drawer + ⌘B shortcut",
      desc:
        "The sidebar collapses to 72px with hover tooltips on desktop, and a 280px off-canvas drawer slides in from the start side on mobile.",
      bullets: [
        "Collapse preference persisted in the h_nerve_sidebar cookie",
        "⌘/Ctrl+B toggles the sidebar (won't hijack form-field typing)",
        "Mobile drawer with blurred backdrop, closes on Esc/button/backdrop",
        "Tooltip lands on the content-facing side of the icon — direction-aware",
      ],
    },
  },
  {
    date: "2026-04-29",
    version: "1.2",
    category: "feature",
    modules: ["users", "tasks", "achievements"],
    ar: {
      title: "تلعيب ERP بنظام رتب الشطرنج",
      desc:
        "يكسب كل عضو في الفريق نقاط XP من إنجاز المهام، يترقى عبر بيدق → فيل → حصان → وزير → ملك، ويفتح بونص أداء يظهر على بطاقته.",
      bullets: [
        "حقول rank/xp/loginCount/bonusPercent على نموذج User",
        "موديل Achievement + UserAchievement مع طبقات Bronze→Platinum",
        "بطاقة الرتبة في زاوية الشريط الجانبي تظهر النسبة للرتبة التالية",
      ],
    },
    en: {
      title: "Chess-rank gamification across the ERP",
      desc:
        "Every team member earns XP from completing tasks, levels Pawn → Bishop → Knight → Queen → King, and unlocks a performance bonus shown on their badge.",
      bullets: [
        "rank/xp/loginCount/bonusPercent fields on the User model",
        "Achievement + UserAchievement models with Bronze→Platinum tiers",
        "Sidebar rank badge shows progress to the next tier",
      ],
    },
  },
  {
    date: "2026-04-29",
    version: "1.2",
    category: "feature",
    modules: ["theme", "i18n"],
    ar: {
      title: "نظام 7 سمات + ثنائية اللغة AR/EN كاملة",
      desc:
        "كل صفحة وكل مكوّن يحترم متغيرات السمة الحالية ويتبدّل بسلاسة بين العربية والإنجليزية مع قلب RTL ↔ LTR ودون أي إعادة تحميل.",
      bullets: [
        "7 لوحات لونية (زمرد/زيتون/خشب صحراوي/فحم/...) عبر متغيرات CSS",
        "مكتبة رسائل واحدة في lib/i18n.ts تخدم كل التطبيق",
        "Cookie تثبيت اللغة + السمة عبر server actions في app/actions/preferences.ts",
      ],
    },
    en: {
      title: "7-theme palette + full AR/EN i18n",
      desc:
        "Every page and component respects the active theme tokens and flips between Arabic and English with full RTL ↔ LTR mirroring — no reload.",
      bullets: [
        "7 palettes (Emerald, Olive, Desert Wood, Charcoal, …) via CSS variables",
        "Single message catalogue in lib/i18n.ts powers the whole app",
        "Locale + theme cookies set via server actions in app/actions/preferences.ts",
      ],
    },
  },
  {
    date: "2026-04-29",
    version: "1.1",
    category: "feature",
    modules: ["supply-chain", "analytics"],
    ar: {
      title: "Sankey + Heatmap + كشف الشذوذ",
      desc:
        "وحدة سلسلة التوريد تكتسب رسماً تدفقياً يربط الفنادق بالمها ولوران، وصفحة الإشارات تكتسب لوحة شذوذ تكتشف ارتفاعات/انخفاضات الإيرادات والحجوزات.",
      bullets: [
        "مكوّن Sankey مخصص في components/charts/Sankey",
        "buildAnomaliesFromSeries في lib/anomaly مع كشف ±2σ",
        "AnomalyPanel يعرض الكشوف مرتبة بالشدة مع روابط إلى الوحدة",
      ],
    },
    en: {
      title: "Sankey + heatmap + anomaly detection",
      desc:
        "Supply chain gains a Sankey diagram linking hotels to Maha and Loran, and Insights gains an anomaly panel that flags revenue/booking spikes and dips.",
      bullets: [
        "Custom Sankey component in components/charts/Sankey",
        "buildAnomaliesFromSeries in lib/anomaly with ±2σ detection",
        "AnomalyPanel renders findings ranked by severity with deep links",
      ],
    },
  },
  {
    date: "2026-04-29",
    version: "1.1",
    category: "feature",
    modules: ["supply-chain", "ai"],
    ar: {
      title: "جسر الذكاء التنبؤي بين الشركات",
      desc:
        "محرّك heuristic يقرأ حجوزات الفنادق المرتفعة، يحوّلها إلى تنبؤ استهلاك ألبان وخضروات، ويولّد مسودات للمها ولوران تلقائياً.",
      bullets: [
        "autoGenerateForecasts في supply-chain/actions",
        "حساب 1.7 ضيف/غرفة × 1.2 لتر ألبان × 7 أيام كقاعدة أولية",
        "ثقة محسوبة من معدل الإشغال — قابلة للاستبدال بنموذج LLM لاحقاً",
      ],
    },
    en: {
      title: "Predictive AI bridge between group companies",
      desc:
        "A heuristic engine reads hotel occupancy spikes, converts them into dairy + produce demand forecasts, and seeds drafts for Maha and Loran.",
      bullets: [
        "autoGenerateForecasts in supply-chain/actions",
        "Baseline of 1.7 guests/room × 1.2 L dairy × 7-day window",
        "Confidence derived from occupancy — swappable for an LLM model later",
      ],
    },
  },
  {
    date: "2026-04-28",
    version: "1.0",
    category: "feature",
    modules: ["scaffold"],
    ar: {
      title: "إطلاق H‑Nerve ERP — 18 وحدة عمل",
      desc:
        "النواة الأولى للعمود الفقري الرقمي لمجموعة الحوراني — قابض، فنادق، ألبان، زراعة، تعليم، مالية، ومخطط شامل بترميز السمة العصبية.",
      bullets: [
        "Next.js 14 App Router + Prisma + iron-session",
        "نظام أدوار: ADMIN / EXECUTIVE / MANAGER / STAFF",
        "Server Actions لكل عمليات CRUD عبر الوحدات",
      ],
    },
    en: {
      title: "Initial release — H‑Nerve ERP, 18 modules",
      desc:
        "The first-cut digital nervous system for Hourani Group — holdings, hotels, dairy, agriculture, education, finance, all under a coherent neural visual language.",
      bullets: [
        "Next.js 14 App Router + Prisma + iron-session",
        "Role system: ADMIN / EXECUTIVE / MANAGER / STAFF",
        "Server Actions powering every CRUD flow",
      ],
    },
  },
];
