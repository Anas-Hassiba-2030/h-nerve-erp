// /admin/db — superadmin DATA BROWSER (model index). Lists every Prisma
// model from the generated DMMF (lib/db.introspect.ts) with a best-effort
// row-count badge, each linking to its table viewer at /admin/db/[model].
//
// Sleek Operator vocabulary to match the (admin) shell — cyan on near-black.
// Read-only: this surface never mutates. ADMIN-gated by the (admin) layout.

import Link from "next/link";
import { Table2 } from "lucide-react";
import { prismaUnscoped } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { listModels } from "@/lib/db.introspect";

export const dynamic = "force-dynamic";

// CROSS-TENANT INTENT: the Data Browser is a superadmin inspection tool that
// must see raw rows across every workspace/tenant, so it reads through the
// unscoped client by design.
const db = prismaUnscoped as unknown as Record<string, { count: () => Promise<number> }>;

async function countOf(prop: string): Promise<number | null> {
  try {
    return await db[prop].count();
  } catch {
    return null;
  }
}

export default async function AdminDbPage() {
  const ar = getLocale() === "ar";
  const models = listModels();

  const counts = await Promise.all(models.map((m) => countOf(m.prop)));
  const totalRows = counts.reduce<number>((s, c) => s + (c ?? 0), 0);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">SUPERADMIN · DATA</span>
          <h1 className="admin-h1">{ar ? "متصفّح البيانات" : "Data Browser"}</h1>
          <p className="admin-sub">
            {ar
              ? "كل جداول قاعدة البيانات — للقراءة فقط. مبني تلقائياً من مخطّط Prisma."
              : "Every database table — read-only. Generated automatically from the Prisma schema."}
            {" · "}
            {models.length} {ar ? "جدول" : "models"}
            {" · "}
            {totalRows.toLocaleString("en-US")} {ar ? "صف" : "rows"}
          </p>
        </div>
      </header>

      <section className="admin-section">
        <div className="admin-grid">
          {models.map((m, i) => {
            const count = counts[i];
            return (
              <Link key={m.prop} href={`/admin/db/${m.prop}`} className="admin-tenant-card">
                <div
                  className="admin-tenant-card-body"
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      border: "1px solid var(--admin-rule)",
                      color: "var(--admin-cyan)",
                      flexShrink: 0,
                    }}
                  >
                    <Table2 className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <span style={{ display: "grid", gap: 3, minWidth: 0, flex: 1 }}>
                    <span className="admin-tenant-name">{m.name}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--admin-text-muted)",
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                      }}
                    >
                      {m.columns.length} {ar ? "عمود" : "cols"}
                    </span>
                  </span>
                  {count !== null ? (
                    <span
                      className="admin-stat-label"
                      style={{ color: "var(--admin-cyan)", flexShrink: 0 }}
                    >
                      {count.toLocaleString("en-US")}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
