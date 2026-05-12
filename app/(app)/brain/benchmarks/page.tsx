// /brain/benchmarks — cross-org peer benchmarks (federated learning).
//
// Aesthetic: Quiet Authority (DESIGN-SKILL §1.C). The federation is a
// contract; the UI is a contract. Single chromatic accent — copper.
// Every benchmark card animates a 1px ochre scan line on first paint
// (the "freshly fetched from the federation" trust gesture).
//
// Phase 8 of docs/PHASES-INTELLIGENCE.md.

import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { getOptIn } from "@/lib/brain/federation.live";
import { Globe2, ShieldCheck, RotateCw, Database, Trash2, Building2, ArrowRight } from "lucide-react";
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
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · المعايير المرجعية" : "Brain · Peer benchmarks"}
        title={ar ? "ما يفعله نظراؤك بدون أن يعرفهم أحد" : "What your peers know — without knowing them"}
        subtitle={
          ar
            ? "تعلّم اتحادي خصوصي. K = 5: لا يظهر أي نمط ما لم يدعمه خمسة نظراء على الأقل. لا أسماء، لا حسابات، لا أرقام تعريفية."
            : "Privacy-preserving federated learning. K=5: no pattern surfaces unless backed by at least five peers. No names, no accounts, no identifiers."
        }
      />

      <PageContainer>
        {!enabled ? (
          <FederationContract ar={ar} />
        ) : (
          <>
            {/* Status row */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label={ar ? "الحالة" : "Status"} value={ar ? "نشطة" : "ENABLED"} valueColor="var(--heri-teal)" />
              <Stat label={ar ? "نظراء متّصلون" : "Connected peers"} value={peers.length} />
              <Stat label={ar ? "أنماط مرئية" : "Patterns visible"} value={patterns.length} />
              <Stat label={ar ? "K-تخفّي" : "K-anonymity"} value={optIn ? 5 : 0} />
            </section>

            {/* Action rail */}
            <div
              className="flex flex-wrap items-center gap-2 px-1 py-3"
              style={{
                borderTop: "1px solid var(--heri-rule)",
                borderBottom: "1px solid var(--heri-rule)",
              }}
            >
              <span className="heri-eyebrow">{ar ? "اتحاد" : "Federation"}</span>
              <form action={refreshFederation}>
                <button type="submit" className="heri-btn heri-btn-primary">
                  <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {ar ? "تحديث الأنماط" : "Refresh patterns"}
                </button>
              </form>
              {peers.length === 0 ? (
                <form action={seedFederationPeers}>
                  <button type="submit" className="heri-btn heri-btn-secondary">
                    <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {ar ? "ازرع نظراء تجريبيين" : "Seed demo peers"}
                  </button>
                </form>
              ) : null}
              <div className="grow" />
              <form action={optOutFederation}>
                <button
                  type="submit"
                  className="heri-btn heri-btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  {ar ? "إيقاف الاتحاد" : "Opt out"}
                </button>
              </form>
              <form action={clearFederation}>
                <button
                  type="submit"
                  className="heri-btn heri-btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 11, color: "var(--heri-terracotta)" }}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "مسح" : "Clear"}
                </button>
              </form>
            </div>

            {patterns.length === 0 ? (
              <HeritageSection
                eyebrow={ar ? "نظراء" : "Peers"}
                title={ar ? "لا أنماط بعد" : "No patterns yet"}
                aside={
                  ar
                    ? "اضغط «ازرع نظراء تجريبيين» لرؤية الاتحاد قيد العمل."
                    : "Press 'Seed demo peers' to see the federation in action."
                }
              >
                <form action={seedFederationPeers}>
                  <button type="submit" className="heri-btn heri-btn-primary">
                    <Database className="h-4 w-4" strokeWidth={1.5} />
                    {ar ? "ازرع نظراء تجريبيين" : "Seed demo peers"}
                  </button>
                </form>
              </HeritageSection>
            ) : (
              <section
                className="grid gap-3 heri-stagger"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(440px, 100%), 1fr))",
                }}
              >
                {patterns.map((p) => (
                  <BenchmarkCard key={p.id} pattern={p} ar={ar} />
                ))}
              </section>
            )}

            {/* Privacy guarantees footer */}
            <HeritageSection
              eyebrow={ar ? "الضمانات" : "Guarantees"}
              title={ar ? "ما يحميك في كل تبادل" : "What protects you in every exchange"}
              aside={
                ar
                  ? "الاتحاد مُلتزم بثلاث قواعد قاسية. لا واحدة منها قابلة للتجاوز."
                  : "The federation enforces three hard rules. None of them are bypassable."
              }
            >
              <ul className="space-y-2">
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
              </ul>
            </HeritageSection>
          </>
        )}
      </PageContainer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "14px 18px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink">{label}</div>
      <div
        className="heri-number mt-2"
        style={{
          fontSize: "clamp(22px, 2.4vw, 30px)",
          fontWeight: 500,
          color: valueColor ?? "var(--heri-ink)",
        }}
      >
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </div>
    </div>
  );
}

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
    <li
      className="grid grid-cols-[auto_1fr] gap-3 px-3 py-3"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
      }}
    >
      <div
        className="flex h-7 w-7 items-center justify-center"
        style={{
          background: "var(--heri-cream-2)",
          border: "1px solid var(--heri-rule)",
          color: "var(--heri-copper)",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          className="heri-eyebrow heri-eyebrow-ink"
          style={{ color: "var(--heri-copper)" }}
        >
          {title}
        </div>
        <p
          className="mt-1.5"
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--heri-ink-2)",
          }}
        >
          {body}
        </p>
      </div>
    </li>
  );
}

