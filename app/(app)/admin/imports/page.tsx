// /admin/imports — import-audit console (the live data-ingest feed).
//
// Placed under (app) on purpose: Topbar, Heritage Modern styling, and the
// flashToast system are all (app) chrome. The page reads the live ImportLog
// stream, summarizes it (today / 24h / acceptance rate / active mappings),
// surfaces the inbound webhook + a "send test batch" action so the surface is
// useful even before n8n is wired, and lets the operator filter by source /
// status / time window without any client JS.

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox, Send, Settings2, FilterX } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  DaylightShell,
  DaylightHeader,
  DaylightKpiGrid,
  DaylightKpi,
  DaylightPanel,
} from "@/components/orrery/daylight";
import { formatDateTime, formatNumber, formatMoney2 } from "@/lib/utils";
import { sourceMatchesSystem } from "@/lib/importMapping";
import { ClearTestImportsButton } from "./ClearTestImportsButton";
import { CopyButton } from "./CopyButton";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import { sendTestBatch } from "./actions";
import "../../daylight.css";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["all", "ok", "partial", "rejected"] as const;
const WINDOW_OPTIONS = ["24h", "7d", "30d", "all"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];
type WindowFilter = (typeof WINDOW_OPTIONS)[number];

function pickStatus(v: string | undefined): StatusFilter {
  return (STATUS_OPTIONS as readonly string[]).includes(v ?? "")
    ? (v as StatusFilter)
    : "all";
}
function pickWindow(v: string | undefined): WindowFilter {
  return (WINDOW_OPTIONS as readonly string[]).includes(v ?? "")
    ? (v as WindowFilter)
    : "7d";
}
function windowMs(w: WindowFilter): number | null {
  return w === "24h" ? 24 * 3600_000 : w === "7d" ? 7 * 24 * 3600_000 : w === "30d" ? 30 * 24 * 3600_000 : null;
}

