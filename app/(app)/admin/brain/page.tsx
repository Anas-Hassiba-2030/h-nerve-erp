// /admin/brain — Brain insights (Phase 10). Surfaces active
// BrainInsight rows produced by lib/intelligence/engine.ts. Same
// conventions as the admin family ((app) group, Heritage Modern,
// Topbar, auth-gated, server component, prisma). The engine
// lives in lib/intelligence/, NOT lib/brain/ (parallel-owned).

import Link from "next/link";
import { redirect } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import { RunAnalysisForm, ResolveButton, DismissButton } from "./BrainForms";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

const SEV_ORDER = ["CRITICAL", "WARNING", "INFO"] as const;
const SEV_BADGE: Record<string, string> = {
  CRITICAL: "badge-red",
  WARNING: "badge-amber",
  INFO: "badge-blue",
};
const TYPES = [
  "LOW_STOCK",
  "REORDER_RECOMMENDATION",
  "STALE_PRODUCT",
  "IMPORT_ANOMALY",
] as const;
const TYPE_AR: Record<string, string> = {
  LOW_STOCK: "مخزون منخفض",
  REORDER_RECOMMENDATION: "توصية إعادة طلب",
  STALE_PRODUCT: "مخزون راكد",
  IMPORT_ANOMALY: "شذوذ استيراد",
};
// Phase P2 — English labels so locale=en doesn't fall through to the
// raw constant name (was showing "LOW_STOCK" verbatim before).
const TYPE_EN: Record<string, string> = {
  LOW_STOCK: "Low stock",
  REORDER_RECOMMENDATION: "Reorder recommendation",
  STALE_PRODUCT: "Stale product",
  IMPORT_ANOMALY: "Import anomaly",
};
const SEV_AR: Record<string, string> = {
  CRITICAL: "حرج",
  WARNING: "تحذير",
  INFO: "معلومة",
};
const SEV_EN: Record<string, string> = {
  CRITICAL: "Critical",
  WARNING: "Warning",
  INFO: "Info",
};

function linkFor(type: string, meta: Record<string, unknown>): string {
  const sku = typeof meta.sku === "string" ? meta.sku : "";
  if (type === "LOW_STOCK" || type === "STALE_PRODUCT") {
    return sku ? `/admin/products?sku=${encodeURIComponent(sku)}` : "/admin/products";
  }
  if (type === "REORDER_RECOMMENDATION") return "/admin/purchase-orders";
  if (type === "IMPORT_ANOMALY") return "/admin/imports";
  return "/admin/products";
}

