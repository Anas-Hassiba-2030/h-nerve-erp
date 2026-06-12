// /admin/tenants/new — three-field form to spawn a new tenant.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md. Sleek Operator aesthetic.

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { THEME_PRESETS, PACK_CATALOG } from "@/lib/brand/themes";
import { createTenant } from "../actions";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";

export default async function NewTenantPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const m = await getMessages(locale);

  return (
    <div className="admin-page admin-page-narrow">
      <Link href="/admin/tenants" className="admin-back">
        <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
        {ar ? "جميع المستأجرين" : "ALL TENANTS"}
      </Link>

      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.newTenant"]}</span>
          <h1 className="admin-h1">{ar ? "تشغيل مستأجر جديد" : "Spin up a tenant"}</h1>
          <p className="admin-sub">
            {ar
              ? "ثلاثة حقول، نقرة واحدة. النطاق الفرعي والسمة والحزم — كل شيء يُجهَّز في أقل من خمس ثوانٍ."
              : "Three fields, one click. Subdomain, theme, packs — everything provisions in under five seconds."}
          </p>
        </div>
      </header>

      <form action={createTenant} className="admin-form">
        {/* Name + slug */}
        <fieldset className="admin-fieldset">
          <legend className="admin-fieldset-legend">
            {ar ? "٠١ · الهوية" : "01 · Identity"}
          </legend>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span className="admin-label">{ar ? "اسم المستأجر" : "Tenant name"}</span>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Acme Holdings"
                className="admin-input"
              />
              <span className="admin-hint">
                {ar ? "الاسم المعروض في واجهة المشغّل." : "Display name shown in the operator UI."}
              </span>
            </label>
            <label className="admin-field">
              <span className="admin-label">{ar ? "النطاق الفرعي" : "Subdomain"}</span>
              <div className="admin-input-group">
                <input
                  type="text"
                  name="slug"
                  required
                  minLength={2}
                  maxLength={32}
                  pattern="[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?"
                  placeholder="acme"
                  className="admin-input admin-input-slug"
                />
                <span className="admin-input-suffix">.h-nerve.io</span>
              </div>
              <span className="admin-hint">
                {ar
                  ? "أحرف صغيرة وأرقام وشرطات. من 2 إلى 32 حرفاً."
                  : "Lowercase letters, digits, dashes. 2–32 chars."}
              </span>
            </label>
          </div>
          <label className="admin-field">
            <span className="admin-label">{ar ? "البريد الإلكتروني للمدير" : "Admin email"}</span>
            <input
              type="email"
              name="adminEmail"
              required
              placeholder="ceo@acme.com"
              className="admin-input"
            />
            <span className="admin-hint">
              {ar
                ? "المدير العام الأول. يتلقى دعوة الترحيب."
                : "First superadmin. Receives the welcome invite."}
            </span>
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "المنطقة" : "Region"}</span>
            <select name="region" defaultValue="MENA" className="admin-input">
              <option value="MENA">MENA</option>
              <option value="EU">{ar ? "أوروبا" : "Europe"}</option>
              <option value="NA">{ar ? "أمريكا الشمالية" : "North America"}</option>
              <option value="APAC">APAC</option>
              <option value="AFR">{ar ? "أفريقيا" : "Africa"}</option>
            </select>
          </label>
        </fieldset>

        {/* Theme */}
        <fieldset className="admin-fieldset">
          <legend className="admin-fieldset-legend">
            {ar ? "٠٢ · إعداد السمة" : "02 · Theme preset"}
          </legend>
          <div className="admin-themes">
            {Object.values(THEME_PRESETS).map((preset, i) => (
              <label key={preset.key} className="admin-theme-card">
                <input
                  type="radio"
                  name="theme"
                  value={preset.key}
                  defaultChecked={i === 0}
                  className="admin-theme-radio"
                />
                <div className="admin-theme-content">
                  <span className="admin-theme-emblem">{preset.emblem}</span>
                  <div className="admin-theme-text">
                    <span className="admin-theme-name">{preset.nameEn}</span>
                    <span className="admin-theme-desc">{preset.description}</span>
                  </div>
                  <div className="admin-theme-swatches">
                    {preset.swatches.map((c, idx) => (
                      <span
                        key={idx}
                        className="admin-theme-swatch"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Packs */}
        <fieldset className="admin-fieldset">
          <legend className="admin-fieldset-legend">
            {ar ? "٠٣ · الحزم الصناعية" : "03 · Industry packs"}
          </legend>
          <p className="admin-fieldset-hint">
            {ar
              ? "اختر القطاعات لتهيئتها. العقل لا يُحمِّل إلا الوكلاء الخاصين بالحزم التي تُفعِّلها."
              : "Pick which verticals to seed. The brain only loads agents for the packs you enable."}
          </p>
          <div className="admin-packs">
            {PACK_CATALOG.map((p) => (
              <label key={p.key} className="admin-pack-card">
                <input
                  type="checkbox"
                  name="packs"
                  value={p.key}
                  defaultChecked
                  className="admin-pack-check"
                />
                <span className="admin-pack-name">{p.nameEn}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="admin-form-foot">
          <Link href="/admin/tenants" className="admin-btn-ghost">
            {ar ? "إلغاء" : "Cancel"}
          </Link>
          <button type="submit" className="admin-cta-primary">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "تجهيز المستأجر" : "Provision tenant"}
          </button>
        </div>
      </form>
    </div>
  );
}
