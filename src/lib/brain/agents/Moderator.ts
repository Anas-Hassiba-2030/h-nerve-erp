// Moderator — synthesizes the specialist voices into a single recommendation
// with confidence and dissent. Runs AFTER the specialists, with their full
// transcript as input.

import { callLlm, councilModel, extractJson } from "../llm";
import type { AgentVoice } from "../council";

export type ModeratorOutput = {
  recommendation: string;
  confidence: number;          // 0..1
  dissentNote?: string;        // only if a strong minority disagreed
  speakerLabel: { ar: string; en: string };
};

const SYSTEM = `
You are the Moderator of an executive council. Specialist voices have already spoken.
Your job is to synthesize their positions into a single recommendation that an
executive can act on. You do not flatter. You do not hedge endlessly. You give a
clear yes/no/qualified-yes with a confidence score, and you flag any strong dissent
the executive should be aware of.

Speak in editorial prose. 2-4 sentences. Reference voices by their role when useful
("the Risk Officer flagged..."). Be specific about what action to take next.
`.trim();

const INSTRUCTION_EN = `
Respond ONLY with a JSON object of this shape:
{
  "recommendation": "<2-4 sentence editorial paragraph>",
  "confidence": <0..1, e.g. 0.74>,
  "dissentNote": "<optional 1-sentence dissent note, or null if no strong dissent>"
}
Do not include any text outside the JSON object.
`.trim();

const INSTRUCTION_AR = `
أجب بكائن JSON فقط بهذا الشكل:
{
  "recommendation": "<فقرة تحريرية من جملتين إلى أربع جمل>",
  "confidence": <0..1، مثال 0.74>,
  "dissentNote": "<ملاحظة معارضة من جملة واحدة، أو null في غياب معارضة قوية>"
}
لا تُضف أي نص خارج كائن JSON.
`.trim();

export async function runModerator({
  topic,
  voices,
  locale,
}: {
  topic: string;
  voices: AgentVoice[];
  locale: "ar" | "en";
}): Promise<ModeratorOutput> {
  const isAr = locale === "ar";
  const transcript = voices
    .map(
      (v, i) =>
        `${i + 1}. ${v.speakerLabel.en} (${v.position.toUpperCase()}): ${v.thesis}`
    )
    .join("\n\n");

  const userPrompt = isAr
    ? `الموضوع: "${topic}"\n\nأصوات المتخصصين:\n${transcript}\n\nقدّم توصيتك المُجمّعة.`
    : `Topic: "${topic}"\n\nSpecialist transcript:\n${transcript}\n\nGive your synthesized recommendation.`;

  const stub = () => {
    // Heuristic stub: count positions, lean toward the majority but factor dissent.
    const support = voices.filter((v) => v.position === "support").length;
    const oppose = voices.filter((v) => v.position === "oppose").length;
    const qualify = voices.filter((v) => v.position === "qualify").length;
    const total = Math.max(1, voices.length);
    const tilt = (support - oppose) / total;
    let confidence: number;
    let recommendation: string;
    if (tilt > 0.3) {
      confidence = 0.78;
      recommendation = isAr
        ? `المجلس يميل بشكل واضح إلى المضي قدماً، مع التحفظات التشغيلية التي طرحها فريق الإنتاج. أقترح اعتماد الفكرة بشروط: مسار توريد ثنائي، مراجعة هامش بعد 30 يوماً، وحدود إنتاجية لا تتجاوز 110% من المعدل الحالي حتى نتحقق من السوق.`
        : `The council leans clearly toward going ahead, with the operational caveats production raised. I recommend committing with conditions: dual-supply path, margin review at 30 days, and a 110% production cap on current rate until the market signal validates.`;
    } else if (tilt < -0.3) {
      confidence = 0.72;
      recommendation = isAr
        ? `الميل العام في المجلس ضد التحرك السريع. التوصية: لا نفعل شيئاً هذا الأسبوع. نُعيد عرض الحالة بعد جمع بيانات إضافية في 14 يوماً، خصوصاً جدولة الفعاليات في أرينا وتقدير هامش المساهمة الحقيقي.`
        : `The council leans against acting fast. Recommendation: hold this week. Reconvene after 14 days with hard data — Arena's event calendar and an unfudged contribution-margin sheet.`;
    } else {
      confidence = 0.62;
      recommendation = isAr
        ? `المجلس منقسم بين المؤيد والمتحفّظ، والقرار سيعتمد على معطيين خارج النقاش الحالي: حالة دفعتي الانتهاء الوشيك في المها، وتأكيد جدول فعاليات أرينا للأسابيع الستة القادمة. أقترح مسار قرار من خطوتين: تثبيت خلال 7 أيام، مراجعة عند توفر هذه المعطيات.`
        : `The council is split — qualified support but real dissent. The decision pivots on two data points outside today's discussion: Maha's near-expiry batches, and confirmation of Arena's six-week event calendar. I recommend a two-step decision: hold for 7 days, review when those data points land.`;
    }

    const dissenter = voices.find((v) => v.position === "oppose");
    const dissentNote = dissenter
      ? isAr
        ? `${dissenter.speakerLabel.ar}: ${dissenter.thesis.split(".")[0]}.`
        : `${dissenter.speakerLabel.en}: ${dissenter.thesis.split(".")[0]}.`
      : undefined;

    return JSON.stringify({ recommendation, confidence, dissentNote });
  };

  const res = await callLlm(
    {
      system: SYSTEM + "\n\n" + (isAr ? INSTRUCTION_AR : INSTRUCTION_EN),
      user: userPrompt,
      maxTokens: 500,
      temperature: 0.5,
      expectJson: true,
      model: councilModel(),
    },
    stub
  );

  const parsed = extractJson<{
    recommendation: string;
    confidence: number;
    dissentNote?: string | null;
  }>(res.text);

  if (!parsed) {
    const fallback = JSON.parse(stub());
    return {
      ...fallback,
      speakerLabel: { ar: "المُيَسّر", en: "Moderator" },
    };
  }

  return {
    recommendation: parsed.recommendation,
    confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
    dissentNote: parsed.dissentNote ?? undefined,
    speakerLabel: { ar: "المُيَسّر", en: "Moderator" },
  };
}