function relTime(d: Date, ar: boolean): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return ar ? "الآن" : "just now";
  if (m < 60) return ar ? `قبل ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? `قبل ${h} ساعة` : `${h}h ago`;
  const days = Math.floor(h / 24);
  return ar ? `قبل ${days} يوم` : `${days}d ago`;
}

export default async function ImportsAdminPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; window?: string };
}) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const q = (searchParams.q ?? "").trim();
  const status = pickStatus(searchParams.status);
  const win = pickWindow(searchParams.window);
  const windowSince = windowMs(win);
  const since = windowSince ? new Date(Date.now() - windowSince) : null;
  const hasFilters = q !== "" || status !== "all" || win !== "7d";

  // Build the filtered list (server-side, all in one round trip).
  const where: Prisma.ImportLogWhereInput = {};
  if (since) where.createdAt = { gte: since };
  if (status === "ok") where.status = "OK";
  else if (status === "partial") where.status = "PARTIAL";
  else if (status === "rejected") where.status = "REJECTED";
  if (q) where.source = { contains: q };

  const [batches, activeMappings, totalBatches, lastBatch] = await Promise.all([
    prisma.importLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { rows: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.tenantImportMapping.findMany({
      where: { active: true },
      select: { tenantId: true, sourceSystem: true },
    }),
    prisma.importLog.count(),
    prisma.importLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  // KPI math — over the SELECTED window for "Rows (24h)" / "Acceptance rate".
  const totalRows = batches.reduce((s, b) => s + b.rows.length, 0);
  const totalAccepted = batches.reduce((s, b) => s + b.accepted, 0);
  const totalRejected = batches.reduce((s, b) => s + b.rejected, 0);
  const successRate =
    totalAccepted + totalRejected > 0
      ? Math.round((totalAccepted / (totalAccepted + totalRejected)) * 100)
      : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = await prisma.importLog.count({ where: { createdAt: { gte: startOfToday } } });

  // Channel health pill: "active" if a batch landed in the last 60min, else "idle".
  const lastBatchAt = lastBatch?.createdAt ?? null;
  const channelActive =
    lastBatchAt !== null && Date.now() - lastBatchAt.getTime() < 60 * 60_000;

  // Webhook URL — built server-side from the request host so the operator
  // can copy a real address, not a placeholder.
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const webhookUrl = host ? `${proto}://${host}/api/import/test` : "/api/import/test";

  const wasMapped = (b: { source: string | null; tenantId: string | null }) =>
    !!b.source &&
    !!b.tenantId &&
    activeMappings.some(
      (mp) =>
        mp.tenantId === b.tenantId &&
        sourceMatchesSystem(b.source as string, mp.sourceSystem),
    );

  const dash = "—";
  const samplePayload = `{
  "source": "n8n-warehouse",
  "tenantId": "arena",
  "records": [
    { "sku": "PROD-001", "name": "Coffee Beans 1kg",
      "quantity": 50, "unitCost": 8.50,
      "supplier": "ACME Co.", "warehouse": "Main" }
  ]
}`;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <DaylightHeader
        eyebrow={ar ? "تكامل · قناة الاستيعاب الحية" : "Integrations · Live ingest channel"}
        title={ar ? "سجل الاستيراد" : "Import Log"}
        subtitle={
          ar
            ? "كل دفعة بيانات تصل عبر POST /api/import/test من n8n أو الأنظمة الخارجية تُسجَّل وتُحكم هنا — مع الموردين، المستودعات، التكاليف، وحالة كل سجل."
            : "Every batch posted to /api/import/test from n8n or external systems is captured and reconciled here — suppliers, warehouses, costs, and per-row status."
        }
        status={
          channelActive
            ? ar
              ? `قناة نشطة · آخر دفعة ${relTime(lastBatchAt!, true)}`
              : `Channel active · last batch ${relTime(lastBatchAt!, false)}`
            : lastBatchAt
              ? ar
                ? `لا نشاط حديث · آخر دفعة ${relTime(lastBatchAt, true)}`
                : `Idle · last batch ${relTime(lastBatchAt, false)}`
              : ar
                ? "في انتظار أول دفعة"
                : "Waiting for first batch"
        }
        actions={<ClearTestImportsButton ar={ar} />}
      />

      {/* ── Section sub-nav (the AdminFamily, on its own row, breathable) ─ */}
      <AdminFamilyNav current="/admin/imports" ar={ar} />

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <DaylightKpiGrid>
        <DaylightKpi
          label={ar ? "دفعات اليوم" : "Batches today"}
          value={formatNumber(todayCount)}
          hint={ar ? `الإجمالي ${formatNumber(totalBatches)}` : `total ${formatNumber(totalBatches)}`}
        />
        <DaylightKpi
          label={ar ? `سجلات (${win === "all" ? (ar ? "الكل" : "all") : win})` : `Rows (${win})`}
          value={formatNumber(totalRows)}
          hint={
            ar
              ? `${formatNumber(totalAccepted)} مقبول · ${formatNumber(totalRejected)} مرفوض`
              : `${formatNumber(totalAccepted)} accepted · ${formatNumber(totalRejected)} rejected`
          }
        />
        <DaylightKpi
          label={ar ? "معدّل القبول" : "Acceptance rate"}
          value={successRate === null ? dash : `${successRate}%`}
          hint={ar ? "خلال نافذة التصفية" : "within filter window"}
        />
        <DaylightKpi
          label={ar ? "خرائط نشطة" : "Active mappings"}
          value={formatNumber(activeMappings.length)}
          hint={
            <Link href="/admin/mappings" style={{ color: "var(--emerald)", textDecoration: "underline" }}>
              {ar ? "إدارة" : "manage"}
            </Link>
          }
        />
      </DaylightKpiGrid>

      {/* ── Webhook + test panel ─────────────────────────────────────── */}
      <DaylightPanel
        title={ar ? "نقطة الاستيعاب" : "Ingest Endpoint"}
        aside={
          <span>
            {ar ? "المصادقة: " : "Auth: "}
            <code className="dl-code-inline">Bearer IMPORT_API_TOKEN</code>
          </span>
        }
      >
        <div className="dl-webhook">
          <div className="dl-webhook-row">
            <span className="dl-webhook-method">POST</span>
            <code className="dl-webhook-url" title={webhookUrl}>{webhookUrl}</code>
            <CopyButton value={webhookUrl} ar={ar} />
          </div>
          <p className="dl-webhook-hint">
            {ar
              ? "وجّه أتمتة n8n أو أي عميل HTTP إلى هذا العنوان بحمولة JSON تحتوي على مصفوفة records — كل سجل يجب أن يحوي حقل sku."
              : "Point your n8n automation or any HTTP client to this URL with a JSON payload that includes a records array — every record must carry an sku."}
          </p>
          <details className="dl-sample">
            <summary>{ar ? "نموذج حمولة JSON" : "Sample JSON payload"}</summary>
            <pre className="dl-code-block">{samplePayload}</pre>
          </details>
          <div className="dl-webhook-actions">
            <form action={sendTestBatch}>
              <button type="submit" className="dl-btn dl-btn-primary">
                <Send className="h-3.5 w-3.5" />
                {ar ? "إرسال دفعة تجريبية" : "Send test batch"}
              </button>
            </form>
            <Link href="/admin/mappings" className="dl-btn dl-btn-secondary">
              <Settings2 className="h-3.5 w-3.5" />
              {ar ? "إدارة خرائط المصادر" : "Manage source mappings"}
            </Link>
          </div>
        </div>
      </DaylightPanel>

      {/* ── Filters (plain GET form, server-rendered) ────────────────── */}
      <form className="dl-filters reveal" action="/admin/imports" method="GET">
        <div className="dl-filter-field dl-filter-search">
          <label htmlFor="f-q">{ar ? "بحث في المصدر" : "Search source"}</label>
          <input id="f-q" name="q" type="text" defaultValue={q} placeholder={ar ? "مثل: n8n-warehouse" : "e.g. n8n-warehouse"} />
        </div>
        <div className="dl-filter-field">
          <label htmlFor="f-status">{ar ? "الحالة" : "Status"}</label>
          <select id="f-status" name="status" defaultValue={status}>
            <option value="all">{ar ? "الكل" : "All"}</option>
            <option value="ok">{ar ? "ناجح" : "OK"}</option>
            <option value="partial">{ar ? "جزئي" : "Partial"}</option>
            <option value="rejected">{ar ? "مرفوض" : "Rejected"}</option>
          </select>
        </div>
        <div className="dl-filter-field">
          <label htmlFor="f-win">{ar ? "النافذة الزمنية" : "Window"}</label>
          <select id="f-win" name="window" defaultValue={win}>
            <option value="24h">{ar ? "٢٤ ساعة" : "24 hours"}</option>
            <option value="7d">{ar ? "٧ أيام" : "7 days"}</option>
            <option value="30d">{ar ? "٣٠ يوماً" : "30 days"}</option>
            <option value="all">{ar ? "الكل" : "All time"}</option>
          </select>
        </div>
        <div className="dl-filter-actions">
          <button type="submit" className="dl-btn dl-btn-primary">
            {ar ? "تطبيق" : "Apply"}
          </button>
          {hasFilters ? (
            <Link href="/admin/imports" className="dl-btn dl-btn-secondary">
              <FilterX className="h-3.5 w-3.5" />
              {ar ? "مسح" : "Clear"}
            </Link>
          ) : null}
        </div>
      </form>

      {/* ── Batches list / empty / no-match ──────────────────────────── */}
      {batches.length === 0 ? (
        <div className="panel reveal flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {hasFilters
              ? ar
                ? "لا توجد دفعات تطابق هذه المرشحات"
                : "No batches match these filters"
              : ar
                ? "لا توجد عمليات استيراد بعد"
                : "No imports yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)", maxWidth: "44ch" }}>
            {hasFilters
              ? ar
                ? "وسّع النافذة الزمنية أو امسح المرشحات لرؤية كل الدفعات."
                : "Widen the time window or clear the filters to see every batch."
              : ar
                ? "وصِّل أتمتة n8n بنقطة الاستيعاب أعلاه أو اضغط «إرسال دفعة تجريبية» لمعاينة كيف تظهر البيانات هنا."
                : "Wire your n8n automation to the endpoint above, or hit \"Send test batch\" to preview how data lands here."}
          </p>
          {hasFilters ? (
            <Link href="/admin/imports" className="dl-btn dl-btn-secondary">
              <FilterX className="h-3.5 w-3.5" />
              {ar ? "مسح المرشحات" : "Clear filters"}
            </Link>
          ) : null}
        </div>
      ) : (
        <section className="dl-batches">
          <div className="dl-batches-meta">
            <span>
              {ar
                ? `يعرض ${formatNumber(batches.length)} دفعة`
                : `Showing ${formatNumber(batches.length)} batch${batches.length === 1 ? "" : "es"}`}
              {batches.length === 200 ? (ar ? " (الحد الأقصى)" : " (max)") : null}
            </span>
          </div>
          {batches.map((b) => {
            const total = b.rows.length;
            const accRatio = total > 0 ? Math.round((b.accepted / total) * 100) : 0;
            const batchStatus =
              b.status === "REJECTED" ? "rej" : b.status === "PARTIAL" ? "partial" : "ok";
            return (
              <details key={b.id} className="dl-batch reveal" data-status={batchStatus}>
                <summary className="dl-batch-summary">
                  <ArrowRight
                    className="dl-batch-caret"
                    style={{ color: "var(--ink-muted)" }}
                    aria-hidden
                  />
                  <div className="dl-batch-id">
                    <span
                      className="dl-batch-source"
                      title={b.source ?? undefined}
                    >
                      {b.source ?? (ar ? "(بدون مصدر)" : "(no source)")}
                    </span>
                    <span className="dl-batch-tags">
                      {wasMapped(b) ? (
                        <Link
                          href="/admin/mappings"
                          className="badge-violet"
                          title={
                            ar
                              ? "طُبِّقت خريطة استيراد على هذه الدفعة"
                              : "An import mapping was applied to this batch"
                          }
                        >
                          {ar ? "مُترجَم" : "mapped"}
                        </Link>
                      ) : null}
                      <span className="badge-slate">
                        {b.tenantId ?? (ar ? "بدون مستأجر" : "no tenant")}
                      </span>
                    </span>
                  </div>
                  <div className="dl-batch-bar" aria-hidden>
                    <i style={{ width: `${accRatio}%` }} />
                  </div>
                  <div className="dl-batch-counts">
                    <span className="badge-emerald">
                      {ar ? "مقبول" : "ok"} {b.accepted}
                    </span>
                    <span className={b.rejected > 0 ? "badge-red" : "badge-slate"}>
                      {ar ? "مرفوض" : "rej"} {b.rejected}
                    </span>
                    <span className="dl-batch-total">
                      {ar ? "الإجمالي" : "total"}{" "}
                      <b>{formatNumber(total)}</b>
                    </span>
                  </div>
                  <div className="dl-batch-time">
                    <span>{relTime(b.createdAt, ar)}</span>
                    <span className="dl-batch-time-abs">
                      {formatDateTime(b.createdAt, ar ? "ar" : "en")}
                    </span>
                  </div>
                </summary>

                <div className="dl-batch-body">
                  <table className="dl-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>{ar ? "المنتج" : "Product"}</th>
                        <th className="num">{ar ? "الكمية" : "Qty"}</th>
                        <th className="num">{ar ? "تكلفة الوحدة (د.أ)" : "Unit cost (JOD)"}</th>
                        <th>{ar ? "المورّد" : "Supplier"}</th>
                        <th>{ar ? "المستودع" : "Warehouse"}</th>
                        <th>{ar ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r) => {
                        const ok = r.status === "ACCEPTED";
                        return (
                          <tr key={r.id}>
                            <td className="font-mono">
                              {r.sku ? (
                                <Link
                                  href={`/admin/products?sku=${encodeURIComponent(r.sku)}`}
                                  className="underline decoration-dotted underline-offset-2"
                                  style={{ color: "var(--emerald)" }}
                                  title={ar ? "عرض في كتالوج المنتجات" : "View in product catalog"}
                                >
                                  {r.sku}
                                </Link>
                              ) : (
                                <span style={{ color: "var(--ink-muted)" }}>{dash}</span>
                              )}
                            </td>
                            <td>{r.productName ?? dash}</td>
                            <td className="num font-mono">
                              {r.quantity != null ? formatNumber(r.quantity) : dash}
                            </td>
                            <td className="num font-mono">
                              {r.unitCost != null
                                ? formatMoney2(Number(r.unitCost))
                                : dash}
                            </td>
                            <td>{r.supplier ?? dash}</td>
                            <td>{r.warehouse ?? dash}</td>
                            <td>
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
                                <span className="dl-batch-err">{r.error}</span>
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
    </DaylightShell>
  );
}
