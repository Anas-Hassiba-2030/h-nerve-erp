// Attendance + overtime math — docs/HOURANI-ERP-GAPS.md #7 🟠. Pure —
// no DB imports. Feeds lib/hr/payroll.ts's allowances line so hotel and
// farm shift labour stops being priced as a flat monthly salary the
// moment someone works past their shift.

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Hours between two clock times, floored at 0 (a bad clock-out before
 *  clock-in is a data-entry error, not negative overtime). */
export function hoursWorked(clockIn: Date, clockOut: Date): number {
  const ms = clockOut.getTime() - clockIn.getTime();
  return r2(Math.max(0, ms / 3_600_000));
}

/** Hours beyond the standard workday. Standard defaults to 8 — Jordan's
 *  statutory ordinary workday. */
export function overtimeHours(worked: number, standardHoursPerDay = 8): number {
  return r2(Math.max(0, worked - standardHoursPerDay));
}

/** An hourly rate derived from a flat monthly salary: 26 working days
 *  (6-day work week, Jordan's common pattern) × 8 standard hours. Used
 *  ONLY to price overtime — base pay itself stays untouched. */
export function hourlyRateFromMonthlySalary(monthlySalary: number, standardHoursPerDay = 8, workingDaysPerMonth = 26): number {
  const divisor = workingDaysPerMonth * standardHoursPerDay;
  if (divisor <= 0) return 0;
  return r2(monthlySalary / divisor);
}

/** Overtime pay at a multiplier over the derived hourly rate — 1.5×
 *  ("time and a half") is the common default; the group's real labour
 *  law rate is a config change away, not a rebuild. */
export function overtimePay(hours: number, hourlyRate: number, multiplier = 1.5): number {
  return r2(hours * hourlyRate * multiplier);
}

/** Whether a clock-in counts as LATE against an assigned shift's start
 *  time ("HH:MM"). Same calendar day only — this doesn't handle a shift
 *  that crosses midnight (a v2 problem, not this pass's). */
export function isLateClockIn(clockIn: Date, shiftStartTime: string): boolean {
  const [h, m] = shiftStartTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const shiftStart = new Date(clockIn);
  shiftStart.setHours(h, m, 0, 0);
  return clockIn.getTime() > shiftStart.getTime();
}