export default async function BrainPage({ searchParams }: { searchParams: SP }) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    redirect("/dashboard");
  }

  const fType = str(searchParams.type);
  const fSev = str(searchParams.sev).toUpperCase();
  const q = str(searchParams.q);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const active = { resolvedAt: null, dismissedAt: null };
  const [activeCount, criticalCount, resolvedToday, lastRunAgg, list] =
    await Promise.all([
      prisma.brainInsight.count({ where: active }),
      prisma.brainInsight.count({
        where: { ...active, severity: "CRITICAL" },
      }),
      prisma.brainInsight.count({
        where: { resolvedAt: { gte: todayStart } },
      }),
      prisma.brainInsight.aggregate({ _max: { updatedAt: true } }),
      prisma.brainInsight.findMany({
        where: {
          ...active,
          ...(fType ? { type: fType } : {}),
          ...(SEV_ORDER.includes(fSev as (typeof SEV_ORDER)[number])
            ? { severity: fSev }
            : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q } },
                  { body: { contains: q } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);

  const lastRun = lastRunAgg._max.updatedAt;
  const tenantDefault = list[0]?.tenantId ?? "hourani-hotels";
  const dash = "—";

  const grouped = SEV_ORDER.map((sev) => ({
    sev,
    items: list.filter((i) => i.severity === sev),
  })).filter((g) => g.items.length > 0);

  const sevLabel = (s: string) => (ar ? SEV_AR[s] ?? s : SEV_EN[s] ?? s);
  const typeLabel = (t: string) => (ar ? TYPE_AR[t] ?? t : TYPE_EN[t] ?? t);

  return (
    <>
      <Topbar
        eyebrow={ar ? "الذكاء" : "Intelligence"}
        title={ar ? "العقل" : "Brain"}
        subtitle={
          ar
            ? "رؤى قائمة على القواعد — مخزون منخفض، إعادة طلب، ركود، شذوذ استيراد"
            : "Rule-based insights — low stock, reorder, stale, import anomalies"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RunAnalysisForm tenantId={tenantDefault} ar={ar} />
            <AdminFamilyNav current="/admin/brain" ar={ar} />
          </div>
        }
        metrics={[
          {
            label: ar ? "رؤى نشطة" : "Active insights",
            value: formatNumber(activeCount),
            tone: "blue",
          },
          {
            label: ar ? "تنبيهات حرجة" : "Critical alerts",
            value: formatNumber(criticalCount),
            tone: criticalCount > 0 ? "amber" : "emerald",
          },
          {
            label: ar ? "حُلّت اليوم" : "Resolved today",
            value: formatNumber(resolvedToday),
            tone: "emerald",
          },
          {
            label: ar ? "آخر تحليل" : "Last analysis",
            value: lastRun ? formatDateTime(lastRun, ar ? "ar" : "en") : dash,
            tone: "violet",
          },
        ]}
      />

      <div className="card card-pad mt-3">
        <form
          method="GET"
          className="flex flex-wrap items-end gap-2 text-[11px] font-bold"
        >
          <label className="flex flex-col gap-1">
            {ar ? "النوع" : "Type"}
            <select name="type" defaultValue={fType} className="input text-xs">
              <option value="">{ar ? "الكل" : "All"}</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {ar ? "الخطورة" : "Severity"}
            <select name="sev" defaultValue={fSev} className="input text-xs">
              <option value="">{ar ? "الكل" : "All"}</option>
              {SEV_ORDER.map((s) => (
                <option key={s} value={s}>
                  {sevLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {ar ? "بحث" : "Search"}
            <input
              name="q"
              defaultValue={q}
              className="input text-xs"
              placeholder={ar ? "عنوان أو نص…" : "title or body…"}
            />
          </label>
          <button type="submit" className="btn-secondary btn-sm">
            {ar ? "تصفية" : "Filter"}
          </button>
          {(fType || fSev || q) && (
            <Link href="/admin/brain" className="btn-ghost btn-sm">
              {ar ? "مسح" : "Clear"}
            </Link>
          )}
        </form>
      </div>

      {list.length === 0 ? (
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <BrainCircuit
            className="h-10 w-10"
            style={{ color: "var(--text-muted)" }}
          />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {activeCount === 0
              ? ar
                ? "لا رؤى نشطة — شغّل التحليل"
                : "No active insights — run analysis"
              : ar
                ? "لا نتائج مطابقة للمرشّحات"
                : "No insights match the filters"}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-4">
          {grouped.map((g) => (
            <div key={g.sev} className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                <span className={SEV_BADGE[g.sev]}>{sevLabel(g.sev)}</span>
                <span>{formatNumber(g.items.length)}</span>
              </div>
              {g.items.map((i) => {
                let meta: Record<string, unknown> = {};
                try {
                  meta = JSON.parse(i.metadata) as Record<string, unknown>;
                } catch {
                  meta = {};
                }
                return (
                  <div key={i.id} className="card card-pad flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={SEV_BADGE[i.severity] ?? "badge-slate"}>
                        {sevLabel(i.severity)}
                      </span>
                      <span className="badge-slate">{typeLabel(i.type)}</span>
                      <span
                        className="text-sm font-extrabold"
                        style={{ color: "var(--text)" }}
                      >
                        {i.title}
                      </span>
                      <span
                        className="ms-auto font-mono text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDateTime(i.createdAt, ar ? "ar" : "en")}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text)" }}>
                      {i.body}
                    </p>
                    <details>
                      <summary
                        className="cursor-pointer text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-muted)", listStyle: "none" }}
                      >
                        {ar ? "تفاصيل" : "Details"}
                      </summary>
                      <pre
                        className="mt-1 overflow-x-auto rounded p-2 text-[11px]"
                        style={{
                          background: "var(--surface-2, rgba(0,0,0,0.04))",
                          color: "var(--text-muted)",
                        }}
                      >
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    </details>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={linkFor(i.type, meta)}
                        className="btn-ghost btn-sm"
                      >
                        {ar ? "عرض السياق" : "View context"}
                      </Link>
                      <span className="ms-auto flex items-center gap-2">
                        <ResolveButton id={i.id} ar={ar} />
                        <DismissButton id={i.id} ar={ar} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
