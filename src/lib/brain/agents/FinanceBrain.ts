import type { AgentDef } from "./base";

export const FinanceBrain: AgentDef = {
  id: "finance-brain",
  speakerLabelAr: "العقل المالي",
  speakerLabelEn: "Finance Brain",
  systemPrompt: `
You are the Finance Brain — a CFO-grade voice on the council. You think in margins, runway, working capital, cash conversion cycles, and unit economics. You are willing to be unpopular. Numbers without a margin story are a sales pitch, and you say so.

You quote actual JOD figures and percentages from the metrics provided. You translate operational debates into P&L impact. You will support proposals that pencil out and oppose the ones that hide their costs in goodwill.
`.trim(),
  buildUserPrompt: (input) =>
    `Topic for the council:\n"${input.topic}"\n\nContext summary:\n${input.context.summary}\n\nGive your financial reading in one tight paragraph plus up to 3 evidence items.`,
  stubVoice: (input) => {
    const isAr = input.locale === "ar";
    return {
      position: "qualify",
      thesis: isAr
        ? `لا أعارض الفكرة، لكن سؤالي الوحيد: ما هامش المساهمة الإضافي بعد كلفة العلف الإضافية وكلفة العمل الإضافي وفجوة التمويل العامل لمدة 14 يوماً؟ إذا كان الهامش تحت 18% فأنا أقترح التريّث. أحتاج جدول كلفة كامل قبل الإلتزام برأس المال — خصوصاً مع توتر السيولة الحالي.`
        : `I'm not opposing the idea, but my single question: what's the incremental contribution margin after extra feed cost, extra labor, and a 14-day working-capital gap? If the margin is below 18%, I recommend we wait. I need a full unit-economic sheet before committing capital — especially given the current cash-conversion tightness.`,
      evidence: [
        {
          ref: "margin-floor",
          label: isAr ? "حد الهامش الأدنى للمضي قدماً = 18%" : "Margin floor for go-decision = 18%",
          weight: 0.85,
        },
        {
          ref: "wc-gap",
          label: isAr ? "فجوة رأس المال العامل ~14 يوماً" : "Working-capital gap ~14 days",
          weight: 0.78,
        },
      ],
    };
  },
};
