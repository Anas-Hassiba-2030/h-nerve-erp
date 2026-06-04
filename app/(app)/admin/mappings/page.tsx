// /admin/mappings — per-tenant import column mapping CRUD (Phase 4).
//
// Same placement/conventions as /admin/imports & /admin/products:
// (app) route group, Heritage Modern, Topbar, auth gate, server
// component. Mutations via ./actions.ts server actions. JSON columns
// are String (codebase convention) so we JSON.parse for display.
//
// Phase 11 authz — tenant scope enforced in ./actions.ts via
// resolveAdminTenantId(); listing here is filtered by the scoped prisma
// client (TenantImportMapping is in TENANT_SCOPED_MODELS).

import { redirect } from "next/navigation";
import { ArrowRight, Plus, ListChecks } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { formatDateTime, formatNumber } from "@/lib/utils/utils";
import { MappingDeleteButton } from "./MappingDeleteButton";
import { MappingTester } from "./MappingTester";
import { createMapping, updateMapping, toggleMappingActive } from "./actions";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";

import "../../daylight.css";

export const dynamic = "force-dynamic";

function safeParse(s: string | null): Record<string, unknown> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
const pretty = (s: string | null) => {
  const o = safeParse(s);
  return Object.keys(o).length ? JSON.stringify(o, null, 2) : "";
};

