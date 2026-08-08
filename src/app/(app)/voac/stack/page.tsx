import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { STACK_GROUPS, PILLARS, stackTotals } from "@/lib/voac/stackManifest";
import "../../daylight.css";
import "../voac.css";
import "../how/explain.css";

// Dynamic for the same reason as /voac/how — see the note there. The (app)
// layout is session-gated, so a build-time-prerendered page under it is a
// shell that never saw a request.
export const dynamic = "force-dynamic";

/**
 * "The stack" — the machinery behind the agent company, stated plainly.
 *
 * Static on purpose. Every claim here is checkable against a real path in this
 * repo, and each row names that path. A technical page that cannot be verified
 * against the tree is marketing.
 */
export default async function VoacStackPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);
  const totals = stackTotals();

  const layers = [
    {
      layer: L("الواجهة", "Interface"),
      what: L("Next.js 16 (App Router) + React 19، عربي أولاً مع RTL", "Next.js 16 (App Router) + React 19, Arabic-first with RTL"),
      path: "src/app/(app)/voac/",
      why: L(
        "صفحات تُبنى على الخادم؛ الأزرار تنادي Server Actions مباشرةً بلا طبقة API وسيطة.",
        "Server-rendered pages; buttons call Server Actions directly with no intermediate API layer.",
      ),
    },
    {
      layer: L("قواعد الشركة", "Company rules"),
      what: L("منطق صافٍ، مُختبَر بالكامل، بلا قاعدة بيانات", "Pure logic, fully unit-tested, no database"),
      path: "src/lib/voac/{roles,topology,budget,orgMap,schedule}.ts",
      why: L(
        "كل حكم (من يشرف، ما النمط، أي مقترح يظهر) في ملف صافٍ يمكن اختباره بلا تشغيل النظام كله.",
        "Every judgement (who supervises, which topology, which proposal surfaces) lives in a pure file testable without booting the system.",
      ),
    },
    {
      layer: L("المحرّك", "The driver"),
      what: L("حلقة أدوات فوق نموذج لغوي، مع ثلاثة مكابح تكلفة", "An LLM tool-loop with three cost brakes"),
      path: "src/lib/voac/driver.live.ts",
      why: L(
        "سقف خطوات، ثم ميزانية المستأجر، ثم سقف المقترحات — بهذا الترتيب. أرخص مكبح يُفحص أولاً.",
        "Hop ceiling, then tenant budget, then proposal cap — in that order. The cheapest brake is checked first.",
      ),
    },
    {
      layer: L("الدماغ", "The Brain"),
      what: L("سبع أدوات مشتركة يُعاد استخدامها، لا نسخة ثانية", "Seven shared tools, reused rather than duplicated"),
      path: "src/lib/brain/tools/",
      why: L(
        "الوكلاء ينادون الأدوات نفسها التي تنادي منها بقية المنصة — سحب الوقائع، الرسم السببي، المحاكاة، المجلس، الذاكرة، الوثائق، الصياغة.",
        "Agents call the same tools the rest of the platform calls — pull facts, causal subgraph, simulate, council, memory, documents, narrate.",
      ),
    },
    {
      layer: L("المهارات", "Skills"),
      what: L("تعليمات كل دور ملفّ Markdown حقيقي", "Each role's instructions are a real Markdown file"),
      path: "src/lib/voac/skills/*.md",
      why: L(
        "تُجمَّع وقت البناء إلى ثابت (Workers بلا نظام ملفات وقت الطلب)، وتبقى Markdown حقيقية كي تصلح للتحسين الآلي لاحقاً.",
        "Compiled to a constant at build time (Workers has no request-time filesystem) while staying real Markdown so they remain trainable later.",
      ),
    },
    {
      layer: L("السجل", "The ledger"),
      what: L("أربعة جداول: تشغيل، خطوة، مقترح، فريق", "Four tables: run, step, proposal, roster"),
      path: "prisma/schema/voac.prisma",
      why: L(
        "كل تشغيل قابل لإعادة القراءة خطوةً بخطوة. الرفض والوضع التجريبي حالتان مستقلتان — لا تُحسبان فشلاً.",
        "Every run is replayable step by step. Refusal and stub are their own statuses — neither counts as a failure.",
      ),
    },
    {
      layer: L("القاعدة", "The database"),
      what: L("Cloudflare D1 (SQLite) عبر Prisma", "Cloudflare D1 (SQLite) through Prisma"),
      path: "prisma/schema/*.prisma",
      why: L(
        "تعمل على حافة الشبكة بجانب الـ Worker. لا معاملات تفاعلية — لذلك تُكتب الكتابات المتعدّدة ككتابة واحدة ثم تحديث حالة ذرّي.",
        "Runs at the edge next to the Worker. No interactive transactions — so multi-row writes are one write plus one atomic status flip.",
      ),
    },
    {
      layer: L("التشغيل", "Runtime"),
      what: L("Cloudflare Workers + مُشغّل مجدول", "Cloudflare Workers + a scheduled trigger"),
      path: "src/app/api/cron/voac/route.ts",
      why: L(
        "يفشل مُغلقاً: بلا سرّ صحيح لا يعمل إطلاقاً (٥٠٣/٤٠١)، ولا يشغّل أكثر من ١٢ مهمة في المرة.",
        "Fails closed: with no valid secret it does not run at all (503/401), and it never fires more than 12 runs at once.",
      ),
    },
  ];

  const guards = [
    {
      ar: "عزل المستأجرين",
      en: "Tenant isolation",
      body: L(
        "كل استعلام يمرّ بعميل مُقيَّد بالمستأجر. الاستثناءات (ومنها هذا السجل، لأنه عابر للشركات بالتصميم) تحمل تعليقاً صريحاً يبرّرها.",
        "Every query goes through a tenant-scoped client. The exceptions — including this ledger, which is cross-company by design — carry an explicit comment justifying them.",
      ),
      path: "src/lib/tenancy/workspaceScope.ts",
    },
    {
      ar: "صلاحيات المسارات",
      en: "Route permissions",
      body: L(
        "خريطة واحدة تحكم من يرى ماذا، ويحرسها اختبار تغطية يمنع وصول مسار جديد بلا تصنيف.",
        "One map governs who sees what, guarded by a coverage test that stops a new route shipping unclassified.",
      ),
      path: "src/lib/auth/permissions.ts",
    },
    {
      ar: "حرس الاسترجاع",
      en: "Retrieval guard",
      body: L(
        "النصوص المسترجَعة تُنقَّى من محاولات حقن التعليمات قبل أن تصل إلى النموذج.",
        "Retrieved text is scrubbed of prompt-injection attempts before it ever reaches the model.",
      ),
      path: "src/lib/brain/ragGuard.ts",
    },
    {
      ar: "الأخطاء تُبلَّغ",
      en: "Errors are reported",
      body: L(
        "كل خطأ مُبتلَع على مسار تعديل يُرسل سطراً منقّحاً إلى سجلات التشغيل — التوست يخبر المستخدم، والتقرير يخبر المشغّل.",
        "Every swallowed error on a mutation path emits one redacted line to the runtime logs — the toast tells the user, the report tells the operator.",
      ),
      path: "src/lib/observability/report.ts",
    },
  ];

  const proofs = [
    { ar: "اختبارات الوحدة", en: "Unit tests", cmd: "npm test", note: L("منطق صافٍ فقط — بلا قاعدة بيانات ولا شبكة", "Pure logic only — no DB, no network") },
    { ar: "فحص الأنواع", en: "Typecheck", cmd: "npm run typecheck", note: L("يجب أن يمرّ قبل أي دمج", "Must pass before any merge") },
    { ar: "اختبار دخان شامل", en: "End-to-end smoke", cmd: "tsx scripts/verify/voac-smoke.ts", note: L("٢٣ فحصاً على قاعدة حقيقية — منها إثبات أن لا جدول أعمال يُمَسّ", "23 checks against a real DB — including proof no domain table is touched") },
    { ar: "تجربة الجدولة", en: "Schedule dry-run", cmd: "tsx scripts/verify/voac-cron-check.ts", note: L("يعرض ما كان سيعمل، بلا تشغيل", "Shows what would fire, without firing it") },
  ];

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={
          <Link href="/voac" className="vo-link vo-back">
            <ArrowLeft size={13} /> {L("عودة إلى الطابور", "Back to the queue")}
          </Link>
        }
        title={L("البنية التقنية", "The stack")}
        subtitle={L(
          "ما الذي يشغّل شركة الوكلاء فعلياً — وأين يقع كل جزء في هذا المستودع.",
          "What actually runs the agent company — and where each piece lives in this repository.",
        )}
        actions={
          <span className="vo-header-links">
            <Link href="/voac/map" className="vo-ghost-btn">
              {L("الخريطة", "The map")}
            </Link>
            <Link href="/voac/how" className="vo-ghost-btn">
              {L("كيف يعمل", "How it works")}
            </Link>
          </span>
        }
      />

      <div className="ex-thesis">
        <p>
          {L(
            "لا خدمة خارجية، ولا قاعدة بيانات ثانية، ولا إطار وكلاء مستورد. شركة الوكلاء تعمل داخل نفس التطبيق، وتنادي نفس الأدوات، وتكتب في نفس القاعدة.",
            "No external service, no second database, no imported agent framework. The agent company runs inside the same application, calls the same tools, and writes to the same database.",
          )}
        </p>
      </div>

      <DaylightPanel
        title={L("الطبقات", "The layers")}
        aside={
          <span className="vo-note">
            {L("كل سطر يشير إلى مسار حقيقي في المستودع.", "Every row names a real path in the repo.")}
          </span>
        }
      >
        <div className="ex-layers">
          {layers.map((l, i) => (
            <div key={l.path} className="ex-layer" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="ex-layer-head">
                <span className="ex-layer-name">{l.layer}</span>
                <code className="ex-path">{l.path}</code>
              </div>
              <div className="ex-layer-what">{l.what}</div>
              <p className="ex-layer-why">{l.why}</p>
            </div>
          ))}
        </div>
      </DaylightPanel>

      <DaylightPanel title={L("الحواجز", "The guardrails")}>
        <div className="ex-grid">
          {guards.map((g, i) => (
            <div key={g.en} className="ex-card" style={{ animationDelay: `${i * 80}ms` }}>
              <h4>{ar ? g.ar : g.en}</h4>
              <p>{g.body}</p>
              <code className="ex-path">{g.path}</code>
            </div>
          ))}
        </div>
      </DaylightPanel>

      <DaylightPanel
        title={L("كيف يُثبَت أنه يعمل", "How it is proven to work")}
        aside={
          <span className="vo-note">
            {L("الادعاء بلا فحص ليس ادعاءً.", "A claim with no check is not a claim.")}
          </span>
        }
      >
        <table className="vo-table">
          <thead>
            <tr>
              <th>{L("الفحص", "Check")}</th>
              <th>{L("الأمر", "Command")}</th>
              <th>{L("ماذا يغطّي", "What it covers")}</th>
            </tr>
          </thead>
          <tbody>
            {proofs.map((p) => (
              <tr key={p.cmd}>
                <td>{ar ? p.ar : p.en}</td>
                <td><code className="ex-path">{p.cmd}</code></td>
                <td>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DaylightPanel>

      {/* The dependency roster. Versions are read from package.json at build
          time, so this section cannot drift from what actually ships. */}
      <DaylightPanel
        title={L(
          `المكتبات — ${totals.packages} حزمة في ${totals.groups} مجموعات`,
          `The libraries — ${totals.packages} packages across ${totals.groups} groups`,
        )}
        aside={
          <span className="vo-note">
            {L(
              "الإصدارات تُقرأ من package.json عند البناء، لا تُكتب يدوياً.",
              "Versions are read from package.json at build time, never hand-typed.",
            )}
          </span>
        }
      >
        <div className="ex-layers">
          {STACK_GROUPS.map((g, i) => (
            <div key={g.id} className="ex-layer" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="ex-layer-head">
                <span className="ex-layer-name">{ar ? g.ar : g.en}</span>
                <span className="vo-note">{g.packages.length}</span>
              </div>
              <div className="ex-layer-what">
                <span className="ex-pkgs">
                  {g.packages.map((p) => (
                    <span key={p.name} className="ex-pkg">
                      <span className="ex-pkg-name">{p.name}</span>
                      <span className="ex-pkg-ver">{p.version}</span>
                    </span>
                  ))}
                </span>
              </div>
              <div className="ex-layer-why">{ar ? g.whyAr : g.whyEn}</div>
            </div>
          ))}
        </div>
      </DaylightPanel>

      {/* What none of those packages gave us — i.e. the actual product. */}
      <DaylightPanel
        title={L("ما بُني هنا", "What was built here")}
        aside={
          <span className="vo-note">
            {L(
              "لا يمكن تثبيت أيٍّ من هذه من npm — هذه هي المنتَج.",
              "None of these can be installed from npm — this is the product.",
            )}
          </span>
        }
      >
        <table className="vo-table">
          <thead>
            <tr>
              <th>{L("الركيزة", "Pillar")}</th>
              <th>{L("المسار", "Path")}</th>
              <th>{L("ما هي", "What it is")}</th>
            </tr>
          </thead>
          <tbody>
            {PILLARS.map((p) => (
              <tr key={p.path}>
                <td>{ar ? p.ar : p.en}</td>
                <td><code className="ex-path">{p.path}</code></td>
                <td>{ar ? p.noteAr : p.noteEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DaylightPanel>

      <DaylightPanel title={L("قيود معروفة", "Known limits")}>
        <ul className="ex-nots">
          <li>
            {L(
              "بلا مفتاح نموذج، تُسجَّل التشغيلات بحالة «وضع تجريبي» — تعمل، لكنها لا تنتج تحليلاً حقيقياً.",
              'With no model key configured, runs are recorded as "stub" — they work, but they produce no real analysis.',
            )}
          </li>
          <li>
            {L(
              "D1 لا يدعم المعاملات التفاعلية، فالكتابات المتعدّدة تُبنى لتكون آمنة عند الانقطاع بدل الاعتماد على التراجع.",
              "D1 has no interactive transactions, so multi-row writes are built to be interruption-safe rather than relying on rollback.",
            )}
          </li>
          <li>
            {L(
              "التعلّم من قرارات الرفض مسجَّل ولم يُستَخدَم بعد في تدريب — البيانات موجودة، الحلقة لم تُغلق.",
              "Learning from rejection reasons is recorded but not yet fed back into training — the data exists, the loop is not closed.",
            )}
          </li>
        </ul>
      </DaylightPanel>
    </DaylightShell>
  );
}
