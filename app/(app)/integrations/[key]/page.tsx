// /integrations/[key] — single integration detail.
//
// Heritage Modern. Connect / disconnect, scope list, settings form,
// recent log. Phase 13 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import "../../daylight.css";
import { ArrowLeft, Plug, Power, Save, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getProvider, CATEGORIES } from "@/lib/integrations/catalog";
import { connect, disconnect, saveSettings, connectWithApiKey } from "../actions";

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

export default async function IntegrationDetail({
  params,
}: {
  params: { key: string };
}) {
  const provider = getProvider(params.key);
  if (!provider) notFound();

  const locale = getLocale();
  const ar = locale === "ar";

  const [integration, logs] = await Promise.all([
    prisma.integration.findUnique({
      where: { scope_providerKey: { scope: "default", providerKey: provider.key } },
    }),
    prisma.integration.findUnique({
      where: { scope_providerKey: { scope: "default", providerKey: provider.key } },
      include: {
        logs: { orderBy: { ts: "desc" }, take: 12 },
      },
    }).then((i) => i?.logs ?? []),
  ]);

  const status = (integration?.status ?? "NOT_CONNECTED") as keyof typeof STATUS_TONE;
  const isConnected = status === "CONNECTED";
  const cat = CATEGORIES[provider.category];
  const settings: Record<string, any> = (() => {
    try { return JSON.parse(integration?.settingsJson ?? "{}"); } catch { return {}; }
  })();

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "موصلات · تكامل" : "Connectors · Integration"}
        title={ar ? provider.nameAr : provider.name}
        subtitle={ar ? provider.descriptionAr : provider.description}
      />
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/integrations"
            className="inline-flex items-center gap-2"
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--gold)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
            {ar ? "كل التكاملات" : "All integrations"}
          </Link>
          <span className="tag gold">{ar ? STATUS_LABEL[status].ar : STATUS_LABEL[status].en}</span>
        </div>

        {/* Hero */}
        <section
          className="grid items-center gap-6 md:grid-cols-[auto_1fr_auto]"
          style={{
            background: "var(--cream)",
            border: "1px solid var(--line)",
            padding: "24px 28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span
            aria-hidden
            className="absolute"
            style={{
              top: 0,
              insetInlineStart: 0,
              bottom: 0,
              width: 4,
              background: provider.brandColor,
            }}
          />
          <div
            className="ms-3 inline-flex h-16 w-16 items-center justify-center"
            style={{
              background: provider.brandColor,
              color: "#fff",
              fontSize: 32,
            }}
          >
            {provider.glyph}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
              {ar ? cat.ar : cat.en.toUpperCase()}
              {integration?.account ? (
                <>
                  <span style={{ color: "var(--line)", margin: "0 8px" }}>·</span>
                  <span>{integration.account}</span>
                </>
              ) : null}
            </div>
            <h2
              className={ar ? "mt-2" : "font-display-latin mt-2"}
              style={{
                fontSize: "clamp(22px, 2.4vw, 32px)",
                lineHeight: 1.15,
                letterSpacing: ar ? "-0.005em" : "-0.02em",
                fontWeight: ar ? 600 : 500,
                color: "var(--ink)",
                textWrap: "balance" as any,
              }}
            >
              {ar ? provider.nameAr : provider.name}
            </h2>
            <p
              className="measure mt-2"
              style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-muted)" }}
            >
              {ar ? provider.descriptionAr : provider.description}
            </p>
          </div>
          {isConnected ? (
            <form action={disconnect}>
              <input type="hidden" name="providerKey" value={provider.key} />
              <button
                type="submit"
                className="dl-btn dl-btn-secondary"
                style={{ padding: "8px 14px", fontSize: 12 }}
              >
                <Power className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "فصل" : "Disconnect"}
              </button>
            </form>
          ) : provider.key === "sendgrid" || provider.key === "resend" ? (
            // Phase NS-4 — API-key providers use a dedicated form +
            // server-side validation (real HTTP call to provider).
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar ? "أدخل المفتاح أدناه" : "Paste your API key below"}
            </span>
          ) : (
            <form action={connect}>
              <input type="hidden" name="providerKey" value={provider.key} />
              <button type="submit" className="dl-btn dl-btn-primary">
                <Plug className="h-4 w-4" strokeWidth={1.5} />
                {ar ? "اتصل الآن" : "Connect now"}
              </button>
            </form>
          )}
        </section>

        {/* Scopes */}
        <DaylightPanel
          title={ar ? "ما الذي ستُمنح إذناً عليه" : "What you'll grant"}
          aside={
            ar
              ? "كل ما يطلبه H-Nerve. لا يُطلب منك أكثر مما يحتاجه التكامل."
              : "Everything H-Nerve asks for. We never request more than the integration needs."
          }
        >
          <div className="grid gap-2 md:grid-cols-2">
            {provider.scopes.map((s) => (
              <div
                key={s}
                className="flex items-center gap-3 px-3 py-2"
                style={{
                  background: "var(--cream)",
                  border: "1px solid var(--line)",
                }}
              >
                <ShieldCheck
                  className="h-3.5 w-3.5"
                  style={{ color: isConnected ? "var(--emerald)" : "var(--ink-muted)" }}
                  strokeWidth={1.5}
                />
                <code
                  style={{
                    fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: 12,
                    color: "var(--ink)",
                    background: "transparent",
                  }}
                >
                  {s}
                </code>
              </div>
            ))}
          </div>
        </DaylightPanel>

        {/* Phase NS-4 — API-key connect form for SendGrid + Resend.
            Submits to connectWithApiKey which makes a real validation
            call to the provider's API before persisting. */}
        {!isConnected && (provider.key === "sendgrid" || provider.key === "resend") ? (
          <DaylightPanel
            title={ar ? "أدخل مفتاحك من " + provider.name : `Paste your ${provider.name} API key`}
            aside={
              ar
                ? "نتحقق من المفتاح مع المزود قبل الحفظ. لن نخزن مفاتيح غير صالحة."
                : "We validate the key with the provider before saving. Invalid keys are rejected."
            }
          >
            <form action={connectWithApiKey} className="grid gap-3">
              <input type="hidden" name="providerKey" value={provider.key} />
              <label className="grid gap-1.5">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                  }}
                >
                  {provider.key === "sendgrid" ? "SendGrid API Key" : "Resend API Key"}
                </span>
                <input
                  type="password"
                  name="apiKey"
                  required
                  placeholder={provider.key === "sendgrid" ? "SG.xxxx…" : "re_xxxx…"}
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    padding: "10px 14px",
                    fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: 13,
                    color: "var(--ink)",
                    borderRadius: 0,
                  }}
                />
              </label>
              <label className="grid gap-1.5">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                  }}
                >
                  {ar ? "عنوان المُرسِل" : "From address"}
                </span>
                <input
                  type="email"
                  name="fromAddress"
                  defaultValue="ops@hourani.jo"
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    padding: "10px 14px",
                    fontFamily: "'Inter Tight','Inter',system-ui,sans-serif",
                    fontSize: 13.5,
                    color: "var(--ink)",
                    borderRadius: 0,
                  }}
                />
              </label>
              <button
                type="submit"
                className="dl-btn dl-btn-primary"
                style={{ alignSelf: "flex-start" }}
              >
                <Plug className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ar ? "تحقق واتصل" : "Validate and connect"}
              </button>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--ink-muted)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {ar
                  ? "ملاحظة: المفاتيح تُخزّن كنص خام حالياً. تشفير IntegrationCredential.tokenBlob مدرج كـ NS-4 follow-up."
                  : "Note: keys store as plaintext for now. Encryption of IntegrationCredential.tokenBlob is the NS-4 follow-up."}
              </p>
            </form>
          </DaylightPanel>
        ) : null}

        {/* Settings */}
        {provider.settingFields && provider.settingFields.length > 0 ? (
          <DaylightPanel
            title={ar ? "تفاصيل التكامل" : "Connector configuration"}
            aside={
              ar
                ? "هذه الحقول تُمرَّر إلى الإجراءات المُشغّلة في خرائط الأتمتة."
                : "These fields are passed into action handlers running inside workflows."
            }
          >
            <form action={saveSettings} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="providerKey" value={provider.key} />
              {provider.settingFields.map((f) => (
                <label key={f.key} className="grid gap-1.5">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {f.label}
                  </span>
                  <input
                    type="text"
                    name={`setting:${f.key}`}
                    defaultValue={settings[f.key] ?? f.default ?? ""}
                    placeholder={f.default}
                    style={{
                      background: "var(--cream)",
                      border: "1px solid var(--line)",
                      padding: "10px 14px",
                      fontFamily: "'Inter Tight','Inter',system-ui,sans-serif",
                      fontSize: 13.5,
                      color: "var(--ink)",
                      borderRadius: 0,
                    }}
                  />
                </label>
              ))}
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="dl-btn dl-btn-primary">
                  <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {ar ? "حفظ الإعدادات" : "Save settings"}
                </button>
              </div>
            </form>
          </DaylightPanel>
        ) : null}

        {/* Activity log */}
        <DaylightPanel
          title={ar ? "آخر النشاط" : "Recent activity"}
          aside={
            logs.length === 0
              ? (ar ? "لا نشاط بعد." : "No activity yet.")
              : ar
                ? `آخر ${logs.length} حدث.`
                : `Last ${logs.length} events.`
          }
        >
          {logs.length === 0 ? (
            <p
              style={{ color: "var(--ink-muted)", fontStyle: "italic", fontSize: 13 }}
            >
              {isConnected
                ? ar
                  ? "اتصلت للتو. أول إرسال سيظهر هنا."
                  : "Just connected. First send will show here."
                : ar
                  ? "اتصل لتبدأ تسجيل الأحداث."
                  : "Connect to start logging events."}
            </p>
          ) : (
            <ol className="space-y-1">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="grid grid-cols-[auto_auto_1fr_auto] gap-3 items-baseline px-3 py-2"
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    fontSize: 12.5,
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(log.ts)}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color:
                        log.kind === "error"
                          ? "var(--brick)"
                          : log.kind === "connect"
                            ? "var(--emerald)"
                            : log.kind === "disconnect"
                              ? "var(--ink-muted)"
                              : "var(--gold)",
                    }}
                  >
                    {log.kind}
                  </span>
                  <span style={{ color: "var(--ink)" }}>{log.message}</span>
                  {log.ms != null ? (
                    <span
                      className="font-mono"
                      style={{ fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.06em" }}
                    >
                      {log.ms}ms
                    </span>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ol>
          )}
        </DaylightPanel>
    </DaylightShell>
  );
}
