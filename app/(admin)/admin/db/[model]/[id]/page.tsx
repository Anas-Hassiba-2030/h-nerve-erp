// /admin/db/[model]/[id] — superadmin DATA BROWSER (single-record view).
// Full, untruncated field dump for one row: every scalar/enum column with
// its type, long text + JSON shown in full. The table viewer truncates
// cells; this is where you read the whole value.
//
// Read-only. Sleek Operator. Both [model] and the id are validated before
// any prisma access: getModel guards the model prop, and a model with no
// @id field can't be addressed here (notFound).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prismaUnscoped } from "@/lib/db/db";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { getModel, formatCell } from "@/lib/db/db.introspect";

export const dynamic = "force-dynamic";

// CROSS-TENANT INTENT: superadmin inspection tool — reads a raw row from any
// workspace/tenant through the unscoped client by design.
const db = prismaUnscoped as unknown as Record<
  string,
  { findFirst: (args?: unknown) => Promise<Record<string, unknown> | null> }
>;

export default async function AdminDbRecordPage({
  params,
}: {
  params: { model: string; id: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const m = getMessages(locale);
  const meta = getModel(params.model);
  if (!meta || !meta.idField) notFound();

  const rawId = decodeURIComponent(params.id);
  // Coerce the URL string to the id column's runtime type.
  const idCol = meta.columns.find((c) => c.name === meta.idField);
  const idValue: string | number =
    idCol && (idCol.type === "Int" || idCol.type === "BigInt") ? Number(rawId) : rawId;

  let row: Record<string, unknown> | null = null;
  let queryError: string | null = null;
  try {
    row = await db[meta.prop].findFirst({ where: { [meta.idField]: idValue } });
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="admin-page admin-page-narrow">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.data"]}</span>
          <h1 className="admin-h1">{meta.name}</h1>
          <p className="admin-sub">
            {meta.idField}: <span style={{ color: "var(--admin-cyan)" }}>{rawId}</span>
          </p>
        </div>
        <Link href={`/admin/db/${meta.prop}`} className="admin-btn-ghost" style={{ alignSelf: "start" }}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} style={{ display: "inline", marginInlineEnd: 6 }} />
          {meta.name}
        </Link>
      </header>

      {queryError ? (
        <div className="admin-empty">
          <p>{ar ? "تعذّر تحميل السجل." : "Could not load record."}</p>
          <p className="admin-stat-label" style={{ marginTop: 8 }}>{queryError}</p>
        </div>
      ) : !row ? (
        <div className="admin-empty">
          <p>{ar ? "لا سجل بهذا المعرّف." : "No record with that id."}</p>
        </div>
      ) : (
        <dl className="admin-record">
          {meta.columns.map((c) => {
            const value = row![c.name];
            const text = formatCell(value);
            const isJson = typeof value === "object" && value !== null && !(value instanceof Date);
            return (
              <div key={c.name} className="admin-record-row">
                <dt>
                  <span>{c.name}</span>
                  <span className="admin-table-type">{c.type}{c.isId ? " · id" : ""}</span>
                </dt>
                <dd className={isJson ? "admin-record-json" : undefined}>{text}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
