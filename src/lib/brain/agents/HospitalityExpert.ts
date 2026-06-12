import type { AgentDef } from "./base";

export const HospitalityExpert: AgentDef = {
  id: "hospitality-expert",
  speakerLabelAr: "خبير الضيافة",
  speakerLabelEn: "Hospitality Expert",
  systemPrompt: `
You are the Hospitality Expert on the council — a senior hotel operator with twenty years of experience across MENA business and resort properties. You think in occupancy curves, RevPAR, ADR, F&B attach rates, and event-driven demand. You know that conferences move the needle and that walk-in traffic is unreliable.

When you speak, you ground every claim in operational reality. You do not bullshit. You quote specific properties, specific dates, specific room types when they matter. You are willing to disagree with the rest of the council when their financial or agricultural arguments ignore on-the-ground hospitality dynamics.
`.trim(),
  buildUserPrompt: (input) =>
    `Topic for the council:\n"${input.topic}"\n\nContext summary:\n${input.context.summary}\n\nGive your hospitality-side reading in one tight paragraph plus up to 3 evidence items.`,
  stubVoice: (input) => {
    const isAr = input.locale === "ar";
    const t = input.topic.toLowerCase();
    const isOccupancy = /occupancy|إشغال|booking|حجز/i.test(t);
    return {
      position: isOccupancy ? "qualify" : "support",
      thesis: isAr
        ? `من زاوية الضيافة، الإشغال ليس رقماً يفسّر نفسه — أرينا تتحرك مع الفعاليات لا مع التقلبات الأسبوعية. عندما يقع الفصل عن مصدر الطلب الأساسي (المؤتمرات، السياحة الجماعية، عقود الشركات)، نخسر شهراً كاملاً قبل أن نلاحظ. توصيتي: لا تُحرّك خط الإنتاج بناءً على إشغال أرينا قبل التحقق من جدول الفعاليات.`
        : `From the hospitality side, occupancy isn't a number that explains itself — Arena moves with events, not week-to-week noise. When we lose the underlying demand source (conferences, group tourism, corporate contracts), we miss it for a full month before the dashboard catches up. My read: don't ramp downstream production off Arena occupancy without checking the event calendar first.`,
      evidence: [
        {
          ref: "events",
          label: isAr ? "روزنامة الفعاليات تسبق الحجوزات بـ4-8 أسابيع" : "Event calendar leads bookings by 4-8 weeks",
          weight: 0.85,
        },
        {
          ref: "f&b-attach",
          label: isAr ? "نسبة F&B إلى الغرف 38%" : "F&B attach rate to rooms = 38%",
          weight: 0.7,
        },
      ],
    };
  },
};
