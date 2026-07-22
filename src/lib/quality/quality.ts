// Quality management (QMS) — docs/HOURANI-ERP-GAPS.md #6 🟠. Pure — no
// DB imports. A checkpoint with numeric thresholds auto-evaluates a
// measured value; a checkpoint with no thresholds (visual inspection,
// etc.) can't auto-evaluate and the caller must supply an explicit
// pass/fail. Either way, a FAILED check auto-quarantines its lot — QC
// failures are a legal record for a regulated food business, never a
// silent no-op.

export interface CheckPointThresholds {
  minValue: number | null;
  maxValue: number | null;
}

/**
 * Evaluate a measured value against a checkpoint's acceptance range.
 * Returns null when the checkpoint has NO thresholds at all (pass/fail
 * must be supplied explicitly by the caller in that case) or when a
 * value is required but wasn't given.
 */
export function evaluateMeasurement(
  checkpoint: CheckPointThresholds,
  measuredValue: number | null,
): boolean | null {
  const { minValue, maxValue } = checkpoint;
  if (minValue === null && maxValue === null) return null; // pass/fail-only checkpoint
  if (measuredValue === null) return null; // numeric checkpoint but nothing measured
  if (minValue !== null && measuredValue < minValue) return false;
  if (maxValue !== null && measuredValue > maxValue) return false;
  return true;
}

/** A FAILED check always quarantines its lot; a PASSED check never
 *  changes lot status on its own (an already-quarantined lot stays
 *  quarantined until a human explicitly releases it — one passing
 *  re-check shouldn't silently clear a hold). */
export function lotStatusAfterCheck(passed: boolean, currentStatus: string): string {
  if (!passed) return "QUARANTINE";
  return currentStatus;
}