function FederationContract({ ar }: { ar: boolean }) {
  return (
    <section
      className="heri-hero"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div className="px-6 py-9 md:px-10 md:py-12">
        <div className="heri-eyebrow inline-flex items-center gap-2">
          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "العقد" : "The contract"}
        </div>
        <h2
          className={ar ? "mt-4" : "font-display-latin mt-4"}
          style={{
            fontSize: "clamp(28px, 3.6vw, 48px)",
            lineHeight: 1.05,
            letterSpacing: ar ? "-0.005em" : "-0.024em",
            fontWeight: ar ? 600 : 500,
            color: "var(--heri-ink)",
            textWrap: "balance" as any,
            maxWidth: "26em",
          }}
        >
          {ar
            ? "عبر الانضمام، تربح ذكاء جماعياً. ولا تخسر شيئاً يخصك."
            : "Join, and you gain a collective intelligence. You give up nothing of your own."}
        </h2>
        <p
          className="measure mt-5"
          style={{
            fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
            fontSize: "clamp(14px, 1.05vw, 16px)",
            lineHeight: 1.65,
            color: "var(--heri-ink-2)",
          }}
        >
          {ar
            ? "الاتحاد لا يرى بياناتك. لا يصل إلى عملائك. لا يقرأ أرقامك. كل ما يخرج من خادمك هو نتيجة مُجمَّعة عابرة لخمسة نظراء على الأقل، مع تشويش رياضي يضمن عدم القدرة على ربط أي نمط بمصدره. في المقابل، تستفيد من أنماط آلاف النظراء الذين يواجهون التحديات نفسها."
            : "The federation never sees your data. Never reaches into your customers. Never reads your numbers. The only thing that leaves your server is an aggregate that crosses at least five peers, mathematically perturbed so no pattern can be traced back. In return, you benefit from the patterns of dozens of peers solving the same problems you are."}
        </p>

        <ul className="mt-7 grid gap-3 md:grid-cols-3">
          <ContractTerm
            n="01"
            title={ar ? "K = 5" : "K = 5"}
            body={ar ? "خمسة نظراء على الأقل لكل نمط، دون استثناء." : "Five peers minimum per pattern, no exceptions."}
          />
          <ContractTerm
            n="02"
            title={ar ? "بدون أسماء" : "No names"}
            body={ar ? "لا تنتقل أيّ معرّفات. لا في الذهاب ولا في الإياب." : "No identifiers cross the boundary. Not outbound, not inbound."}
          />
          <ContractTerm
            n="03"
            title={ar ? "إلغاء فوري" : "Instant opt-out"}
            body={ar ? "إيقاف الاتحاد ينهي مساهماتك خلال ثوانٍ." : "Opting out terminates your contributions within seconds."}
          />
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <form action={optInFederation}>
            <button type="submit" className="heri-btn heri-btn-primary">
              <Globe2 className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "أوافق وأنضم إلى الاتحاد" : "I agree — join the federation"}
            </button>
          </form>
          <span
            style={{
              fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--heri-ink-3)",
            }}
          >
            {ar ? "يمكنك الإلغاء في أي وقت" : "You can opt out at any time"}
          </span>
        </div>
      </div>
    </section>
  );
}

