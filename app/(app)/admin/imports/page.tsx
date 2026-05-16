// /admin/imports — import-audit console.
//
// Placed under the (app) route group on purpose: Topbar, Heritage
// Modern styling, and the flashToast system are all (app) chrome (the
// (admin) Sleek shell renders none of them). Route groups don't change
// the URL, so this still serves at /admin/imports with no collision
// against (admin)/admin/tenants. Server component, no client fetching.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox } from "lucide-react";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import { formatDateTime, formatNumber, formatMoney2 } from "@/lib/utils";
import { ClearTestImportsButton } from "./ClearTestImportsButton";

export const dynamic = "force-dynamic";

export default async function ImportsAdminPage() {
  const ar = getLocale() === "ar";
  // Standard (app) gate (mirrors (admin)/layout.tsx): no session → /login,
  // then role-gate this cross-tenant surface.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }

  const batches = await prismaUnscoped.importLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { rows: { orderBy: { createdAt: "asc" } } },
  });

  const totalRows = batches.reduce((s, b) => s + b.rows.length, 0);
  const totalAccepted = batches.reduce((s, b) => s + b.accepted, 0);
  const totalRejected = batches.reduce((s, b) => s + b.rejected, 0);

  const dash = "—";

  return (
    <>
      <Topbar
        eyebrow={ar ? "تكامل" : "Integrations"}
        title={ar ? "سجل الاستيراد" : "Import Log"}
        subtitle={
          ar
            ? "كل دفعة وصلت عبر POST /api/import/test — اضغط للتوسيع"
            : "Every batch received via POST /api/import/test — click to expand"
        }
        actions={<ClearTestImportsButton ar={ar} />}
        metrics={[
          { label: ar ? "دفعات" : "Batches", value: formatNumber(batches.length), tone: "blue" },
          { label: ar ? "سجلات" : "Rows", value: formatNumber(totalRows), tone: "violet" },
          { label: ar ? "مقبول" : "Accepted", value: formatNumber(totalAccepted), tone: "emerald" },
          { label: ar ? "مرفوض" : "Rejected", value: formatNumber(totalRejected), tone: "amber" },
        ]}
      />

      {batches.length === 0 ? (
        <div className="card card-pad flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {ar ? "لا توجد عمليات استيراد بعد" : "No imports yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {ar
              ? "ستظهر دفعات n8n هنا بمجرد وصول أول POST."
              : "n8n batches appear here once the first POST lands."}
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {batches.map((b) => {
            const total = b.rows.length;
            return (
              <details key={b.id} className="card overflow-hidden">
                <summary
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  style={{ listStyle: "none" }}
                >
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 transition-transform"
                    style={{ color: "var(--text-muted)" }}
                    aria-hidden
                  />
                  <span
                    className="truncate font-mono text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                    title={b.source ?? undefined}
                  >
                    {b.source ?? (ar ? "(بدون مصدر)" : "(no source)")}
                  </span>
                  <span className="badge-slate">
                    {b.tenantId ?? (ar ? "بدون مستأجر" : "no tenant")}
                  </span>
                  <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                    <span style={{ color: "var(--text-muted)" }}>
                      {ar ? "الإجمالي" : "total"}{" "}
                      <b style={{ color: "var(--text)" }}>{formatNumber(total)}</b>
                    </span>
                    <span className="badge-emerald">
                      {ar ? "مقبول" : "ok"} {b.accepted}
                    </span>
                    <span className={b.rejected > 0 ? "badge-red" : "badge-slate"}>
                      {ar ? "مرفوض" : "rej"} {b.rejected}
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatDateTime(b.createdAt, ar ? "ar" : "en")}
                    </span>
                  </span>
                </summary>

                <div
                  className="table-wrap"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th className="px-3 py-2 text-start font-bold">SKU</th>
                        <th className="px-3 py-2 text-start font-bold">
                          {ar ? "المنتج" : "Product"}
                        </th>
                        <th className="px-3 py-2 text-end font-bold">
                          {ar ? "الكمية" : "Qty"}
                        </th>
                        <th className="px-3 py-2 text-end font-bold">
                          {ar ? "تكلفة الوحدة (د.أ)" : "Unit cost (JOD)"}
                        </th>
                        <th className="px-3 py-2 text-start font-bold">
                          {ar ? "المورّد" : "Supplier"}
                        </th>
                        <th className="px-3 py-2 text-start font-bold">
                          {ar ? "المستودع" : "Warehouse"}
                        </th>
                        <th className="px-3 py-2 text-start font-bold">
                          {ar ? "الحالة" : "Status"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r) => {
                        const ok = r.status === "ACCEPTED";
                        return (
                          <tr
                            key={r.id}
                            style={{ borderTop: "1px solid var(--border)" }}
                          >
                            <td className="px-3 py-2 font-mono">
                              {r.sku ? (
                                <Link
                                  href={`/admin/products?sku=${encodeURIComponent(r.sku)}`}
                                  className="underline decoration-dotted underline-offset-2"
                                  style={{ color: "var(--brand-deep)" }}
                                  title={ar ? "عرض في كتالوج المنتجات" : "View in product catalog"}
                                >
                                  {r.sku}
                                </Link>
                              ) : (
                                <span style={{ color: "var(--text)" }}>{dash}</span>
                              )}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                              {r.productName ?? dash}
                            </td>
                            <td className="px-3 py-2 text-end font-mono">
                              {r.quantity != null ? formatNumber(r.quantity) : dash}
                            </td>
                            <td className="px-3 py-2 text-end font-mono">
                              {r.unitCost != null
                                ? formatMoney2(Number(r.unitCost))
                                : dash}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                              {r.supplier ?? dash}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                              {r.warehouse ?? dash}
                            </td>
                            <td className="px-3 py-2">
                              <span className={ok ? "badge-emerald" : "badge-red"}>
                                {ok
                                  ? ar
                                    ? "مقبول"
                                    : "ACCEPTED"
                                  : ar
                                    ? "مرفوض"
                                    : "REJECTED"}
                              </span>
                              {!ok && r.error ? (
                                <span
                                  className="ms-2"
                                  style={{ color: "#b91c1c" }}
                                >
                                  {r.error}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </>
  );
}
