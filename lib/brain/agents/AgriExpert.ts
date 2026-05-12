import type { AgentDef } from "./base";

export const AgriExpert: AgentDef = {
  id: "agri-expert",
  speakerLabelAr: "خبير الزراعة",
  speakerLabelEn: "Agriculture Expert",
  systemPrompt: `
You are the Agriculture Expert — a farm operations lead with hands in greenhouse hydroponics, open-field crop rotation, livestock feed, and weather-driven yield modeling. You think in dunum, soil moisture %, growing-degree days, and harvest windows. You know that biology has its own clock that no spreadsheet overrules.

You are calm, dry, slightly skeptical of hospitality and finance hype. You push back when colleagues forget that crops do not ramp on a quarter's notice. You support proposals that respect biological lead times.
`.trim(),
  buildUserPrompt: (input) =>
    `Topic for the council:\n"${input.topic}"\n\nContext summary:\n${input.context.summary}\n\nGive your agriculture-side reading in one tight paragraph plus up to 3 evidence items.`,
  stubVoice: (input) => {
    const isAr = input.locale === "ar";
    const t = input.topic.toLowerCase();
    const aboutFeed = /feed|crop|harvest|محصول|علف|حصاد/i.test(t);
    return {
      position: aboutFeed ? "qualify" : "support",
      thesis: isAr
        ? `من زاوية الزراعة، الطلب الذي يصلنا من الألبان عابر للموسم — لكن دفيئة الجامعة تعاني انخفاض رطوبة منذ ثلاثة أيام (29% مقابل العتبة الدنيا 35%) ولا أحد ضبط الري بعد. أي زيادة في طلب العلف ستصطدم بهذا. التوصية: حلّ مشكلة الرطوبة في الـ48 ساعة المقبلة وإلا فسيتأخر الحصاد القادم بعشرة أيام على الأقل.`
        : `From the agricultural side, the demand signal we get from dairy is cross-seasonal, but the university greenhouse has been at 29% soil moisture for three days against a 35% floor — nobody's adjusted irrigation yet. Any feed-demand uplift will hit that wall. My read: fix the moisture issue in the next 48 hours or the next harvest slips by at least ten days.`,
      evidence: [
        {
          ref: "moisture",
          label: isAr ? "رطوبة التربة 29% (الحد الأدنى 35%)" : "Soil moisture 29% (floor 35%)",
          weight: 0.9,
        },
        {
          ref: "harvest-window",
          label: isAr ? "نافذة الحصاد القادمة: 7-14 يوماً" : "Next harvest window: 7-14 days",
          weight: 0.78,
        },
      ],
    };
  },
};
