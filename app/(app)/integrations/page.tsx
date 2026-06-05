
export const dynamic = "force-dynamic";
// /integrations — التكاملات.
//
// Aesthetic: the "Claude Design" work register, ported verbatim (structure +
// look) from docs/design/system/sections/integrations.html (which links
// _section.css + ops.css) + integrations-ops.js. The .wrap / .sec-* / .co-tile
// / .ops-tag / .ops-export / .ops-add markup is reproduced 1:1; the styles live
// in ./integrations.css scoped under .dl-page. Real Integration + PROVIDERS
// data is mapped into the same slots the reference uses (connector tiles with
// usage / errors / last-activity, connect / disconnect controls).
//
// Server Component: every control maps to an existing server action via a plain
// <form action={...}>, so no client runtime is required.

import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { PROVIDERS } from "@/lib/integrations/catalog";
import { connect, connectAndOpen, disconnect } from "./actions";
import "../daylight.css";
import "./integrations.css";

// Match the reference ar() helper in integrations-ops.js: Western -> Arabic-Indic.
function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
function num(n: number, ar: boolean): string {
  return ar ? toArabicDigits(n) : String(n);
}

function relLabel(d: Date | null, ar: boolean): string {
  if (!d) return "—";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return ar ? "الآن" : "now";
  if (diff < 3600) return ar ? `قبل ${toArabicDigits(Math.floor(diff / 60))} د` : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return ar ? `قبل ${toArabicDigits(Math.floor(diff / 3600))} س` : `${Math.floor(diff / 3600)}h ago`;
  return ar ? `قبل ${toArabicDigits(Math.floor(diff / 86400))} ي` : `${Math.floor(diff / 86400)}d ago`;
}

export default async function IntegrationsHubPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const integrations = await prisma.integration.findMany({
    include: { _count: { select: { logs: true } } },
    take: 100,
  });
  const byProvider = new Map(integrations.map((i) => [i.providerKey, i]));

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="sec-eyebrow">
              <span className="tick" />
              {ar ? "النظام · التكاملات" : "System · Integrations"}
            </div>
            <h1 className="sec-title">{ar ? "التكاملات" : "Integrations"}</h1>
            <p className="sec-sub">
              {ar
                ? "اربط الأنظمة الخارجية — مفاتيح API، الاستخدام، والأخطاء لكل موصّل."
                : "Connect external systems — API keys, usage, and errors per connector."}
            </p>
          </div>
          <div className="sec-head-aside">
            <span className="sec-status">
              <span className="dot" />
              {ar ? "مباشر" : "Live"}
            </span>
          </div>
        </div>

        <div className="connectors">
          {PROVIDERS.map((provider) => {
            const integration = byProvider.get(provider.key);
            const on = integration?.status === "CONNECTED";
            const usage = integration?._count.logs ?? 0;
            const errors = integration?.errorCount ?? 0;
            const last = integration?.lastUsedAt ?? null;

            return (
              <div key={provider.key} className="co-tile" style={{ cursor: "default" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="co-logo" style={{ background: "rgba(194,163,90,.16)", color: "var(--gold)" }}>
                    {provider.glyph}
                  </div>
                  <span className={`ops-tag ${on ? "ok" : "info"}`}>
                    {on ? (ar ? "متصل" : "Connected") : ar ? "غير متصل" : "Not connected"}
                  </span>
                </div>
                <div className="co-nm" style={{ marginTop: 10 }}>
                  {ar ? provider.nameAr : provider.name}
                </div>
                <div className="co-meta">
                  <span>{ar ? "استخدام" : "usage"} {num(usage, ar)}</span>
                  <span style={{ color: errors ? "#9a5648" : "var(--ink-muted)" }}>
                    {ar ? "أخطاء" : "errors"} {num(errors, ar)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6 }}>
                  {ar ? "آخر نشاط: " : "Last activity: "}
                  {on ? relLabel(last, ar) : "—"}
                </div>
                {on ? (
                  <form action={disconnect} style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input type="hidden" name="providerKey" value={provider.key} />
                    <input
                      placeholder={ar ? "مفتاح API" : "API key"}
                      value="sk_live_••••"
                      readOnly
                      style={{
                        flex: 1,
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 9,
                        padding: "7px 10px",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 11,
                        outline: "none",
                      }}
                    />
                    <button type="submit" className="ops-export">{ar ? "فصل" : "Disconnect"}</button>
                  </form>
                ) : (
                  // API-key providers must go through their detail page so the
                  // key is actually validated (connectAndOpen routes them there
                  // and does NOT pre-mark CONNECTED). Plain `connect` would fake
                  // a CONNECTED state without ever checking a key. Other
                  // providers keep the direct connect.
                  <form
                    action={
                      provider.key === "sendgrid" || provider.key === "resend"
                        ? connectAndOpen
                        : connect
                    }
                  >
                    <input type="hidden" name="providerKey" value={provider.key} />
                    <button
                      type="submit"
                      className="ops-add"
                      style={{ width: "100%", marginTop: 10, justifyContent: "center", border: 0 }}
                    >
                      {ar ? "اتصل" : "Connect"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
