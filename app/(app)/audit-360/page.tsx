
export const dynamic = "force-dynamic";
// /audit-360 — single-record cross-module trace.
//
// URL contract: ?entity=<TYPE>&id=<id>
//   entity ∈ COMPANY | HOTEL | BOOKING | DAIRY | FARM | PROGRAM
//          | FORECAST | INSIGHT | TASK | PROJECT | TRANSACTION | USER
//   id     = the record's primary key
//
// Without a selection, the page renders a "recent activity" picker grouped
// by entity so users can drill into anything that's been touched lately.
//
// Visuals are ported to the Claude Design reference
// (docs/design/system/sections/audit.html + audit-ops.js): the .dl-page
// daylight register, .sec-head header, .ops-tabs/.ops-panel tabs, and the
// .ops-table / .ops-tr / .ops-cell / .ops-tag operations table. Real data
// comes from the Prisma queries below; only the look is the design.

import { getLocale } from "@/lib/i18n/i18n.server";
import { isSafeId } from "@/lib/auth/authz";
import { getAuditTrace, getRecentRecords, isValidEntity, type EntityType } from "./data";
import { AuditTraceView } from "./_components/AuditTraceView";
import { AuditPickerView } from "./_components/AuditPickerView";
import "../daylight.css";
import "../audit.css";

export default async function Audit360Page({
  searchParams,
}: {
  searchParams: { entity?: string; id?: string };
}) {
  const ar = getLocale() === "ar";

  const rawEntity = (searchParams.entity ?? "").toUpperCase();
  const rawId = searchParams.id ?? "";
  const hasSelection =
    isValidEntity(rawEntity) && isSafeId(rawId);

  if (hasSelection) {
    const entity = rawEntity as EntityType;
    const id = rawId;

    const trace = await getAuditTrace(entity, id);

    return <AuditTraceView ar={ar} entity={entity} id={id} trace={trace} />;
  }

  // ──── No selection: show a picker driven by recent activity ────
  const records = await getRecentRecords();

  return <AuditPickerView ar={ar} records={records} />;
}
