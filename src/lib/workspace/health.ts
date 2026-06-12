// lib/workspace/health.ts — the Company Health composite.
//
// A single 0-100 number a chairman can read in one second, backed by
// four weighted factors. Sector-aware on the operational axis. Pure
// function — deterministic, unit-testable, no I/O.

export type HealthFactor = {
  key: "financial" | "operational" | "signal" | "momentum";
  label: { ar: string; en: string };
  value: number; // 0..100
  weight: number; // sums to 1 across factors
};

export type CompanyHealth = {
  score: number; // 0..100, weighted
  grade: "A" | "B" | "C" | "D";
  verdict: { ar: string; en: string };
  factors: HealthFactor[];
};

export type HealthInput = {
  // Margin as a percentage, e.g. 38 for 38%. Can be negative.
  marginPct: number;
  // Operational sub-score already normalized 0..100 (QC pass-rate for
  // dairy, occupancy for hotels, growing-ratio for agri, etc.).
  operational: number;
  // Count of OPEN critical/alert signals for this company's sector.
  criticalSignals: number;
  // Count of active (DRAFT/ACTIVE) future projects.
  activeProjects: number;
};

const clamp = (n: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, n));

export function computeCompanyHealth(input: HealthInput): CompanyHealth {
  // Financial: 0% margin → 50, +30% → 95, −20% → 20. Linear, clamped.
  const financial = clamp(50 + input.marginPct * 1.5);

  // Operational: caller already normalized this to 0..100.
  const operational = clamp(input.operational);

  // Signal: every open critical signal costs 15 points off a clean 100.
  const signal = clamp(100 - input.criticalSignals * 15);

  // Momentum: a live pipeline is a healthy company. No projects → 40.
  const momentum =
    input.activeProjects > 0
      ? clamp(60 + input.activeProjects * 10)
      : 40;

  const factors: HealthFactor[] = [
    {
      key: "financial",
      label: { ar: "الصحة المالية", en: "Financial" },
      value: Math.round(financial),
      weight: 0.35,
    },
    {
      key: "operational",
      label: { ar: "الصحة التشغيلية", en: "Operational" },
      value: Math.round(operational),
      weight: 0.35,
    },
    {
      key: "signal",
      label: { ar: "حِمل الإشارات", en: "Signal load" },
      value: Math.round(signal),
      weight: 0.2,
    },
    {
      key: "momentum",
      label: { ar: "زخم المشاريع", en: "Momentum" },
      value: Math.round(momentum),
      weight: 0.1,
    },
  ];

  const score = Math.round(
    factors.reduce((a, f) => a + f.value * f.weight, 0),
  );

  const grade: CompanyHealth["grade"] =
    score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D";

  const verdict =
    grade === "A"
      ? { ar: "أداء متميّز — الوحدة في أفضل حالاتها.", en: "Excellent — the unit is firing on all cylinders." }
      : grade === "B"
        ? { ar: "أداء قوي مع مساحة للضبط.", en: "Strong, with room to tighten." }
        : grade === "C"
          ? { ar: "مستقر لكن يستدعي الانتباه.", en: "Stable but needs attention." }
          : { ar: "تحت الضغط — يلزم تدخّل.", en: "Under pressure — intervention needed." };

  return { score, grade, verdict, factors };
}
