// /showcase — the demo reel.
//
// A single-page walkthrough of all 20 phases. Heritage Modern body
// (operator-facing overview) with each phase rendered as a hero card
// showing its number, name, the wow-moment in one sentence, the
// aesthetic vocabulary it uses, and a "Try it" link to the live route.
//
// This is the screen to point a customer at when you want them to
// understand what they're buying in two scrolls.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { ArrowUpRight, Brain, Layers, Theater, Crown } from "lucide-react";
import { getLocale } from "@/lib/i18n.server";

type Phase = {
  n: number;
  name: string;
  nameAr: string;
  pitch: string;
  pitchAr: string;
  wow: string;
  wowAr: string;
  aesthetic: string;
  href: string;
  hrefLabel?: string;
};

type Wave = {
  letter: "A" | "B" | "C" | "D";
  title: string;
  titleAr: string;
  blurb: string;
  blurbAr: string;
  icon: any;
  accent: string;
  phases: Phase[];
};

const WAVES: Wave[] = [
  {
    letter: "A",
    title: "The Brain",
    titleAr: "الدماغ",
    blurb:
      "Causal reasoning, multi-agent debate, narration, planning, memory, feedback, federation, self-improvement.",
    blurbAr:
      "تعليل سببي، حوار متعدد العوامل، سرد، تخطيط، ذاكرة، تغذية راجعة، فيدرالية، تحسين ذاتي.",
    icon: Brain,
    accent: "var(--heri-teal)",
    phases: [
      {
        n: 1,
        name: "Causal Graph",
        nameAr: "الرسم السببي",
        pitch: "Every entity is a node, every relationship an edge.",
        pitchAr: "كل كيان عقدة، وكل علاقة حافة.",
        wow: "Click a node and watch the cascade ripple through downstream effects.",
        wowAr: "اضغط عقدة وراقب التتالي يتدفّق عبر كل ما تأثّر.",
        aesthetic: "Heritage Modern",
        href: "/brain/graph",
      },
      {
        n: 2,
        name: "What-If Simulator",
        nameAr: "محاكي ماذا لو",
        pitch: "Propagate any change through the graph with BFS + decay.",
        pitchAr: "ابعث أي تغيير عبر الرسم بأسلوب BFS وانحدار طبيعي.",
        wow: "Move the dairy yield slider, watch margin shift across 12 downstream entities.",
        wowAr: "حرّك مزلق الإنتاجية، تابع الهامش يتغيّر في ١٢ كياناً.",
        aesthetic: "Heritage Modern",
        href: "/brain/scenarios",
      },
      {
        n: 3,
        name: "The Council",
        nameAr: "المجلس",
        pitch: "Multi-agent debate — advocates, skeptics, finance, risk.",
        pitchAr: "حوار متعدد العوامل — مؤيّدون، مشكّكون، مالية، مخاطر.",
        wow: "5 voices argue. Moderator synthesizes a single decision with citations.",
        wowAr: "خمسة أصوات تتحاور. المنسّق يخرج بقرار واحد مرفقاً بالإحالات.",
        aesthetic: "Heritage Modern",
        href: "/brain/council",
      },
      {
        n: 4,
        name: "The Narrator",
        nameAr: "السارد",
        pitch: "Editorial prose for every brain output — bilingual, 3 registers.",
        pitchAr: "نثر تحريري لكل ناتج للدماغ — ثنائي اللغة، بثلاث طبقات.",
        wow: "Same fact pack, three registers: headline · editorial · executive.",
        wowAr: "نفس الحقائق، ثلاث طبقات: عنوان · تحريري · تنفيذي.",
        aesthetic: "Heritage Modern",
        href: "/insights",
      },
      {
        n: 5,
        name: "The Planner",
        nameAr: "المخطّط",
        pitch: "Insight → ordered, owned, dated action plan.",
        pitchAr: "إشارة ذكاء ← خطة عمل مرتّبة، مسؤولة، مؤرّخة.",
        wow: "Commit a plan with a single button. Roll back the same way.",
        wowAr: "أقرّ الخطة بضغطة. وارجع عنها بنفس الطريقة.",
        aesthetic: "Heritage Modern",
        href: "/plans",
      },
      {
        n: 6,
        name: "Memory Lake",
        nameAr: "بحيرة الذاكرة",
        pitch: "Episodic recall of analogous past situations.",
        pitchAr: "استرجاع حلقي للحالات الشبيهة من الماضي.",
        wow: "New situation surfaces three prior episodes that played out.",
        wowAr: "حالة جديدة تكشف ثلاث حلقات سابقة وكيف انتهت.",
        aesthetic: "Heritage Modern",
        href: "/brain/memory",
      },
      {
        n: 7,
        name: "Feedback Loop",
        nameAr: "حلقة التغذية الراجعة",
        pitch: "User reactions become training signal.",
        pitchAr: "ردود الفعل تتحوّل إلى إشارة تدريب.",
        wow: "Helpful / Off / Brilliant — three taps tune the next answer.",
        wowAr: "مفيد / خارج / رائع — ثلاث ضغطات تضبط الإجابة التالية.",
        aesthetic: "Heritage Modern",
        href: "/brain/learning",
      },
      {
        n: 8,
        name: "Federation",
        nameAr: "الفيدرالية",
        pitch: "Anonymized pattern learning across H-Nerve customers.",
        pitchAr: "تعلّم أنماط بشكل مجهول الهوية عبر عملاء H-Nerve.",
        wow: "K-anonymity gate: patterns surface only with 5+ peers contributing.",
        wowAr: "بوابة K=٥: الأنماط تظهر فقط مع مشاركة خمسة فأكثر.",
        aesthetic: "Heritage Modern",
        href: "/brain/benchmarks",
      },
      {
        n: 9,
        name: "Decision Theater",
        nameAr: "مسرح القرار",
        pitch: "Fullscreen council transcript — out of the dashboard, into the room.",
        pitchAr: "نسخة كاملة الشاشة من حوار المجلس — خارج اللوحة، داخل القاعة.",
        wow: "ESC returns you to the dashboard. Time stops for the decision.",
        wowAr: "ESC يعيدك إلى اللوحة. الزمن يتوقف لاتخاذ القرار.",
        aesthetic: "Refined Editorial",
        href: "/brain/council",
        hrefLabel: "Council list",
      },
      {
        n: 10,
        name: "Self-Improving Meta",
        nameAr: "ميتا التحسين الذاتي",
        pitch: "Weekly self-reflection. Owns the Brain IQ score.",
        pitchAr: "تأمّل أسبوعي ذاتي. يملك مؤشر ذكاء الدماغ.",
        wow: "IQ ticks up as outcomes confirm the brain's predictions.",
        wowAr: "الذكاء يرتفع حين تؤكّد النتائج توقعات الدماغ.",
        aesthetic: "Heritage Modern",
        href: "/brain/iq",
      },
    ],
  },
  {
    letter: "B",
    title: "The Platform",
    titleAr: "المنصّة",
    blurb:
      "White-label tenancy, visual workflows, integration hub, mobile ops, conversational layer.",
    blurbAr:
      "علامة بيضاء، خرائط أتمتة بصرية، مركز موصلات، عمليات نقّالة، طبقة محادثة.",
    icon: Layers,
    accent: "var(--heri-copper)",
    phases: [
      {
        n: 11,
        name: "White-Label",
        nameAr: "العلامة البيضاء",
        pitch: "Stand up a new tenant in minutes. Custom theme. Industry pack.",
        pitchAr: "تشغيل مستأجر جديد في دقائق. سمة مخصصة. حزمة قطاعية.",
        wow: "Provisioning checklist plays end-to-end; theme tokens swap live.",
        wowAr: "قائمة التهيئة تنجز نفسها؛ ألوان السمة تتبدّل مباشرة.",
        aesthetic: "Sleek Operator",
        href: "/admin/tenants",
      },
      {
        n: 12,
        name: "Workflow Studio",
        nameAr: "استوديو الأتمتة",
        pitch: "Visual flow editor — triggers, conditions, actions.",
        pitchAr: "محرر تدفّق بصري — مشغّلات، شروط، إجراءات.",
        wow: "Token-flow animation traces a test run along the bezier wires.",
        wowAr: "حركة الرمز تتعقّب التشغيل التجريبي عبر الأسلاك.",
        aesthetic: "Industrial Precision",
        href: "/workflows",
      },
      {
        n: 13,
        name: "Integrations Hub",
        nameAr: "مركز الموصلات",
        pitch: "24 connectors across 6 categories.",
        pitchAr: "٢٤ موصلاً عبر ٦ تصنيفات.",
        wow: "Tile flips 180° on Y-axis when you connect a provider.",
        wowAr: "البطاقة تنقلب ١٨٠° حول المحور Y لحظة الاتصال.",
        aesthetic: "Heritage Modern",
        href: "/integrations",
      },
      {
        n: 14,
        name: "Mobile Ops",
        nameAr: "العمليات النقّالة",
        pitch: "Three to know · three to decide · three to approve.",
        pitchAr: "ثلاثة لتعرف · ثلاثة لتقرّر · ثلاثة لتقرّ.",
        wow: "Pull-to-refresh: ochre hairline draws, then 'Synced. N new things.'",
        wowAr: "اسحب للتحديث: خيط نحاسي يُرسم، ثم 'متّزن. N بنود جديدة.'",
        aesthetic: "Calm Clinical",
        href: "/m",
      },
      {
        n: 15,
        name: "Conversational Brain",
        nameAr: "الدماغ المحادث",
        pitch: "⌘J. Ask anything. Three sentences. Citations. Voice in/out.",
        pitchAr: "⌘J. اسأل أي شيء. ثلاث جمل. إحالات. صوت دخل وخرج.",
        wow: "Press ⌘J anywhere in the app. Brutalist yellow on black.",
        wowAr: "اضغط ⌘J في أي مكان. براحة عصرية: أصفر على أسود.",
        aesthetic: "Brutalist Confidence",
        href: "/dashboard",
        hrefLabel: "Try ⌘J anywhere",
      },
    ],
  },
  {
    letter: "C",
    title: "The Theater",
    titleAr: "المسرح",
    blurb:
      "Time travel, real-time presence, document intelligence — the experience layer.",
    blurbAr:
      "السفر عبر الزمن، حضور آنيّ، ذكاء المستندات — طبقة التجربة.",
    icon: Theater,
    accent: "var(--heri-terracotta)",
    phases: [
      {
        n: 16,
        name: "Time Machine",
        nameAr: "آلة الزمن",
        pitch: "Drag the 'Now' pill. Reconstruct any past day.",
        pitchAr: "اسحب جراب 'الآن'. ابنِ أي يوم من الماضي.",
        wow: "Banner reads: 'Viewing as of March 18. Brain IQ that day 102 (now 142).'",
        wowAr: "شريط: 'عرض كما في ١٨ آذار. ذكاء الدماغ ١٠٢ (الآن ١٤٢).'",
        aesthetic: "Heritage + Brutalist pill",
        href: "/dashboard",
        hrefLabel: "Drag the pill",
      },
      {
        n: 17,
        name: "Real-Time Collab",
        nameAr: "تعاون آنيّ",
        pitch: "Cursors, presence, comments. The phantom CFO joins your dashboard.",
        pitchAr: "مؤشرات، حضور، تعليقات. المدير المالي الافتراضي يحضر معك.",
        wow: "Phantom cursor interpolates at 60fps. Comment slides in from the side.",
        wowAr: "مؤشر افتراضي يتحرّك بسلاسة ٦٠ إطار/ثانية. تعليق يدخل من الجانب.",
        aesthetic: "Heritage Modern",
        href: "/dashboard",
      },
      {
        n: 18,
        name: "Document Intelligence",
        nameAr: "ذكاء المستندات",
        pitch: "Drop any contract, invoice, lab report. 4 seconds. Done.",
        pitchAr: "أفلت أي عقد، فاتورة، تقرير. ٤ ثوانٍ. انتهى.",
        wow: "Modal opens: summary + extracted facts + risk clauses + 'Add to ledger'.",
        wowAr: "نافذة تفتح: ملخّص + حقائق + بنود مخاطر + 'أضف إلى السجل'.",
        aesthetic: "Refined Editorial",
        href: "/documents",
      },
      {
        n: 19,
        name: "Empire Dashboard",
        nameAr: "لوحة الإمبراطورية",
        pitch: "Eight businesses. One brain each. One screen.",
        pitchAr: "ثمان أعمال. دماغ لكل واحدة. شاشة واحدة.",
        wow: "Grid breathes 1% over 4s. IQ ticks up live as reports land.",
        wowAr: "الشبكة تتنفّس ١٪ خلال ٤ ثوانٍ. الذكاء يتزايد لحظة وصول التقارير.",
        aesthetic: "Quiet Authority",
        href: "/admin/empire",
      },
    ],
  },
  {
    letter: "D",
    title: "The Empire",
    titleAr: "الإمبراطورية",
    blurb:
      "H-Nerve as an open protocol. Agents in 12 lines. Packs in 30. Themes in JSON.",
    blurbAr:
      "H-Nerve بروتوكولاً مفتوحاً. عوامل في ١٢ سطراً. حزم في ٣٠. سمات في JSON.",
    icon: Crown,
    accent: "var(--heri-ink)",
    phases: [
      {
        n: 20,
        name: "Living Protocol",
        nameAr: "البروتوكول الحيّ",
        pitch:
          "The brain belongs to the orgs that build on it. Public spec, public marketplace.",
        pitchAr:
          "الدماغ ملك للمنظمات التي تبني فوقه. مواصفة عامة، سوق عام.",
        wow: "Manifesto types itself at 60wpm. 24 community agents orbit a sun.",
        wowAr: "البيان يكتب نفسه بسرعة ٦٠ كلمة/د. ٢٤ عاملاً مجتمعياً في فلك.",
        aesthetic: "Refined Editorial + Industrial Precision",
        href: "/dev",
      },
    ],
  },
];

