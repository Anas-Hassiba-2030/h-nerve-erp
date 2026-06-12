// /admin/db/[model] — superadmin DATA BROWSER (table viewer). Renders rows
// for one Prisma model: columns from the DMMF, optional `contains` search
// across string columns, take/skip 50 pagination, default DESC ordering.
//
// Read-only — no server actions, no mutations. Sleek Operator vocabulary.
// The [model] param is validated against the DMMF (getModel) BEFORE it ever
// indexes the prisma client, so a crafted URL cannot reach arbitrary props.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { prismaUnscoped } from "@/lib/db/db";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { getModel, formatCell } from "@/lib/db/db.introspect";

export const dynamic = "force-dynamic";

const PER = 50;
const CELL_MAX = 80; // truncate long cell text in the grid

type SP = { [k: string]: string | string[] | undefined };
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

// CROSS-TENANT INTENT: superadmin inspection tool — reads raw rows across
// every workspace/tenant through the unscoped client by design.
const db = prismaUnscoped as unknown as Record<
  string,
  {
    count: (args?: unknown) => Promise<number>;
    findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  }
>;

export default async function AdminDbModelPage(
  props: {
    params: Promise<{ model: string }>;
    searchParams: Promise<SP>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const m = await getMessages(locale);
  const meta = getModel(params.model);
  if (!meta) notFound();

  const q = s(searchParams.q);
  const page = Math.max(1, parseInt(s(searchParams.page) || "1", 10) || 1);

  // Sort: validate the requested column against the DMMF; fall back to the
  // model's default order field. Direction defaults to DESC.
  const reqSort = s(searchParams.sort);
  const sortField = meta.columns.some((c) => c.name === reqSort) ? reqSort : meta.orderField;
  const sortDir: "asc" | "desc" = s(searchParams.dir) === "asc" ? "asc" : "desc";

  const where =
    q && meta.searchable.length
      ? { OR: meta.searchable.map((f) => ({ [f]: { contains: q } })) }
      : undefined;

  let rows: Record<string, unknown>[] = [];
  let total = 0;
  let queryError: string | null = null;
  try {
    [total, rows] = await Promise.all([
      db[meta.prop].count(where ? { where } : undefined),
      db[meta.prop].findMany({
        ...(where ? { where } : {}),
        orderBy: { [sortField]: sortDir },
        take: PER,
        skip: (page - 1) * PER,
      }),
    ]);
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (reqSort) u.set("sort", sortField);
    if (sortDir === "asc") u.set("dir", "asc");
    u.set("page", String(p));
    return `/admin/db/${meta.prop}?${u.toString()}`;
  };
  // Header link: sort by `col`; clicking the active column flips direction.
  const sortHref = (col: string) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    u.set("sort", col);
    if (!(col === sortField && sortDir === "desc")) u.set("dir", "asc");
    return `/admin/db/${meta.prop}?${u.toString()}`;
  };
  const csvHref = (() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    u.set("sort", sortField);
    u.set("dir", sortDir);
    return `/api/admin/db/${meta.prop}/export?${u.toString()}`;
  })();

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.data"]}</span>
          <h1 className="admin-h1">{meta.name}</h1>
          <p className="admin-sub">
            {ar ? "للقراءة فقط" : "Read-only"}
            {" · "}
            {meta.columns.length} {ar ? "عمود" : "columns"}
            {" · "}
            {total.toLocaleString("en-US")} {ar ? "صف" : "rows"}
            {meta.dbName ? ` · @@map ${meta.dbName}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignSelf: "start" }}>
          <a href={csvHref} className="admin-btn-ghost">
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} style={{ display: "inline", marginInlineEnd: 6 }} />
            CSV
          </a>
          <Link href="/admin/db" className="admin-btn-ghost">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} style={{ display: "inline", marginInlineEnd: 6 }} />
            {ar ? "كل الجداول" : "All models"}
          </Link>
        </div>
      </header>

      {meta.searchable.length > 0 ? (
        <form method="get" action={`/admin/db/${meta.prop}`} className="admin-section">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <label className="admin-field" style={{ flex: 1, marginTop: 0 }}>
              <span className="admin-label">
                {ar ? "بحث" : "Search"}{" "}
                <span style={{ textTransform: "none", color: "var(--admin-text-faint)" }}>
                  ({meta.searchable.join(", ")})
                </span>
              </span>
              <input
                name="q"
                defaultValue={q}
                className="admin-input"
                placeholder={ar ? "نص يحتوي…" : "contains text…"}
              />
            </label>
            <button type="submit" className="admin-cta-primary">{ar ? "بحث" : "Search"}</button>
            {q ? (
              <Link href={`/admin/db/${meta.prop}`} className="admin-btn-ghost">
                {ar ? "مسح" : "Clear"}
              </Link>
            ) : null}
          </div>
        </form>
      ) : null}

      {queryError ? (
        <div className="admin-empty">
          <p>{ar ? "تعذّر تحميل الصفوف." : "Could not load rows."}</p>
          <p className="admin-stat-label" style={{ marginTop: 8 }}>{queryError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <p>{ar ? "لا صفوف." : "No rows."}</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {meta.columns.map((c) => {
                  const active = c.name === sortField;
                  return (
                    <th key={c.name}>
                      <Link href={sortHref(c.name)}>
                        <span>
                          {c.name}
                          {active ? (
                            <span className="admin-table-sort">{sortDir === "asc" ? "▲" : "▼"}</span>
                          ) : null}
                        </span>
                        <span className="admin-table-type">{c.type}{c.isId ? " · id" : ""}</span>
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const rowId = meta.idField ? row[meta.idField] : undefined;
                const detailHref =
                  meta.idField && rowId != null
                    ? `/admin/db/${meta.prop}/${encodeURIComponent(String(rowId))}`
                    : null;
                return (
                  <tr key={(rowId as string) ?? ri}>
                    {meta.columns.map((c) => {
                      const text = formatCell(row[c.name]);
                      const clipped = text.length > CELL_MAX ? text.slice(0, CELL_MAX) + "…" : text;
                      const linkCell = detailHref && c.name === meta.idField;
                      return (
                        <td key={c.name} title={text === clipped ? undefined : text}>
                          {linkCell ? <Link href={detailHref}>{clipped}</Link> : clipped}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <nav className="admin-rail-nav" style={{ marginTop: 18, justifyContent: "space-between" }}>
        <span className="admin-stat-label">
          {ar ? "صفحة" : "Page"} {page} / {pages}
        </span>
        <span style={{ display: "flex", gap: 10 }}>
          {page > 1 ? <Link href={qs(page - 1)} className="admin-btn-ghost">{ar ? "السابق" : "Prev"}</Link> : null}
          {page < pages ? <Link href={qs(page + 1)} className="admin-btn-ghost">{ar ? "التالي" : "Next"}</Link> : null}
        </span>
      </nav>
    </div>
  );
}
