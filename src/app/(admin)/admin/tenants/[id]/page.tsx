// /admin/tenants/[id] — single tenant detail with View-as-tenant action.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/db";
import { ArrowLeft, Eye, Trash2, Copy, Calendar } from "lucide-react";
import { THEME_PRESETS, PACK_CATALOG, type ThemeKey } from "@/lib/brand/themes";
import { viewAsTenant, deleteTenant } from "../actions";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";

const STATUS_COLOR: Record<string, string> = {
  PROVISIONING: "var(--admin-amber)",
  ACTIVE:       "var(--admin-cyan)",
  SUSPENDED:    "var(--admin-rose)",
  ARCHIVED:     "var(--admin-mute)",
};

export default async function TenantDetail(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const m = await getMessages(locale);

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      theme: true,
      packs: true,
      steps: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!tenant) notFound();

  const presetKey = (tenant.theme?.preset as ThemeKey) ?? "heritage";
  const preset = THEME_PRESETS[presetKey];

  return (
    <div className="admin-page admin-page-narrow">
      <Link href="/admin/tenants" className="admin-back">
        <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
        {ar ? "جميع المستأجرين" : "ALL TENANTS"}
      </Link>

      {/* Hero card with theme preview band */}
      <section className="admin-hero">
        <div
          className="admin-hero-band"
          style={{
            background: preset.swatches[1] ?? "#0a0a0a",
            color: preset.swatches[0] ?? "#fff",
          }}
        >
          <span className="admin-hero-emblem">{tenant.theme?.emblem ?? "◆"}</span>
          <div>
            <span className="admin-hero-name">{tenant.name}</span>
            <span className="admin-hero-slug">{tenant.slug}.h-nerve.io</span>
          </div>
          <span
            className="admin-hero-status"
            style={{ color: STATUS_COLOR[tenant.status] }}
          >
            <span
              className="admin-tenant-status-dot"
              style={{ background: STATUS_COLOR[tenant.status] }}
            />
            {tenant.status}
          </span>
        </div>

        <div className="admin-hero-meta">
          <MetaCell label="THEME" value={preset.nameEn} />
          <MetaCell label="REGION" value={tenant.region} />
          <MetaCell label="TIER" value={tenant.tier.toUpperCase()} />
          <MetaCell label="ADMIN" value={tenant.adminEmail} mono />
          <MetaCell
            label="CREATED"
            value={new Intl.DateTimeFormat("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(tenant.createdAt)}
            mono
          />
          {tenant.activatedAt ? (
            <MetaCell
              label="ACTIVATED"
              value={new Intl.DateTimeFormat("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(tenant.activatedAt)}
              mono
            />
          ) : null}
        </div>
      </section>

      {/* Action rail */}
      <section className="admin-action-rail">
        {tenant.status === "ACTIVE" ? (
          <form action={viewAsTenant}>
            <input type="hidden" name="tenantId" value={tenant.id} />
            <button type="submit" className="admin-cta-primary">
              <Eye className="h-4 w-4" strokeWidth={1.5} />
              {ar ? `معاينة مساحة عمل ${tenant.name}` : `Preview ${tenant.name}'s workspace`}
            </button>
          </form>
        ) : (
          <Link
            href={`/admin/tenants/${tenant.id}/provisioning`}
            className="admin-cta-primary"
          >
            {ar ? "متابعة التجهيز" : "Resume provisioning"}
          </Link>
        )}
        {tenant.inviteToken ? (
          <span className="admin-invite-token">
            <Copy className="h-3 w-3" strokeWidth={1.5} />
            <span className="admin-invite-key">INVITE</span>
            <code>{tenant.inviteToken}</code>
          </span>
        ) : null}
        <div className="admin-action-spacer" />
        <form action={deleteTenant}>
          <input type="hidden" name="id" value={tenant.id} />
          <button
            type="submit"
            className="admin-btn-ghost"
            style={{ color: "var(--admin-rose)" }}
          >
            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            {ar ? "حذف المستأجر" : "Delete tenant"}
          </button>
        </form>
      </section>

      {/* Theme preview */}
      <section className="admin-section">
        <header className="admin-section-head">
          <span className="admin-eyebrow">{m["admin.eyebrow.theme"]}</span>
          <h2 className="admin-h2">{ar ? preset.nameAr : preset.nameEn}</h2>
          <p className="admin-section-sub">{preset.description}</p>
        </header>
        <div className="admin-theme-preview">
          <div className="admin-theme-preview-swatches">
            {preset.swatches.map((c, i) => (
              <span
                key={i}
                className="admin-theme-preview-chip"
                style={{ background: c }}
                title={c}
              >
                <span className="admin-theme-preview-hex">{c.toUpperCase()}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Packs */}
      <section className="admin-section">
        <header className="admin-section-head">
          <span className="admin-eyebrow">{m["admin.eyebrow.industryPacks"]}</span>
          <h2 className="admin-h2">
            {ar
              ? `${tenant.packs.length} ${tenant.packs.length === 1 ? "حزمة مُفعَّلة" : "حزم مُفعَّلة"}`
              : `${tenant.packs.length} pack${tenant.packs.length === 1 ? "" : "s"} enabled`}
          </h2>
        </header>
        <div className="admin-pack-grid">
          {PACK_CATALOG.map((p) => {
            const enabled = tenant.packs.some((pk) => pk.packKey === p.key);
            return (
              <div
                key={p.key}
                className="admin-pack-tile"
                data-enabled={enabled ? "true" : "false"}
              >
                <span className="admin-pack-key">{ar ? p.nameAr : p.nameEn}</span>
                <span className="admin-pack-state">
                  {enabled ? "ENABLED" : "OFF"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Provisioning trail */}
      <section className="admin-section">
        <header className="admin-section-head">
          <span className="admin-eyebrow">{m["admin.eyebrow.provisioningTrail"]}</span>
          <h2 className="admin-h2">
            {ar ? `${tenant.steps.length} خطوات مُسجَّلة` : `${tenant.steps.length} steps recorded`}
          </h2>
        </header>
        <ol className="admin-trail">
          {tenant.steps.map((s, i) => (
            <li key={s.id} className="admin-trail-row">
              <span className="admin-trail-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="admin-trail-label">{ar ? s.labelAr : s.labelEn}</span>
              <span className="admin-trail-meta">
                {s.status === "DONE" && s.durationMs != null
                  ? `${s.durationMs}ms`
                  : s.status}
              </span>
              <span
                className="admin-trail-time"
                style={{ display: s.completedAt ? "inline" : "none" }}
              >
                <Calendar className="h-3 w-3" strokeWidth={1.5} />
                {s.completedAt
                  ? new Intl.DateTimeFormat("en-US", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(s.completedAt)
                  : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="admin-meta-cell">
      <span className="admin-meta-label">{label}</span>
      <span className="admin-meta-value" data-mono={mono ? "true" : "false"}>
        {value}
      </span>
    </div>
  );
}
