// /admin/tenants/[id]/modules — the Daftra-style plugin manager.
//
// One department card per group, one row per module, a toggle. The write
// path is toggleTenantModule() in ../../actions.ts, which enforces the
// catalog's `requires` edges server-side in both directions — this page
// never trusts a submitted toggle on its own. docs/SYSTEM-BLUEPRINT.md §9.

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { toggleTenantModule } from "../../actions";
import {
  MODULE_CATALOG,
  MODULE_DEPARTMENT_ORDER,
  MODULE_DEPARTMENT_LABELS,
  MODULES_BY_DEPARTMENT,
  isModuleKey,
} from "@/lib/tenancy/moduleCatalog";
import { getLocale } from "@/lib/i18n/i18n.server";

export default async function TenantModulesPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const locale = await getLocale();
  const ar = locale === "ar";

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { packs: true },
  });
  if (!tenant) notFound();

  const enabledSet = new Set(
    tenant.packs.filter((p) => p.enabled).map((p) => p.packKey).filter(isModuleKey),
  );
  const enabledCount = enabledSet.size;

  return (
    <div className="admin-page admin-page-narrow">
      <Link href={`/admin/tenants/${tenant.id}`} className="admin-back">
        <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
        {tenant.name}
      </Link>

      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">
            {ar ? "مدير الوحدات" : "MODULE MANAGER"}
          </span>
          <h1 className="admin-h1">
            {ar ? `${enabledCount} وحدة مُفعَّلة` : `${enabledCount} modules enabled`}
          </h1>
          <p className="admin-sub">
            {ar
              ? "فعّل ما يحتاجه هذا المستأجر فقط. الوحدات المرتبطة تُفعَّل بالترتيب — لا يمكن تفعيل وحدة قبل ما تعتمد عليه."
              : "Turn on only what this tenant needs. Dependent modules enforce order — you can't enable one before what it requires."}
          </p>
        </div>
      </header>

      {MODULE_DEPARTMENT_ORDER.map((dept) => {
        const label = MODULE_DEPARTMENT_LABELS[dept];
        const modules = MODULES_BY_DEPARTMENT[dept];
        return (
          <section key={dept} className="admin-section">
            <header className="admin-section-head">
              <h2 className="admin-h2">{ar ? label.ar : label.en}</h2>
            </header>
            <div className="admin-module-list">
              {modules.map((def) => {
                const on = enabledSet.has(def.key);
                return (
                  <div key={def.key} className="admin-module-row">
                    <div className="admin-module-text">
                      <span className="admin-module-name">
                        {ar ? def.labelAr : def.labelEn}
                      </span>
                      {def.requires.length > 0 ? (
                        <span className="admin-module-requires">
                          {ar ? "يتطلب: " : "requires: "}
                          {def.requires
                            .map((r) => (ar ? MODULE_CATALOG[r].labelAr : MODULE_CATALOG[r].labelEn))
                            .join(", ")}
                        </span>
                      ) : null}
                    </div>
                    <form action={toggleTenantModule}>
                      <input type="hidden" name="tenantId" value={tenant.id} />
                      <input type="hidden" name="moduleKey" value={def.key} />
                      <input type="hidden" name="enabled" value={on ? "false" : "true"} />
                      <button
                        type="submit"
                        className="admin-module-toggle"
                        data-on={on ? "true" : "false"}
                        aria-pressed={on}
                        aria-label={
                          on
                            ? (ar ? `تعطيل ${def.labelAr}` : `Disable ${def.labelEn}`)
                            : (ar ? `تفعيل ${def.labelAr}` : `Enable ${def.labelEn}`)
                        }
                      />
                    </form>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
