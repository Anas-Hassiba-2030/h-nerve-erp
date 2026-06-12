// /admin/tenants — list every tenant in the federation.
//
// Sleek Operator (DESIGN-SKILL §1.F). Phase 11 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { prisma } from "@/lib/db/db";
import { Plus, Globe2, Eye } from "lucide-react";
import { THEME_PRESETS, type ThemeKey } from "@/lib/brand/themes";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";

const STATUS_COLOR: Record<string, string> = {
  PROVISIONING: "var(--admin-amber)",
  ACTIVE:       "var(--admin-cyan)",
  SUSPENDED:    "var(--admin-rose)",
  ARCHIVED:     "var(--admin-mute)",
};

export default async function TenantsIndex() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const m = await getMessages(locale);

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      theme: true,
      _count: { select: { packs: true } },
    },
    take: 200,
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === "ACTIVE").length,
    provisioning: tenants.filter((t) => t.status === "PROVISIONING").length,
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.tenants"]}</span>
          <h1 className="admin-h1">{ar ? "جميع المستأجرين" : "All tenants"}</h1>
          <p className="admin-sub">
            {ar
              ? "كل مؤسسة تعمل على H-Nerve. لكل منها نطاقها الفرعي وسمتها ومجموعة حزمها الخاصة."
              : "Every organization running on H-Nerve. Each one gets its own subdomain, theme, and pack set."}
          </p>
        </div>
        <Link href="/admin/tenants/new" className="admin-cta-primary">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "مستأجر جديد" : "New tenant"}
        </Link>
      </header>

      <section className="admin-stats">
        <Stat label="TOTAL"          value={stats.total} />
        <Stat label="ACTIVE"         value={stats.active}        accent="cyan" />
        <Stat label="PROVISIONING"   value={stats.provisioning}  accent="amber" />
      </section>

      {tenants.length === 0 ? (
        <div className="admin-empty">
          <p>{ar ? "لا يوجد مستأجرون بعد." : "No tenants yet."}</p>
          <Link href="/admin/tenants/new" className="admin-cta-primary">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "أنشئ أول مستأجر" : "Create your first tenant"}
          </Link>
        </div>
      ) : (
        <div className="admin-grid">
          {tenants.map((t) => {
            const presetKey = (t.theme?.preset as ThemeKey) ?? "heritage";
            const preset = THEME_PRESETS[presetKey];
            return (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="admin-tenant-card"
              >
                <div
                  className="admin-tenant-card-band"
                  style={{
                    background: preset.swatches[1] ?? "#0a0a0a",
                    color: preset.swatches[0] ?? "#fff",
                  }}
                >
                  <span className="admin-tenant-emblem">{t.theme?.emblem ?? "◆"}</span>
                  <div className="admin-tenant-band-meta">
                    <span className="admin-tenant-name">{t.name}</span>
                    <span className="admin-tenant-slug">{t.slug}.h-nerve.io</span>
                  </div>
                </div>
                <div className="admin-tenant-card-body">
                  <div className="admin-tenant-row">
                    <span className="admin-tenant-row-label">{ar ? "الحالة" : "Status"}</span>
                    <span
                      className="admin-tenant-status"
                      style={{ color: STATUS_COLOR[t.status] }}
                    >
                      <span
                        className="admin-tenant-status-dot"
                        style={{ background: STATUS_COLOR[t.status] }}
                      />
                      {t.status}
                    </span>
                  </div>
                  <div className="admin-tenant-row">
                    <span className="admin-tenant-row-label">{ar ? "السمة" : "Theme"}</span>
                    <span className="admin-tenant-row-value">{preset.nameEn}</span>
                  </div>
                  <div className="admin-tenant-row">
                    <span className="admin-tenant-row-label">{ar ? "الحزم" : "Packs"}</span>
                    <span className="admin-tenant-row-value">{t._count.packs}</span>
                  </div>
                  <div className="admin-tenant-row">
                    <span className="admin-tenant-row-label">{ar ? "المنطقة" : "Region"}</span>
                    <span className="admin-tenant-row-value">{t.region}</span>
                  </div>
                  <div className="admin-tenant-card-foot">
                    <span className="admin-tenant-card-swatches">
                      {preset.swatches.map((c, i) => (
                        <span
                          key={i}
                          className="admin-tenant-card-swatch"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    {t.status === "ACTIVE" ? (
                      <span className="admin-tenant-view">
                        <Eye className="h-3 w-3" strokeWidth={1.5} />
                        {ar ? "عرض بوصفه" : "View as"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "cyan" | "amber" }) {
  return (
    <div className="admin-stat-tile">
      <span className="admin-stat-label">{label}</span>
      <span
        className="admin-stat-value"
        data-accent={accent ?? "neutral"}
      >
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}
