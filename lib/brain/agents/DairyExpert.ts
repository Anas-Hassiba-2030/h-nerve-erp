import type { AgentDef } from "./base";

export const DairyExpert: AgentDef = {
  id: "dairy-expert",
  speakerLabelAr: "خبير الألبان",
  speakerLabelEn: "Dairy Expert",
  systemPrompt: `
You are the Dairy Expert — a production manager with deep knowledge of milk handling, cheesemaking, cold chain, and shelf life. You think in liters per day, expiry windows, fat content, batch grades, and feed input cost. You know that dairy is unforgiving: ramp too fast and you crush margins on spoilage; ramp too slow and you lose channel partners forever.

You speak directly. You quote batch numbers, days-to-expiry, and grade letters. You will push back on hospitality colleagues who treat dairy like a faucet that turns on and off — it doesn't. You also push back on finance when their numbers ignore the 14-day raw-milk lead time.
`.trim(),
  buildUserPrompt: (input) =>
    `Topic for the council:\n"${input.topic}"\n\nContext summary:\n${input.context.summary}\n\nGive your dairy-side reading in one tight paragraph plus up to 3 evidence items.`,
  stubVoice: (input) => {
    const isAr = input.locale === "ar";
    const t = input.topic.toLowerCase();
    const aboutRamp = /ramp|increase|expand|توسعة|زيادة|production|إنتاج/i.test(t);
    return {
      position: aboutRamp ? "oppose" : "qualify",
      thesis: isAr
        ? `من جانب الإنتاج، أي قرار بزيادة المخرجات يحتاج إلى 14 يوماً على الأقل من المراعاة في خط الحليب الخام. لا أوافق على ربط الإنتاج بإشغال فندق دون احتساب نافذة الصلاحية. لدينا الآن دفعتان لبنة على بُعد 3 أيام من تاريخ الانتهاء — هذه قنبلة هامش، ليست فرصة. توصيتي: استقرار الإنتاج عند المعدل الحالي حتى نُصرّف المخزون.`
        : `On the production side, any output ramp needs at least a 14-day raw-milk lead time. I do not endorse coupling production directly to hotel occupancy without accounting for the shelf-life window. We have two labneh batches at 3 days to expiry right now — that's a margin bomb, not an opportunity. My read: hold production at current rate until we move the inventory.`,
      evidence: [
        {
          ref: "expiry",
          label: isAr ? "دفعتان قرب انتهاء الصلاحية: MAHA-00007, MAHA-00014" : "2 batches near expiry: MAHA-00007, MAHA-00014",
          weight: 0.92,
        },
        {
          ref: "lead-time",
          label: isAr ? "زمن انتظار الحليب الخام = 14 يوماً" : "Raw-milk lead time = 14 days",
          weight: 0.88,
        },
      ],
    };
  },
};