function ContractTerm({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div
      style={{
        background: "var(--heri-cream-2)",
        border: "1px solid var(--heri-rule)",
        padding: "16px 18px",
      }}
    >
      <div
        className="heri-eyebrow"
        style={{ color: "var(--heri-copper)", fontSize: 10, letterSpacing: "0.22em" }}
      >
        TERM · {n}
      </div>
      <div
        className="font-display-latin mt-2"
        style={{
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "-0.012em",
          color: "var(--heri-ink)",
        }}
      >
        {title}
      </div>
      <p
        className="mt-2"
        style={{
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "var(--heri-ink-2)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function BenchmarkCard({ pattern, ar }: { pattern: any; ar: boolean }) {
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
    <article
      className="relative federation-card"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "18px 20px 16px",
        overflow: "hidden",
      }}
    >
      {/* Scan line — the trust gesture */}
      <span aria-hidden className="federation-scan" />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="heri-eyebrow inline-flex items-center gap-2"
            style={{ color: "var(--heri-copper)" }}
          >
            <Globe2 className="h-3 w-3" strokeWidth={1.5} />
            {ar ? "نظراء — اتحادي" : "PEERS · FEDERATED"}
          </div>
          <div
            className="heri-eyebrow heri-eyebrow-ink mt-1.5"
            style={{ fontSize: 9.5, letterSpacing: "0.18em" }}
          >
            {tierLine || (ar ? "فئتك" : "YOUR TIER")}
          </div>
        </div>
        <HeritagePill tone="info">
          {pattern.peerCount} {ar ? "نظير" : "peers"}
        </HeritagePill>
      </header>

      <p
        className={ar ? "mt-4" : "font-display-latin mt-4"}
        style={{
          fontSize: "clamp(15px, 1.2vw, 17px)",
          lineHeight: 1.5,
          letterSpacing: ar ? 0 : "-0.012em",
          color: "var(--heri-ink)",
          fontStyle: "italic",
          maxWidth: "62ch",
          fontFamily: ar
            ? "'IBM Plex Sans Arabic','Cairo',sans-serif"
            : "'Fraunces','Tiempos Headline',Georgia,serif",
          textWrap: "balance" as any,
        }}
      >
        "{ar ? pattern.statementAr ?? pattern.statementEn : pattern.statementEn}"
      </p>

      <footer
        className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-2"
        style={{ borderTop: "1px solid var(--heri-rule)" }}
      >
        <div
          className="flex flex-wrap items-center gap-2"
          style={{
            fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--heri-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {m ? (
            <>
              <span>{ar ? m.ar : m.en}</span>
              <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
            </>
          ) : null}
          <span>
            {ar ? "متوسط" : "AVG"} {(pattern.averageDelta * 100).toFixed(1)}%
          </span>
          <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
          <span>
            {ar ? "ثقة" : "CONF"} {(pattern.confidence * 100).toFixed(0)}%
          </span>
          <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
          <span style={{ color: "var(--heri-copper)" }}>
            K = {pattern.kAnonymity}
          </span>
        </div>
        <span
          className="heri-eyebrow inline-flex items-center gap-1"
          style={{ color: "var(--heri-copper)", fontSize: 10 }}
        >
          {ar ? "تفاصيل" : "DETAILS"}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
        </span>
      </footer>
    </article>
  );
}
