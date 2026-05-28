
export const dynamic = "force-dynamic";
// /integrations — Heritage Modern marketplace grid.
//
// 24 provider cards across 6 categories. Each tile flips on Y-axis when
// connected. Filter by category. Search by name.
//
// Phase 13 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { ChevronLeft, Plug, Search } from "lucide-react";
import {
  PROVIDERS,
  CATEGORIES,
  FUNCTIONAL_STATE_LABEL,
  type IntegrationCategory,
} from "@/lib/integrations/catalog";
import { connect, connectAndOpen } from "./actions";

const STATUS_TONE: Record<string, "success" | "warn" | "critical" | "neutral"> = {
  CONNECTED:     "success",
  ERROR:         "critical",
  EXPIRED:       "warn",
  NOT_CONNECTED: "neutral",
};
const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  CONNECTED:     { ar: "متّصل",       en: "Connected"     },
  ERROR:         { ar: "خطأ",         en: "Error"         },
  EXPIRED:       { ar: "منتهي",       en: "Expired"       },
  NOT_CONNECTED: { ar: "غير متّصل",   en: "Not connected" },
};

export default async function IntegrationsHubPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const filterCat = (searchParams.category ?? "") as IntegrationCategory | "";

  const integrations = await prisma.integration.findMany({});
  const byProvider = new Map(integrations.map((i) => [i.providerKey, i]));

  const visible = filterCat
    ? PROVIDERS.filter((p) => p.category === filterCat)
    : PROVIDERS;

  const total = PROVIDERS.length;
  const connected = integrations.filter((i) => i.status === "CONNECTED").length;
  const errored = integrations.filter((i) => i.status === "ERROR").length;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "موصلات · سوق التكاملات" : "Connectors · Integrations hub"}
        title={ar ? "كل التكاملات في مكان واحد" : "Every connector in one marketplace"}
        subtitle={
          ar
            ? "٢٤ موصلاً · ٢ منها قابل للربط اليوم بمفتاح API (SendGrid · Resend) · مجموعة OAuth الكاملة تتوسّع حسب الأولوية."
            : "24 connectors · 2 connectable today via API key (SendGrid · Resend) · full OAuth suite rolling out per priority."
        }
      />

      <PageContainer>
        {/* Stat row */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={ar ? "إجمالي" : "Total"}              value={total} />
          <Stat label={ar ? "متّصل" : "Connected"}            value={connected} accent="teal" />
          <Stat label={ar ? "أخطاء" : "Errored"}              value={errored}   accent="terracotta" />
          <Stat label={ar ? "تصنيفات" : "Categories"}         value={6} />
        </section>

        {/* Filter rail */}
        <div
          className="flex flex-wrap items-center gap-1.5 px-1 py-3"
          style={{
            borderTop: "1px solid var(--heri-rule)",
            borderBottom: "1px solid var(--heri-rule)",
          }}
        >
          <span className="heri-eyebrow me-2">{ar ? "تصفية" : "Filter"}</span>
          <FilterChip
            href="/integrations"
            active={!filterCat}
            label={ar ? "الكل" : "All"}
            count={total}
          />
          {(Object.keys(CATEGORIES) as IntegrationCategory[]).map((c) => {
            const meta = CATEGORIES[c];
            const count = PROVIDERS.filter((p) => p.category === c).length;
            return (
              <FilterChip
                key={c}
                href={`/integrations?category=${c}`}
                active={filterCat === c}
                label={ar ? meta.ar : meta.en}
                count={count}
              />
            );
          })}
        </div>

        {/* Grid */}
        <div
          className="grid gap-3 heri-stagger"
          style={{
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
          }}
        >
          {visible.map((provider) => {
            const integration = byProvider.get(provider.key);
            const status = (integration?.status ?? "NOT_CONNECTED") as keyof typeof STATUS_TONE;
            const isConnected = status === "CONNECTED";
            const statusLabel = ar
              ? STATUS_LABEL[status]?.ar
              : STATUS_LABEL[status]?.en;
            const tone = STATUS_TONE[status] ?? "neutral";
            const cat = CATEGORIES[provider.category];
            const lastUsed = integration?.lastUsedAt;

            return (
              <article
                key={provider.key}
                className="integration-card"
                data-status={status}
              >
                <div className="integration-card-flip">
                  {/* Front face — not connected (or transient state) */}
                  <div className="integration-card-face integration-card-face-front">
                    <header className="integration-card-band" style={{ background: provider.brandColor }}>
                      <span className="integration-card-glyph">{provider.glyph}</span>
                      <span className="integration-card-cat">
                        {ar ? cat.ar : cat.en.toUpperCase()}
                      </span>
                    </header>
                    <div className="integration-card-body">
                      <h3 className="integration-card-name">
                        {ar ? provider.nameAr : provider.name}
                      </h3>
                      <p className="integration-card-desc">
                        {ar ? provider.descriptionAr : provider.description}
                      </p>
                      {/* Phase V3-NEW-7 — buildout-state badge above the
                          connection-state pill. Honest about which
                          connectors are actually wireable today. */}
                      {(() => {
                        const fs = FUNCTIONAL_STATE_LABEL[provider.functionalState];
                        return (
                          <div style={{ marginBottom: 6 }}>
                            <HeritagePill tone={fs.tone}>
                              {ar ? fs.ar : fs.en}
                            </HeritagePill>
                          </div>
                        );
                      })()}
                      <div className="integration-card-footrow">
                        <HeritagePill tone={tone}>{statusLabel}</HeritagePill>
                        {!isConnected ? (
                          provider.functionalState === "READY_FOR_SETUP" || provider.functionalState === "LIVE" ? (
                            <form action={connectAndOpen} className="integration-connect-form">
                              <input type="hidden" name="providerKey" value={provider.key} />
                              <button type="submit" className="integration-connect-btn">
                                <Plug className="h-3.5 w-3.5" strokeWidth={1.5} />
                                {ar ? "اتصل" : "Connect"}
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="integration-connect-btn"
                              title={ar
                                ? "إعداد هذا الموصل يأتي في الإصدار القادم"
                                : "Connector setup coming in next release"}
                              style={{ opacity: 0.45, cursor: "not-allowed" }}
                            >
                              <Plug className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {ar ? "قريباً" : "Soon"}
                            </button>
                          )
                        ) : (
                          <Link
                            href={`/integrations/${provider.key}`}
                            className="integration-connect-btn integration-connect-btn-ghost"
                          >
                            {ar ? "إدارة" : "Manage"}
                            <ChevronLeft
                              className="h-3 w-3 rtl:rotate-180"
                              style={{ transform: ar ? undefined : "scaleX(-1)" }}
                              strokeWidth={1.5}
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Back face — connected state */}
                  <div className="integration-card-face integration-card-face-back">
                    <header
                      className="integration-card-band integration-card-band-back"
                      style={{ background: provider.brandColor }}
                    >
                      <span className="integration-card-glyph">{provider.glyph}</span>
                      <span className="integration-card-cat">
                        {ar ? "متّصل" : "CONNECTED"}
                      </span>
                    </header>
                    <div className="integration-card-body">
                      <h3 className="integration-card-name">
                        {ar ? provider.nameAr : provider.name}
                      </h3>
                      {integration?.account ? (
                        <div className="integration-card-account">
                          <span className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 9.5 }}>
                            {ar ? "الحساب" : "ACCOUNT"}
                          </span>
                          <span className="integration-card-account-value">
                            {integration.account}
                          </span>
                        </div>
                      ) : null}
                      <div className="integration-card-meta">
                        <span>
                          {provider.scopes.length} {ar ? "صلاحيات" : "scopes"}
                        </span>
                        {lastUsed ? (
                          <>
                            <span className="integration-card-meta-sep">·</span>
                            <span>
                              {ar ? "آخر استخدام" : "last used"}{" "}
                              {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(lastUsed)}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div className="integration-card-footrow">
                        <Link
                          href={`/integrations/${provider.key}`}
                          className="integration-connect-btn integration-connect-btn-ghost"
                        >
                          {ar ? "إدارة" : "Manage"}
                          <ChevronLeft
                            className="h-3 w-3 rtl:rotate-180"
                            style={{ transform: ar ? undefined : "scaleX(-1)" }}
                            strokeWidth={1.5}
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </PageContainer>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="heri-focusable inline-flex items-center gap-2 px-3 py-1.5 transition"
      style={{
        background: active ? "var(--heri-ink)" : "var(--heri-cream)",
        border: active ? "1px solid var(--heri-ink)" : "1px solid var(--heri-rule-strong)",
        color: active ? "var(--heri-cream)" : "var(--heri-ink)",
        fontSize: 12,
        fontWeight: 500,
        textDecoration: "none",
      }}
    >
      {label}
      <span
        style={{
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
          opacity: 0.7,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "teal" | "terracotta";
}) {
  const color =
    accent === "teal" ? "var(--heri-teal)"
    : accent === "terracotta" ? "var(--heri-terracotta)"
    : "var(--heri-ink)";
  return (
    <div
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "12px 16px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className="heri-number mt-1.5"
        style={{ fontSize: 26, fontWeight: 500, color, letterSpacing: "-0.018em" }}
      >
        {value}
      </div>
    </div>
  );
}
