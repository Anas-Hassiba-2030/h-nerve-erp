// /brain/benchmarks — cross-org peer benchmarks (federated learning).
//
// Ported to the Claude Design reference
// (docs/design/system/sections/benchmarks.html + benchmarks-ops.js — brain
// NIGHT register: slim ribbon + control buttons + dark bench panel). Real
// data + server actions are preserved; the look is the reference. Styles live
// in ./benchmarks.css, scoped to .dl-page.
//
// Phase 8 of docs/PHASES-INTELLIGENCE.md.

import "../../daylight.css";
import "./benchmarks.css";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getOptIn } from "@/lib/brain/federation.live";
import { Globe2, ShieldCheck, RotateCw, Database, Trash2, Building2 } from "lucide-react";
import {
  optInFederation,
  optOutFederation,
  refreshFederation,
  seedFederationPeers,
  clearFederation,
} from "./actions";

const MODULE_LABEL: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "الفنادق", en: "Hotels" },
  DAIRY:     { ar: "الألبان", en: "Dairy" },
  FARMS:     { ar: "المزارع", en: "Farms" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  FINANCE:   { ar: "المالية", en: "Finance" },
  GROUP:     { ar: "المجموعة", en: "Group" },
};

export default async function BrainBenchmarksPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const [optIn, peers, patterns] = await Promise.all([
    getOptIn("default"),
    prisma.federationPeer.findMany(),
    prisma.federationPattern.findMany({
      where: { visibleTo: "default" },
      orderBy: [{ peerCount: "desc" }, { confidence: "desc" }],
    }),
  ]);

  const enabled = optIn.status === "ENABLED";

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        {/* slim ribbon — eyebrow + title + intro */}
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
            </span>
            <h1>{ar ? "الفيدرالية" : "Federation"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "معايير مرجعية فيدرالية عبر مستأجرين مجهّلين. شارك بياناتك أو انسحب في أي وقت. K = 5: لا يظهر أي نمط ما لم يدعمه خمسة نظراء على الأقل."
              : "Privacy-preserving federated benchmarks across anonymized tenants. Share your data or opt out at any time. K=5: no pattern surfaces unless backed by at least five peers."}
          </div>
        </div>

        {!enabled ? (
          <FederationContract ar={ar} />
        ) : (
          <>
            {/* KPI strip — status */}
            <div className="br-kpis">
              <div className="br-kpi">
                <div className="v" style={{ color: "var(--sage)" }}>{ar ? "نشطة" : "ENABLED"}</div>
                <div className="k">{ar ? "الحالة" : "Status"}</div>
              </div>
              <div className="br-kpi">
                <div className="v">{peers.length.toLocaleString("en-US")}</div>
                <div className="k">{ar ? "نظراء متّصلون" : "Connected peers"}</div>
              </div>
              <div className="br-kpi">
                <div className="v">{patterns.length.toLocaleString("en-US")}</div>
                <div className="k">{ar ? "أنماط مرئية" : "Patterns visible"}</div>
              </div>
              <div className="br-kpi">
                <div className="v">{optIn ? 5 : 0}</div>
                <div className="k">{ar ? "K-تخفّي" : "K-anonymity"}</div>
              </div>
            </div>

            {/* Controls — refresh + seed + opt out + clear */}
            <div className="br-controls">
              <form action={refreshFederation}>
                <button type="submit" className="br-btn br-btn-primary">
                  <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {ar ? "⟳ تحديث الأنماط" : "⟳ Refresh patterns"}
                </button>
              </form>
              {peers.length === 0 ? (
                <form action={seedFederationPeers}>
                  <button type="submit" className="br-btn br-btn-ghost">
                    <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {ar ? "ازرع نظراء تجريبيين" : "Seed demo peers"}
                  </button>
                </form>
              ) : null}
              <form action={optOutFederation}>
                <button type="submit" className="br-btn br-btn-ghost">
                  {ar ? "الانسحاب من الفيدرالية" : "Opt out"}
                </button>
              </form>
              <form action={clearFederation}>
                <button type="submit" className="br-btn danger">
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "مسح" : "Clear"}
                </button>
              </form>
            </div>

            {/* Bench patterns panel */}
            <div className="br-panel">
              <h2>{ar ? "أنماط مرجعية" : "Benchmark patterns"}</h2>
              <div className="sub">{ar ? "مقابل متوسط القطاع المجهّل" : "Against the anonymized sector average"}</div>
              {patterns.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--mist)", opacity: 0.6 }}>
                  <p style={{ marginBottom: 16 }}>
                    {ar
                      ? "اضغط «ازرع نظراء تجريبيين» لرؤية الاتحاد قيد العمل."
                      : "Press 'Seed demo peers' to see the federation in action."}
                  </p>
                  <form action={seedFederationPeers}>
                    <button type="submit" className="br-btn br-btn-primary">
                      <Database className="h-4 w-4" strokeWidth={1.5} />
                      {ar ? "ازرع نظراء تجريبيين" : "Seed demo peers"}
                    </button>
                  </form>
                </div>
              ) : (
                patterns.map((p) => <BenchmarkRow key={p.id} pattern={p} ar={ar} />)
              )}
            </div>

            {/* Privacy guarantees panel */}
            <div className="br-panel">
              <h2>{ar ? "ما يحميك في كل تبادل" : "What protects you in every exchange"}</h2>
              <div className="sub">
                {ar
                  ? "الاتحاد مُلتزم بثلاث قواعد قاسية. لا واحدة منها قابلة للتجاوز."
                  : "The federation enforces three hard rules. None of them are bypassable."}
              </div>
              <Guarantee
                icon={<ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />}
                title={ar ? "K-تخفّي = 5" : "K-anonymity = 5"}
                body={
                  ar
                    ? "لا يظهر أي نمط ما لم يكن خمسة نظراء على الأقل قد ساهموا فيه. وحتى حينها، لا يُذكر أيٌّ منهم بالاسم."
                    : "No pattern surfaces unless at least five peers have contributed to it. Even then, none of them is ever named."
                }
              />
              <Guarantee
                icon={<Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                title={ar ? "بدون نسب فردي" : "No per-peer attribution"}
                body={
                  ar
                    ? "كل ما يعبر الحدود هو متوسط مجمَّع. النتائج الفردية لكل نظير تبقى داخل خادمها."
                    : "Only the aggregate ever crosses the boundary. Each peer's individual outcomes stay inside their own server."
                }
              />
              <Guarantee
                icon={<Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                title={ar ? "ميزانية خصوصية محدودة" : "Bounded privacy budget"}
                body={
                  ar
                    ? `استعلامات اليوم تستهلك ${(optIn.budgetUsed * 100).toFixed(0)}٪ من ميزانية الخصوصية. عند الوصول إلى 100٪ يتوقّف التبادل تلقائياً حتى دورة تجديد جديدة.`
                    : `Today's queries consume ${(optIn.budgetUsed * 100).toFixed(0)}% of the privacy budget. When 100% is reached, the exchange auto-pauses until the next refresh window.`
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Guarantee({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="br-row" style={{ alignItems: "flex-start" }}>
      <div
        className="flex h-7 w-7 items-center justify-center"
        style={{
          background: "rgba(13,31,26,.5)",
          border: "1px solid rgba(194,163,90,.24)",
          borderRadius: 10,
          color: "var(--gold-soft)",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>
      <div className="rt">
        <div className="tt" style={{ color: "var(--gold-soft)", textTransform: "uppercase", letterSpacing: ".1em", fontSize: 11 }}>
          {title}
        </div>
        <div className="ts">{body}</div>
      </div>
    </div>
  );
}

function FederationContract({ ar }: { ar: boolean }) {
  return (
    <div className="br-panel">
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--gold-soft)" }}>
        <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
        {ar ? "العقد" : "The contract"}
      </div>
      <h2
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(26px, 3.6vw, 40px)",
          lineHeight: 1.08,
          fontWeight: 600,
          color: "#fff",
          marginTop: 14,
          maxWidth: "26em",
        }}
      >
        {ar
          ? "عبر الانضمام، تربح ذكاء جماعياً. ولا تخسر شيئاً يخصك."
          : "Join, and you gain a collective intelligence. You give up nothing of your own."}
      </h2>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--mist)", opacity: 0.82, marginTop: 16, maxWidth: "62ch" }}>
        {ar
          ? "الاتحاد لا يرى بياناتك. لا يصل إلى عملائك. لا يقرأ أرقامك. كل ما يخرج من خادمك هو نتيجة مُجمَّعة عابرة لخمسة نظراء على الأقل، مع تشويش رياضي يضمن عدم القدرة على ربط أي نمط بمصدره. في المقابل، تستفيد من أنماط آلاف النظراء الذين يواجهون التحديات نفسها."
          : "The federation never sees your data. Never reaches into your customers. Never reads your numbers. The only thing that leaves your server is an aggregate that crosses at least five peers, mathematically perturbed so no pattern can be traced back. In return, you benefit from the patterns of dozens of peers solving the same problems you are."}
      </p>

      <div style={{ marginTop: 22 }}>
        <ContractTerm n="01" title={ar ? "K = 5" : "K = 5"} body={ar ? "خمسة نظراء على الأقل لكل نمط، دون استثناء." : "Five peers minimum per pattern, no exceptions."} />
        <ContractTerm n="02" title={ar ? "بدون أسماء" : "No names"} body={ar ? "لا تنتقل أيّ معرّفات. لا في الذهاب ولا في الإياب." : "No identifiers cross the boundary. Not outbound, not inbound."} />
        <ContractTerm n="03" title={ar ? "إلغاء فوري" : "Instant opt-out"} body={ar ? "إيقاف الاتحاد ينهي مساهماتك خلال ثوانٍ." : "Opting out terminates your contributions within seconds."} />
      </div>

      <div className="br-controls" style={{ marginTop: 24, marginBottom: 0 }}>
        <form action={optInFederation}>
          <button type="submit" className="br-btn br-btn-primary">
            <Globe2 className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "الانضمام للفيدرالية" : "I agree — join the federation"}
          </button>
        </form>
        <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, letterSpacing: ".06em", color: "var(--mist)", opacity: 0.6 }}>
          {ar ? "يمكنك الإلغاء في أي وقت" : "You can opt out at any time"}
        </span>
      </div>
    </div>
  );
}

