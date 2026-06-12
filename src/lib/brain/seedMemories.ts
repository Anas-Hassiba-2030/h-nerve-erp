// seedMemories.ts — populate the memory lake with editorial-quality
// past events. Each memory is bilingual, carries a real outcome (metric +
// delta), and a lesson-learned that future situations can match against.
//
// These are fictional but consistent with the demo data. They are the
// kind of stories an executive remembers — not raw rows.
//
// Phase 6 of docs/PHASES-INTELLIGENCE.md.

import { memoryLake } from "./memory.live";

type SeededMemory = {
  id: string;
  occurredAt: Date;
  module: string;
  headlineAr: string;
  headlineEn: string;
  bodyAr: string;
  bodyEn: string;
  lessonAr: string;
  lessonEn: string;
  tags: string[];
  outcomeMetric: string;
  outcomeDelta: number;
};

const D = (year: number, month: number, day: number) => new Date(year, month - 1, day);

const MEMORIES: SeededMemory[] = [
  {
    id: "mem-arena-euroskills-2024",
    occurredAt: D(2024, 4, 18),
    module: "HOTELS",
    headlineEn: "Arena hosts EuroSkills, revenue spikes +720%",
    headlineAr: "أرينا تستضيف EuroSkills، الإيراد يقفز 720٪",
    bodyEn:
      "Arena Sofia hosted the EuroSkills Conference for 1,800 attendees over six nights. Daily revenue spiked +720% versus the prior month's baseline. F&B kitchens at the property ran out of feta on day four — Maha had to ship two emergency batches at premium logistics cost.",
    bodyAr:
      "استضافت أرينا صوفيا مؤتمر EuroSkills بمشاركة 1,800 شخص لست ليالٍ. الإيراد اليومي قفز 720٪ مقارنةً بالشهر السابق. مطابخ الفندق نفد لديها الفيتا في اليوم الرابع — اضطرت المها لشحن دفعتين طارئتين بكلفة لوجستية أعلى.",
    lessonEn:
      "When Arena books a conference > 1,500 attendees, pre-stage F&B inventory at 1.4× the normal rate fourteen days ahead.",
    lessonAr:
      "عندما تحجز أرينا مؤتمراً يضم أكثر من 1,500 شخص، جهّز مخزون F&B بمعدل 1.4× من المعتاد قبل أربعة عشر يوماً.",
    tags: ["hospitality", "conference", "f&b", "dairy", "spike", "arena", "sofia"],
    outcomeMetric: "revenue",
    outcomeDelta: +7.2,
  },
  {
    id: "mem-loran-moisture-2024",
    occurredAt: D(2024, 9, 7),
    module: "FARMS",
    headlineEn: "Loran greenhouse moisture crash slips harvest by 14 days",
    headlineAr: "انهيار رطوبة دفيئة لوران يؤجّل الحصاد 14 يوماً",
    bodyEn:
      "Soil moisture in the smart greenhouse dropped to 22% for over four days against a 35% floor. The irrigation valve had a hairline crack that nobody caught. Tomato yield came in 38% below the seasonal target. The Loran director was notified on day five — too late.",
    bodyAr:
      "انخفضت رطوبة التربة في الدفيئة الذكية إلى 22٪ لأكثر من أربعة أيام مقابل حد أدنى 35٪. كان هناك تشقق دقيق في صمام الري لم يلاحظه أحد. جاء محصول الطماطم بنسبة 38٪ أقل من الهدف الموسمي. أُبلغ مدير لوران في اليوم الخامس — متأخّراً.",
    lessonEn:
      "Auto-escalate any soil moisture reading below 30% for more than 24 hours to the Loran director the same day.",
    lessonAr:
      "صعّد تلقائياً أي قراءة رطوبة تربة تحت 30٪ لأكثر من 24 ساعة إلى مدير لوران في اليوم نفسه.",
    tags: ["agriculture", "moisture", "harvest", "irrigation", "loran", "yield"],
    outcomeMetric: "yield",
    outcomeDelta: -0.38,
  },
  {
    id: "mem-maha-labneh-writeoff-2025",
    occurredAt: D(2025, 3, 21),
    module: "DAIRY",
    headlineEn: "Maha labneh batch MAHA-00043 written off, JOD 12,400 lost",
    headlineAr: "إعدام دفعة لبنة المها MAHA-00043، خسارة 12,400 د.أ",
    bodyEn:
      "1,180 liters of labneh from MAHA-00043 expired in cold storage. The expiry was visible on the dashboard for nine days but was never escalated. The full batch was written off at a cost of JOD 12,400, plus reputational ripple at the distributor.",
    bodyAr:
      "انتهت صلاحية 1,180 لتر من اللبنة من الدفعة MAHA-00043 في التخزين المبرّد. كان تاريخ الانتهاء ظاهراً على اللوحة لتسعة أيام دون أن يُصعَّد. أُعدمت الدفعة بالكامل بكلفة 12,400 د.أ، إضافةً إلى أثر سمعة عند الموزع.",
    lessonEn:
      "Any dairy batch within 5 days of expiry must trigger a daily morning report to procurement until disposed.",
    lessonAr:
      "أي دفعة ألبان ضمن 5 أيام من الانتهاء يجب أن تُولّد تقرير صباحي يومي للتزويد حتى يُتصرّف بها.",
    tags: ["dairy", "expiry", "labneh", "writeoff", "margin", "maha"],
    outcomeMetric: "expiry_risk",
    outcomeDelta: +1.0,
  },
  {
    id: "mem-arena-sofia-heatwave-2024",
    occurredAt: D(2024, 6, 22),
    module: "HOTELS",
    headlineEn: "Arena Sofia loses 42% occupancy during heatwave",
    headlineAr: "أرينا صوفيا تفقد 42٪ من إشغالها خلال موجة حر",
    bodyEn:
      "Five days of forecasted temperatures above 38°C collapsed walk-in demand at Arena Sofia. Occupancy fell 42% week-over-week, and F&B revenue followed at -31%. Group rates were not adjusted in time. Several corporate accounts moved their bookings to autumn.",
    bodyAr:
      "خمسة أيام من توقعات درجات الحرارة فوق 38°م انهار معها الطلب العابر في أرينا صوفيا. انخفض الإشغال 42٪ أسبوعياً، وتبعه إيراد F&B بـ-31٪. لم تُعدّل أسعار المجموعات في الوقت المناسب. حوّل عدد من العملاء الشركاتيين حجوزاتهم إلى الخريف.",
    lessonEn:
      "When the regional forecast shows 5+ consecutive days above 38°C, pre-discount group rates by 15-20% before the demand collapses.",
    lessonAr:
      "عندما تُظهر التوقعات الإقليمية 5 أيام أو أكثر فوق 38°م، اخفض أسعار المجموعات 15-20٪ قبل انهيار الطلب.",
    tags: ["hospitality", "weather", "occupancy", "arena", "sofia", "heatwave"],
    outcomeMetric: "occupancy",
    outcomeDelta: -0.42,
  },
  {
    id: "mem-tank-2024s2-unicorns",
    occurredAt: D(2024, 11, 12),
    module: "EDUCATION",
    headlineEn: "The Tank's 2024-S2 cohort produces three unicorns",
    headlineAr: "كوهورت 2024-S2 في حاضنة The Tank يُنتج ثلاث شركات يونيكورن",
    bodyEn:
      "Three startups from the Tank Incubator's 2024-S2 cohort hit unicorn valuations within twelve months of graduation. Common factor: each had been mentored by an anchor founder who'd previously run five cohorts and held weekly office hours.",
    bodyAr:
      "ثلاث شركات ناشئة من كوهورت 2024-S2 في حاضنة The Tank وصلت إلى تقييم اليونيكورن خلال اثني عشر شهراً من التخرج. القاسم المشترك: كانت كل منها تحت إشراف مؤسس مرساة سبق له إدارة خمس كوهورت وعقد ساعات مكتبية أسبوعية.",
    lessonEn:
      "Institutionalize anchor-founder mentorship as a required module across every cohort going forward.",
    lessonAr:
      "أسّس إرشاد المؤسس المرساة كوحدة إلزامية في كل كوهورت قادم.",
    tags: ["education", "cohort", "tank", "mentorship", "unicorns"],
    outcomeMetric: "yield",
    outcomeDelta: +3.0,
  },
  {
    id: "mem-margin-energy-2025",
    occurredAt: D(2025, 1, 15),
    module: "FINANCE",
    headlineEn: "Group margin compresses to 11.4% after energy spike",
    headlineAr: "هامش المجموعة ينخفض إلى 11.4٪ بعد ارتفاع أسعار الطاقة",
    bodyEn:
      "Regional energy index rose 17% in three weeks. Maha's cold-chain operating cost absorbed most of the impact; group contribution margin compressed from 16.8% to 11.4%. The treasury team had no forward contracts on dairy energy inputs.",
    bodyAr:
      "ارتفع مؤشر الطاقة الإقليمي 17٪ في ثلاثة أسابيع. استوعبت كلفة سلسلة التبريد في المها معظم الأثر؛ تقلّص هامش مساهمة المجموعة من 16.8٪ إلى 11.4٪. لم يكن لدى فريق الخزينة أي عقود مستقبلية على مدخلات طاقة الألبان.",
    lessonEn:
      "When the regional energy index moves +15% within 30 days, hedge dairy production cost via 90-day forward contracts within five working days.",
    lessonAr:
      "عندما يتحرك مؤشر الطاقة الإقليمي +15٪ خلال 30 يوماً، اعقد تحوّطات لمدة 90 يوماً على كلفة إنتاج الألبان في خمسة أيام عمل.",
    tags: ["finance", "energy", "margin", "dairy", "hedging", "treasury"],
    outcomeMetric: "margin",
    outcomeDelta: -0.054,
  },
  {
    id: "mem-loran-critical-ignored-2024",
    occurredAt: D(2024, 8, 4),
    module: "FARMS",
    headlineEn: "Critical farm alert ignored for six days, JOD 8,200 lost",
    headlineAr: "تنبيه مزرعة حرج تُجوهل لستة أيام، خسارة 8,200 د.أ",
    bodyEn:
      "Loran's open-field cucumber plot raised a CRITICAL alert that sat in the queue for six days because no on-call escalation existed. By the time someone walked the field, half the crop was past saving. Direct loss: JOD 8,200, plus a delivery contract at risk.",
    bodyAr:
      "حقل خيار في لوران المكشوف أطلق تنبيهاً حرجاً ظلّ في الطابور لستة أيام لعدم وجود تصعيد للمناوبة. عندما زار أحدهم الحقل، كان نصف المحصول قد فات إنقاذه. خسارة مباشرة: 8,200 د.أ، مع عقد تسليم في خطر.",
    lessonEn:
      "CRITICAL farm alerts must auto-page the Loran director within 60 minutes and escalate to the COO at 24 hours if unresolved.",
    lessonAr:
      "تنبيهات المزرعة الحرجة يجب أن تستدعي مدير لوران تلقائياً خلال 60 دقيقة وتُصعَّد إلى COO عند 24 ساعة إن لم تُحلّ.",
    tags: ["agriculture", "alerts", "escalation", "loran", "critical", "yield"],
    outcomeMetric: "yield",
    outcomeDelta: -0.5,
  },
  {
    id: "mem-arena-fb-promo-2024",
    occurredAt: D(2024, 10, 3),
    module: "HOTELS",
    headlineEn: "F&B promo at Arena lifts Maha cheese demand 23% week-over-week",
    headlineAr: "عرض F&B في أرينا يرفع طلب جبنة المها 23٪ أسبوعياً",
    bodyEn:
      "A 15% discount on cheese-anchored dishes ran for seven days across Arena's three properties. F&B traffic rose 18%, and Maha's cheese demand from the group's hotels rose 23% in the same window. Margin held steady — incremental volume offset the discount.",
    bodyAr:
      "خصم 15٪ على الأطباق المعتمدة على الجبنة عُرض لمدة سبعة أيام في فنادق أرينا الثلاثة. ارتفعت حركة F&B 18٪، وارتفع طلب جبنة المها من فنادق المجموعة 23٪ في النافذة نفسها. ثبت الهامش — الحجم الإضافي عوّض الخصم.",
    lessonEn:
      "F&B-side discounts at -15% reliably stimulate Maha cheese demand by ~20% in the same week without harming margin.",
    lessonAr:
      "خصومات F&B عند -15٪ تحفّز طلب جبنة المها ~20٪ في الأسبوع نفسه دون إيذاء الهامش.",
    tags: ["hospitality", "dairy", "promo", "cheese", "arena", "maha", "demand"],
    outcomeMetric: "demand",
    outcomeDelta: +0.23,
  },
];

export async function seedMemoryLake(): Promise<{
  written: number;
  durationMs: number;
}> {
  const t0 = Date.now();
  const lake = memoryLake();
  let written = 0;
  for (const m of MEMORIES) {
    await lake.remember({
      id: m.id,
      ts: m.occurredAt,
      module: m.module,
      headline: { ar: m.headlineAr, en: m.headlineEn },
      body: { ar: m.bodyAr, en: m.bodyEn },
      tags: m.tags,
      entityRefs: [],
      outcome: {
        metric: m.outcomeMetric,
        delta: m.outcomeDelta,
        lessonLearned: m.lessonEn,
      },
    });
    // Patch the Arabic lesson directly (Memory interface only carries English in `lessonLearned`).
    const { prisma } = await import("@/lib/db/db");
    await prisma.memory.update({
      where: { id: m.id },
      data: { lessonAr: m.lessonAr },
    });
    written++;
  }
  return { written, durationMs: Date.now() - t0 };
}
