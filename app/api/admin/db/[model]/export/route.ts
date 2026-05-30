// /api/admin/db/[model]/export — CSV export for the superadmin Data Browser.
// Mirrors the current table view (same `q` search + `sort`/`dir`) and streams
// up to CAP rows as a CSV download.
//
// ADMIN-ONLY. A raw whole-table dump is far more sensitive than the
// per-resource CSV at /api/export/[type] (it can target ANY model, incl.
// `user`), so — like /api/export/system-dump — it is gated to ADMIN and
// strips sensitive columns (bcrypt hashes never travel in a response body).
// The [model] param is validated against the DMMF before any prisma access.

import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getModel, formatCell } from "@/lib/db.introspect";

export const dynamic = "force-dynamic";

const CAP = 10000; // row cap — guards a runaway export
const SENSITIVE = new Set(["passwordHash"]); // never export auth secrets

// CROSS-TENANT INTENT: superadmin export — reads raw rows across every
// workspace/tenant through the unscoped client by design.
const db = prismaUnscoped as unknown as Record<
  string,
  { findMany: (args?: unknown) => Promise<Record<string, unknown>[]> }
>;

/** RFC-4180 cell: quote when it contains a comma, quote, CR or LF. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { model: string } },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const meta = getModel(params.model);
  if (!meta) {
    return NextResponse.json({ error: "unknown model" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const reqSort = (sp.get("sort") ?? "").trim();
  const sortField = meta.columns.some((c) => c.name === reqSort) ? reqSort : meta.orderField;
  const sortDir = sp.get("dir") === "asc" ? "asc" : "desc";

  const cols = meta.columns.filter((c) => !SENSITIVE.has(c.name));
  const where =
    q && meta.searchable.length
      ? { OR: meta.searchable.map((f) => ({ [f]: { contains: q } })) }
      : undefined;

  let rows: Record<string, unknown>[] = [];
  try {
    rows = await db[meta.prop].findMany({
      ...(where ? { where } : {}),
      orderBy: { [sortField]: sortDir },
      take: CAP,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const header = cols.map((c) => csvCell(c.name)).join(",");
  const body = rows
    .map((row) => cols.map((c) => csvCell(formatCell(row[c.name]))).join(","))
    .join("\r\n");
  const csv = `${header}\r\n${body}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${meta.prop}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
