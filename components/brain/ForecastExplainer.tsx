// Premium "Why this prediction?" explainer chip.
// Shows a 3-step reasoning chain: signal → calculation → recommended action.
// Used inside forecast cards on /supply-chain.

import { Brain, ChevronDown, Activity, Calculator, Lightbulb } from "lucide-react";

export function ForecastExplainer({
  signal,
  predictedDemand,
  unit,
  confidence,
  productLabel,
  sourceCompany,
  targetCompany,
  category,
  locale = "en",
}: {
  signal: string;
  predictedDemand: number;
  unit: string;
  confidence: number;
  productLabel: string;
  sourceCompany: string;
  targetCompany: string;
  category: string;
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const confPct = Math.round(confidence * 100);

  // Synthesize a 3-step reasoning chain from the data
  const steps = ar ? [
    {
      icon: Activity,
      title: "إشارة المصدر",
      body: signal,
      color: "#3b82f6",
    },
    {
      icon: Calculator,
      title: "حساب التوقع",
      body: `بناءً على نمط الطلب التاريخي لهذا النوع من ${category} في ${sourceCompany}، يتوقع المحرك حاجة ${predictedDemand.toLocaleString("en-US")} ${unit} خلال الفترة المحددة. درجة الثقة: ${confPct}%.`,
      color: "#8b5cf6",
    },
    {
      icon: Lightbulb,
      title: "الإجراء الموصى به",
      body: `توجيه ${targetCompany} لتخصيص ${predictedDemand.toLocaleString("en-US")} ${unit} من ${productLabel} مع هامش أمان ${confPct >= 80 ? "10٪" : "20٪"} وفقاً للثقة. الموافقة الآن تتيح ${confPct >= 80 ? "تنفيذاً تلقائياً" : "تنفيذاً يدوياً مع مراجعة"}.`,
      color: "#10b981",
    },
  ] : [
    {
      icon: Activity,
      title: "Source signal",
      body: signal,
      color: "#3b82f6",
    },
    {
      icon: Calculator,
      title: "Forecast computation",
      body: `Based on historical demand patterns for ${category} from ${sourceCompany}, the engine predicts ${predictedDemand.toLocaleString("en-US")} ${unit} demand over the period. Confidence: ${confPct}%.`,
      color: "#8b5cf6",
    },
    {
      icon: Lightbulb,
      title: "Recommended action",
      body: `Direct ${targetCompany} to allocate ${predictedDemand.toLocaleString("en-US")} ${unit} of ${productLabel} with ${confPct >= 80 ? "10%" : "20%"} safety margin per confidence level. Approving now enables ${confPct >= 80 ? "auto-execution" : "manual execution with review"}.`,
      color: "#10b981",
    },
  ];

  return (
    <details
      className="group rounded-xl"
      style={{
        background: "color-mix(in srgb, var(--brand) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--brand) 18%, var(--border))",
      }}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 list-none">
        <span className="flex items-center gap-2 text-[11.5px] font-extrabold" style={{ color: "var(--brand-deep)" }}>
          <Brain className="h-3.5 w-3.5" />
          {ar ? "لماذا هذا التنبؤ؟" : "Why this prediction?"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" style={{ color: "var(--brand)" }} />
      </summary>
      <div className="px-3 pb-3 pt-1">
        <ol className="relative space-y-2 ps-5">
          {/* vertical line */}
          <span
            className="absolute top-2 bottom-2 w-px"
            style={{
              insetInlineStart: "8px",
              background: "color-mix(in srgb, var(--brand) 30%, transparent)",
            }}
          />
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="relative">
                <span
                  className="absolute -start-[20px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ background: step.color, color: "white" }}
                >
                  <Icon className="h-2.5 w-2.5" />
                </span>
                <div className="text-[11.5px] font-extrabold" style={{ color: step.color }}>
                  {step.title}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
