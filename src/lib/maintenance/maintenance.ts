// Maintenance order lifecycle — docs/HOURANI-ERP-GAPS.md #5 🟠. Pure —
// no DB imports. A WorkCenter's `active` flag already gates the
// alternative-work-center reassignment path (manufacturing/actions.ts);
// this decides when a MaintenanceOrder transition should flip it, so a
// technician starting work automatically takes the centre offline
// instead of relying on a separate manual toggle.

export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED";

const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export function canTransition(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Whether a work centre tied to a maintenance order in `status` should
 *  be ACTIVE (available for scheduling) or not. Only IN_PROGRESS takes
 *  it offline — SCHEDULED (not started yet) and both terminal states
 *  (DONE, CANCELLED) leave it available. */
export function workCenterShouldBeActive(status: MaintenanceStatus): boolean {
  return status !== "IN_PROGRESS";
}