function ContractTerm({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="br-row">
      <div className="rt">
        <div className="ts" style={{ color: "var(--gold-soft)", letterSpacing: ".22em", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
          TERM · {n}
        </div>
        <div className="tt" style={{ fontFamily: "var(--display)", fontSize: 17 }}>{title}</div>
        <div className="ts">{body}</div>
      </div>
    </div>
  );
}

function BenchmarkRow({ pattern, ar }: { pattern: any; ar: boolean }) {
  let tier: any = {};
  try {
    tier = JSON.parse(pattern.tierJson);
  } catch {
    /* */
  }
  const tierLine = [tier.vertical, tier.size, tier.region, tier.class]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
  const m = pattern.module ? MODULE_LABEL[pattern.module] : null;

  return (
    <div className="br-row" style={{ alignItems: "flex-start" }}>
      <div className="rt">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--gold-soft)" }}>
          <Globe2 className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "نظراء — اتحادي" : "PEERS · FEDERATED"}
          {tierLine ? <span style={{ opacity: 0.7 }}> · {tierLine}</span> : null}
        </div>
        <div className="tt" style={{ fontStyle: "italic", fontWeight: 600, marginTop: 6 }}>
          "{ar ? pattern.statementAr ?? pattern.statementEn : pattern.statementEn}"
        </div>
        <div className="ts" style={{ marginTop: 6 }}>
          {m ? `${ar ? m.ar : m.en} · ` : ""}
          {`${ar ? "متوسط" : "AVG"} ${(pattern.averageDelta * 100).toFixed(1)}%`}
          {` · ${ar ? "ثقة" : "CONF"} ${(pattern.confidence * 100).toFixed(0)}%`}
          {" · "}
          <span style={{ color: "var(--gold-soft)" }}>K = {pattern.kAnonymity}</span>
        </div>
      </div>
      <span className="br-chip info">
        {pattern.peerCount} {ar ? "نظير" : "peers"}
      </span>
      {/* Removed a "DETAILS →" affordance that looked clickable but had no
          handler or drill-down route. Re-add as a real <Link> if a benchmark
          detail page is built. */}
    </div>
  );
}