export default async function MappingsAdminPage() {
  const ar = getLocale() === "ar";
  // Standard (app) gate (mirrors /admin/imports & /admin/products).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const mappings = await prisma.tenantImportMapping.findMany({
    orderBy: [{ tenantId: "asc" }, { createdAt: "desc" }],
  });

  const activeCount = mappings.filter((m) => m.active).length;
  const tenants = new Set(mappings.map((m) => m.tenantId));
  const systems = new Set(mappings.map((m) => m.sourceSystem));

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "تكامل" : "Integrations"}
        title={ar ? "خرائط الاستيراد" : "Import Mappings"}
        subtitle={
          ar
            ? "ترجمة أسماء أعمدة المصدر إلى الحقول القانونية — تُطبَّق قبل التحقق"
            : "Translate source column names to canonical fields — applied before validation"
        }
      />

      <AdminFamilyNav current="/admin/mappings" ar={ar} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "خرائط" : "Mappings"} value={formatNumber(mappings.length)} />
        <DaylightKpi label={ar ? "نشطة" : "Active"} value={formatNumber(activeCount)} />
        <DaylightKpi label={ar ? "مستأجرون" : "Tenants"} value={formatNumber(tenants.size)} />
        <DaylightKpi label={ar ? "أنظمة مصدر" : "Source systems"} value={formatNumber(systems.size)} />
      </DaylightKpiGrid>

      {/* Create */}
      <details className="panel reveal overflow-hidden">
        <summary
          className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold"
          style={{ listStyle: "none", color: "var(--brand-deep)" }}
        >
          <Plus className="h-4 w-4" />
          {ar ? "خريطة جديدة" : "New mapping"}
        </summary>
        <form
          action={createMapping}
          className="flex flex-col gap-3 px-4 pb-4"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <div className="grid gap-3 pt-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-bold">
              {ar ? "المستأجر *" : "tenantId *"}
              <input name="tenantId" required className="input" placeholder="hourani-hotels" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              {ar ? "نظام المصدر *" : "sourceSystem *"}
              <input name="sourceSystem" required className="input" placeholder="maha-erp" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              {ar ? "الوصف" : "description"}
              <input name="description" className="input" placeholder={ar ? "تصدير مخزون المها" : "Maha stock export"} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-bold">
            {ar ? "خريطة الحقول JSON { حقلهم: حقلنا }" : "fieldMap JSON { theirField: ourField }"}
            <textarea
              name="fieldMapJson"
              rows={4}
              className="input font-mono text-xs"
              defaultValue={'{\n  "Item Code": "sku",\n  "Stock Level": "quantity"\n}'}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            {ar ? "الافتراضيات JSON (اختياري)" : "defaults JSON (optional)"}
            <textarea
              name="defaultsJson"
              rows={2}
              className="input font-mono text-xs"
              placeholder='{ "warehouse": "Amman-A" }'
            />
          </label>
          <div>
            <button type="submit" className="btn-primary btn-sm">
              {ar ? "إنشاء" : "Create"}
            </button>
          </div>
        </form>
      </details>

      {mappings.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <ListChecks className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {ar ? "لا توجد خرائط بعد" : "No mappings yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {ar
              ? "أنشئ خريطة لترجمة أعمدة مصدر مستأجر إلى الحقول القانونية."
              : "Create one to translate a tenant's source columns to canonical fields."}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {mappings.map((m, i) => {
            const fieldMap = safeParse(m.fieldMapJson);
            const defaults = safeParse(m.defaultsJson);
            const fieldCount = Object.keys(fieldMap).length;
            const defCount = Object.keys(defaults).length;
            const showTenantHeader =
              i === 0 || mappings[i - 1].tenantId !== m.tenantId;
            return (
              <div key={m.id}>
                {showTenantHeader ? (
                  <div
                    className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {ar ? "المستأجر" : "Tenant"}: {m.tenantId}
                  </div>
                ) : null}
                <details className="panel reveal overflow-hidden">
                  <summary
                    className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                    style={{ listStyle: "none" }}
                  >
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "var(--ink-muted)" }}
                      aria-hidden
                    />
                    <span
                      className="font-mono text-sm font-extrabold"
                      style={{ color: "var(--ink)" }}
                    >
                      {m.sourceSystem}
                    </span>
                    {m.description ? (
                      <span className="truncate text-sm" style={{ color: "var(--ink)" }}>
                        {m.description}
                      </span>
                    ) : null}
                    <span className="ms-auto flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="badge-blue">
                        {formatNumber(fieldCount)} {ar ? "حقل" : "fields"}
                      </span>
                      {defCount ? (
                        <span className="badge-slate">
                          {formatNumber(defCount)} {ar ? "افتراضي" : "defaults"}
                        </span>
                      ) : null}
                      <span className={m.active ? "badge-emerald" : "badge-slate"}>
                        {m.active ? (ar ? "نشطة" : "Active") : ar ? "معطّلة" : "Inactive"}
                      </span>
                      <span className="font-mono" style={{ color: "var(--ink-muted)" }}>
                        {formatDateTime(m.updatedAt, ar ? "ar" : "en")}
                      </span>
                    </span>
                  </summary>

                  <div
                    className="flex flex-col gap-4 px-4 py-4"
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    {/* fieldMap table */}
                    
                      <table className="dl-table">
                        <thead>
                          <tr style={{ color: "var(--ink-muted)" }}>
                            <th className="px-3 py-2 text-start font-bold">
                              {ar ? "حقلهم" : "Their field"}
                            </th>
                            <th className="px-3 py-2 text-start font-bold">→</th>
                            <th className="px-3 py-2 text-start font-bold">
                              {ar ? "حقلنا" : "Our field"}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(fieldMap).map(([k, v]) => (
                            <tr key={k} style={{ borderTop: "1px solid var(--line)" }}>
                              <td className="px-3 py-2 font-mono" style={{ color: "var(--ink)" }}>{k}</td>
                              <td className="px-3 py-2" style={{ color: "var(--ink-muted)" }}>→</td>
                              <td className="px-3 py-2 font-mono" style={{ color: "var(--brand-deep)" }}>{String(v)}</td>
                            </tr>
                          ))}
                          {Object.entries(defaults).map(([k, v]) => (
                            <tr key={`d-${k}`} style={{ borderTop: "1px solid var(--line)" }}>
                              <td className="px-3 py-2 text-[10px] font-bold uppercase" style={{ color: "var(--ink-muted)" }}>
                                {ar ? "افتراضي" : "default"}
                              </td>
                              <td className="px-3 py-2" style={{ color: "var(--ink-muted)" }}>→</td>
                              <td className="px-3 py-2 font-mono" style={{ color: "var(--ink)" }}>
                                {k} = {String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    {/* Test mapping preview (pure, client-side) */}
                    <MappingTester
                      fieldMapJson={m.fieldMapJson}
                      defaultsJson={m.defaultsJson}
                      ar={ar}
                    />

                    {/* Edit + toggle + delete */}
                    <form
                      action={updateMapping}
                      className="flex flex-col gap-3"
                      style={{ borderTop: "1px solid var(--line)", paddingTop: "0.75rem" }}
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <label className="flex flex-col gap-1 text-xs font-bold">
                        {ar ? "الوصف" : "description"}
                        <input name="description" defaultValue={m.description ?? ""} className="input" />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold">
                        {ar ? "خريطة الحقول JSON" : "fieldMap JSON"}
                        <textarea name="fieldMapJson" rows={5} className="input font-mono text-xs" defaultValue={pretty(m.fieldMapJson)} />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-bold">
                        {ar ? "الافتراضيات JSON" : "defaults JSON"}
                        <textarea name="defaultsJson" rows={2} className="input font-mono text-xs" defaultValue={pretty(m.defaultsJson)} />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="submit" className="btn-primary btn-sm">
                          {ar ? "حفظ" : "Save"}
                        </button>
                      </div>
                    </form>

                    <div
                      className="flex flex-wrap items-center gap-2"
                      style={{ borderTop: "1px solid var(--line)", paddingTop: "0.75rem" }}
                    >
                      <form action={toggleMappingActive}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className={m.active ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
                        >
                          {m.active
                            ? ar ? "تعطيل" : "Deactivate"
                            : ar ? "تفعيل" : "Activate"}
                        </button>
                      </form>
                      <MappingDeleteButton
                        id={m.id}
                        label={`${m.tenantId} / ${m.sourceSystem}`}
                        ar={ar}
                      />
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </section>
      )}
    </DaylightShell>
  );
}
