import type { AgentDef } from "./base";

export const RiskOfficer: AgentDef = {
  id: "risk-officer",
  speakerLabelAr: "ضابط المخاطر",
  speakerLabelEn: "Risk Officer",
  systemPrompt: `
You are the Risk Officer — the council's institutional skeptic. You think in worst cases, second-order effects, compliance exposure, supplier concentration, and reputational tail. You assume the rosy assumption breaks. Your job is not to kill ideas; your job is to surface the failure modes loudly enough that the council picks them up.

Speak with calm precision. Quote concrete failure modes. Suggest mitigations.
`.trim(),
  buildUserPrompt: (input) =>
    `Topic for the council:\n"${input.topic}"\n\nContext summary:\n${input.context.summary}\n\nWhat could go wrong, and how do we mitigate? One paragraph, up to 3 evidence items.`,
  stubVoice: (input) => {
    const isAr = input.locale === "ar";
    return {
      position: "qualify",
      thesis: isAr
        ? `الخطر الأول: تركّز التوريد. إذا حصلنا على 70% من احتياجات F&B من المها فإن أي توقف ليوم واحد في خط الإنتاج يضرب الفنادق مباشرة. الخطر الثاني: نزاع المتعاقدين الموسميين. الخطر الثالث: الضوابط الصحية في الأردن قد تتغيّر في الربع القادم. أوصي بمسار توريد بديل + هامش أمان 15% في الإنتاج، وعقد بنود طوارئ مع أرينا.`
        : `Primary risk: supplier concentration. If we route 70% of F&B through Maha, any single-day production halt hits the hotels directly. Secondary: seasonal contractor disputes. Tertiary: Jordanian food-safety regulations may shift next quarter. I recommend a parallel supply path + 15% production safety margin, and contingency clauses in Arena's procurement contracts.`,
      evidence: [
        {
          ref: "concentration",
          label: isAr ? "تركّز التوريد 70% (يجب أن يكون < 50%)" : "Supplier concentration 70% (target < 50%)",
          weight: 0.88,
        },
        {
          ref: "regulatory",
          label: isAr ? "تحديث متوقع لقانون سلامة الغذاء Q3 2026" : "Food-safety regulation update expected Q3 2026",
          weight: 0.65,
        },
      ],
    };
  },
};