export default function ShowcasePage() {
  const ar = getLocale() === "ar";
  const totalPhases = WAVES.reduce((s, w) => s + w.phases.length, 0);
  return (
    <>
      <PageHeader
        eyebrow="عرض المنظومة · System showcase"
        title="عشرون مرحلة · ERP واحدة"
        subtitle="كل مرحلة لها لحظتها الخاصة. كل لحظة قابلة للتجربة الآن — اضغط أي بطاقة لتفتحها مباشرة."
      />

      <PageContainer>
        {/* Hero stat strip */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="مراحل" labelEn="Phases" value={String(totalPhases)} />
          <Stat label="موجات" labelEn="Waves" value="4" />
          <Stat label="لغات بصرية" labelEn="Vocabularies" value="8" accent />
          <Stat label="عوامل المجتمع" labelEn="Community agents" value="24" />
        </section>

        {WAVES.map((w) => (
          <section key={w.letter} className="sc-wave">
            <header className="sc-wave-head">
              <div className="sc-wave-letter" style={{ background: w.accent }}>
                <span>{w.letter}</span>
              </div>
              <div className="sc-wave-meta">
                <p className="sc-wave-eyebrow">
                  WAVE {w.letter} · {w.phases.length}{" "}
                  {w.phases.length === 1 ? "PHASE" : "PHASES"}
                </p>
                {/* Phase P2 — single-language by locale. */}
                <h2 className="sc-wave-title">
                  <span>{ar ? w.titleAr : w.title}</span>
                </h2>
                <p className="sc-wave-blurb">{ar ? w.blurbAr : w.blurb}</p>
              </div>
            </header>

            <div className="sc-grid">
              {w.phases.map((p) => (
                <Link key={p.n} href={p.href} className="sc-card">
                  <header className="sc-card-head">
                    <span
                      className="sc-card-n"
                      style={{ color: w.accent }}
                    >
                      {String(p.n).padStart(2, "0")}
                    </span>
                    <ArrowUpRight
                      className="sc-card-arrow"
                      strokeWidth={1.4}
                    />
                  </header>

                  {/* Phase P2 — single-language by locale. */}
                  <h3 className="sc-card-name">{ar ? p.nameAr : p.name}</h3>
                  <p className="sc-card-pitch">{ar ? p.pitchAr : p.pitch}</p>
                  <div className="sc-card-wow">
                    <span className="sc-card-wow-mark">★</span>
                    <p>{ar ? p.wowAr : p.wow}</p>
                  </div>
                  <footer className="sc-card-foot">
                    <HeritagePill tone="neutral">{p.aesthetic}</HeritagePill>
                    <span className="sc-card-cta">
                      {p.hrefLabel ?? (ar ? "افتح" : "Open")}
                    </span>
                  </footer>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Closing note */}
        <section className="sc-close">
          <p className="sc-close-eyebrow">— {ar ? "نهاية الجولة" : "End of tour"}</p>
          <h2 className="sc-close-title">
            {ar ? "وثائق التصميم في" : "Design docs at"}{" "}
            <code>docs/DESIGN-SKILL.md</code> · {ar ? "خريطة المراحل في" : "Phase map at"}{" "}
            <code>docs/PHASES-INTELLIGENCE.md</code>
          </h2>
          <p className="sc-close-body">
            {ar
              ? "ثمانية معجم بصري واحد لكل سطح. سببية لكل ادعاء. سهولة وصول لكل حركة. هذه ليست شاشات منفصلة — هي خطة عمل متماسكة."
              : "Eight visual vocabularies, one per surface. A causal chain behind every claim. Accessibility behind every motion. Not loose screens — a coherent work plan."}
          </p>
        </section>
      </PageContainer>
    </>
  );
}

function Stat({
  label,
  labelEn,
  value,
  accent,
}: {
  label: string;
  labelEn: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "14px 18px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 10 }}>
        <span>{label}</span>
        <span style={{ margin: "0 6px", color: "var(--heri-rule-strong)" }}>·</span>
        <span style={{ opacity: 0.65 }}>{labelEn}</span>
      </div>
      <div
        className="heri-number mt-1.5"
        style={{
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "-0.018em",
          color: accent ? "var(--heri-copper)" : "var(--heri-ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
