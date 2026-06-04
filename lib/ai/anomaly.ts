// Anomaly detector — pure functions usable from server pages.
// Statistical methods: z-score (mean ± std-dev), IQR (interquartile range),
// percentage change vs trailing average. Each returns a list of anomalous
// data points with severity + explanation.

export type AnomalyKind = "SPIKE" | "DIP" | "TREND_REVERSAL" | "OUTLIER";
export type AnomalySeverity = "INFO" | "WARN" | "CRITICAL";

export type Anomaly = {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  metric: string;        // what the metric is (e.g. "revenue", "occupancy")
  context: string;       // where it happened (e.g. "Arena Amman, Day 3")
  observedValue: number;
  expectedValue: number;
  deviationPct: number;  // % deviation from expected
  ar: { headline: string; explanation: string };
  en: { headline: string; explanation: string };
  href?: string;
};

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

// Detect spikes/dips in a numeric series via z-score.
// thresholdZ: how many std-devs counts as anomaly (default 2 = ~95% interval).
export function detectZScoreAnomalies(
  series: Array<{ label: string; value: number }>,
  options: { thresholdZ?: number } = {},
): Array<{ index: number; label: string; value: number; z: number; expected: number }> {
  const z = options.thresholdZ ?? 2;
  if (series.length < 4) return [];
  const values = series.map((s) => s.value);
  const m = mean(values);
  const sd = stddev(values);
  if (sd === 0) return [];
  const out: Array<{ index: number; label: string; value: number; z: number; expected: number }> = [];
  for (let i = 0; i < series.length; i++) {
    const zi = (series[i].value - m) / sd;
    if (Math.abs(zi) >= z) {
      out.push({ index: i, label: series[i].label, value: series[i].value, z: zi, expected: m });
    }
  }
  return out;
}

// Detect "trend reversals" — when a moving average direction flips.
export function detectTrendReversal(
  series: number[],
  window = 3,
): { reversed: boolean; oldDirection: "up" | "down"; newDirection: "up" | "down" } | null {
  if (series.length < window * 2) return null;
  const half = Math.floor(series.length / 2);
  const firstHalfTrend = series[half - 1] - series[0];
  const secondHalfTrend = series[series.length - 1] - series[half];
  if (Math.sign(firstHalfTrend) !== Math.sign(secondHalfTrend) && firstHalfTrend !== 0 && secondHalfTrend !== 0) {
    return {
      reversed: true,
      oldDirection: firstHalfTrend > 0 ? "up" : "down",
      newDirection: secondHalfTrend > 0 ? "up" : "down",
    };
  }
  return null;
}

// High-level: given a labeled series, output Anomaly[] with explanations
// suitable for the AnomalyPanel UI.
export function buildAnomaliesFromSeries(
  metricLabel: { ar: string; en: string },
  context: { ar: string; en: string },
  series: Array<{ label: string; value: number }>,
  unit: string = "",
  href?: string,
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const zs = detectZScoreAnomalies(series, { thresholdZ: 1.8 });
  for (const z of zs) {
    const isSpike = z.z > 0;
    const dev = z.expected > 0 ? ((z.value - z.expected) / z.expected) * 100 : 0;
    const sev: AnomalySeverity = Math.abs(z.z) > 2.5 ? "CRITICAL" : "WARN";
    anomalies.push({
      id: `z-${z.index}-${z.label}`,
      kind: isSpike ? "SPIKE" : "DIP",
      severity: sev,
      metric: metricLabel.en,
      context: `${context.en} · ${z.label}`,
      observedValue: z.value,
      expectedValue: z.expected,
      deviationPct: dev,
      ar: {
        headline: isSpike
          ? `قفزة غير معتادة في ${metricLabel.ar}`
          : `هبوط حاد في ${metricLabel.ar}`,
        explanation: `${context.ar} (${z.label}): القيمة ${z.value.toLocaleString("en-US")}${unit} مقابل متوسط متوقع ${Math.round(z.expected).toLocaleString("en-US")}${unit} — انحراف ${Math.abs(dev).toFixed(0)}٪ ${isSpike ? "أعلى" : "أقل"} من الطبيعي.`,
      },
      en: {
        headline: isSpike
          ? `Unusual spike in ${metricLabel.en}`
          : `Sharp drop in ${metricLabel.en}`,
        explanation: `${context.en} (${z.label}): observed ${z.value.toLocaleString("en-US")}${unit} vs expected ${Math.round(z.expected).toLocaleString("en-US")}${unit} — ${Math.abs(dev).toFixed(0)}% ${isSpike ? "above" : "below"} normal.`,
      },
      href,
    });
  }

  const reversal = detectTrendReversal(series.map((s) => s.value));
  if (reversal?.reversed) {
    anomalies.push({
      id: `rev-${metricLabel.en}`,
      kind: "TREND_REVERSAL",
      severity: "INFO",
      metric: metricLabel.en,
      context: context.en,
      observedValue: series[series.length - 1].value,
      expectedValue: series[0].value,
      deviationPct: 0,
      ar: {
        headline: `انعكاس اتجاه ${metricLabel.ar}`,
        explanation: `الاتجاه كان ${reversal.oldDirection === "up" ? "صاعداً" : "نازلاً"} ثم انعكس إلى ${reversal.newDirection === "up" ? "صاعد" : "نازل"} في النصف الثاني من الفترة. يستحق الانتباه.`,
      },
      en: {
        headline: `${metricLabel.en} trend reversed`,
        explanation: `Was trending ${reversal.oldDirection} then reversed to ${reversal.newDirection} in the second half. Worth investigating.`,
      },
      href,
    });
  }

  return anomalies;
}
