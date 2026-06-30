import type { AgentDef } from "./base";

// SalesPipelineExpert — Phase 27 (CRM). A VP-Sales voice that reads pipeline
// health: stage distribution, conversion, deal velocity, win/loss. It is
// surfaced on /crm as the "Pipeline read" and is available to convene on CRM
// topics. It is intentionally NOT in the always-on SPECIALIST_AGENTS roster —
// agents.test.ts asserts that roster is exactly 5; convene this one explicitly
// for sales/pipeline questions instead.
export const SalesPipelineExpert: AgentDef = {
  id: "sales-pipeline-expert",
  speakerLabelAr: "خبير قمع المبيعات",
  speakerLabelEn: "Sales Pipeline Expert",
  systemPrompt: `
You are the Sales Pipeline Expert — a VP-Sales voice on the council. You think in pipeline coverage, stage conversion, deal velocity, win rate, and forecast accuracy. You distrust a fat top-of-funnel with a thin close rate, and you say so.

You quote the actual pipeline value, open-opportunity count, and win rate from the metrics provided. You translate growth debates into pipeline math: is there enough qualified coverage to hit the number, and where do deals stall?
`.trim(),
  buildUserPrompt: (input) =>
    `Topic for the council:\n"${input.topic}"\n\nContext summary:\n${input.context.summary}\n\nGive your pipeline reading in one tight paragraph plus up to 3 evidence items.`,
  stubVoice: (input) => {
    const ar = input.locale === "ar";
    const m = input.context.metrics ?? {};
    const open = Number(m.openOpps ?? 0);
    const value = Number(m.pipelineValue ?? 0);
    const win = Number(m.winRate ?? 0);
    const healthy = win >= 30;
    return {
      position: healthy ? "support" : "qualify",
      thesis: ar
        ? `لدينا ${open} فرصة مفتوحة بقيمة ${value} دينار ومعدل إغلاق ${win}%. ${healthy ? "الخط صحي — ركّزوا على تسريع المراحل المتأخرة وإغلاق ما هو في التفاوض." : "معدل الإغلاق منخفض — راجعوا جودة العملاء المحتملين ومرحلة العرض قبل ضخّ المزيد في أعلى القمع."}`
        : `We have ${open} open opportunities worth ${value} JOD at a ${win}% win rate. ${healthy ? "The pipeline is healthy — focus on accelerating late stages and closing what's in negotiation." : "Win rate is low — audit lead quality and the proposal stage before pouring more into the top of the funnel."}`,
      evidence: [
        {
          ref: "pipeline-value",
          label: ar ? `قيمة الخط: ${value} دينار` : `Pipeline value: ${value} JOD`,
          weight: 0.8,
        },
        {
          ref: "win-rate",
          label: ar ? `معدل الإغلاق: ${win}%` : `Win rate: ${win}%`,
          weight: 0.75,
        },
      ],
    };
  },
};
