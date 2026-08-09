import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { VOAC_ROLES } from "@/lib/voac/roles";
import "../../daylight.css";
import "../voac.css";
import "./explain.css";

// Dynamic, despite the content being fixed. The (app) layout reads the session
// cookie on every render, so prerendering this page at build time puts a static
// shell inside an auth-gated layout — the two disagree about whether a request
// exists. The content is a constant either way; the render is cheap.
export const dynamic = "force-dynamic";

/**
 * "How the system works" — written for the owner, not the engineer.
 *
 * Deliberately static: this page explains the DESIGN, and a design that changes
 * every time a row lands is not a design. The technical companion (/voac/stack)
 * covers the machinery; this one covers the promises.
 */
export default async function VoacHowPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  const steps = [
    {
      n: "١",
      nEn: "1",
      ar: "الجدولة توقظ وكيلاً",
      en: "A schedule wakes an agent",
      arBody:
        "كل دور له إيقاع خاص به (كل ٢٤ ساعة مثلاً). النظام يوقظ الأكثر تأخّراً أولاً، وبحدّ أقصى ١٢ تشغيلاً في المرة الواحدة — لا يستيقظ الجميع دفعةً واحدة.",
      enBody:
        "Every role has its own cadence (say every 24 hours). The system wakes the most-overdue first, capped at 12 runs per firing — they never all wake at once.",
    },
    {
      n: "٢",
      nEn: "2",
      ar: "الوكيل يقرأ بياناتك، لا الإنترنت",
      en: "The agent reads your data, not the internet",
      arBody:
        "يسحب الوقائع من قاعدة بياناتك أنت — الدفعات، الحجوزات، القيود، المخزون. لا يخترع رقماً ولا يستشير مصدراً خارجياً.",
      enBody:
        "It pulls facts from your own database — batches, bookings, journal entries, stock. It does not invent a number, and it does not consult an outside source.",
    },
    {
      n: "٣",
      nEn: "3",
      ar: "يكتب مقترحاً، ثم يتوقف",
      en: "It writes a proposal, then stops",
      arBody:
        "المخرَج مقترح مكتوب: عنوان، سبب، قيمة مُقدَّرة، ودرجة ثقة يذكرها الوكيل بنفسه. هنا ينتهي دوره — لا يغيّر سطراً واحداً في بياناتك.",
      enBody:
        "The output is a written proposal: a title, a reason, an estimated value, and a confidence the agent states itself. That is where its job ends — it never changes a single row of your data.",
    },
    {
      n: "٤",
      nEn: "4",
      ar: "الطابور محدود بالتصميم",
      en: "The queue is capped by design",
      arBody:
        "لكل فريق سقف يومي. تُرتَّب المقترحات بالقيمة المتوقعة (القيمة × الثقة) ويُعرَض الأعلى فقط؛ والباقي يُسجَّل مع سبب استبعاده — لا يختفي بصمت.",
      enBody:
        "Each roster has a daily cap. Proposals are ranked by expected value (value × confidence) and only the top ones surface; the rest are recorded with the reason they were held back — nothing disappears silently.",
    },
    {
      n: "٥",
      nEn: "5",
      ar: "أنت من يقرّر",
      en: "You decide",
      arBody:
        "أوافق أو أرفض. الرفض يتطلّب سبباً — وهذا مقصود: السبب هو ما يتعلّم منه النظام. كل قرار يُسجَّل باسم صاحبه ووقته.",
      enBody:
        "Accept or reject. Rejecting requires a reason — deliberately: the reason is what the system learns from. Every decision is recorded against a name and a timestamp.",
    },
    {
      n: "٦",
      nEn: "6",
      ar: "القبول ليس تنفيذاً",
      en: "Accepting is not executing",
      arBody:
        "الموافقة تسجّل قرارك فقط. التنفيذ يتم من الوحدة المعنية بيدك — لأن وكيلاً يستطيع الكتابة في دفتر الأستاذ نظامٌ لا يمكن مراجعته.",
      enBody:
        "Approval records your decision only. Carrying it out happens in the relevant module, by hand — because an agent that can write to the ledger is a system you cannot audit.",
    },
    {
      n: "٧",
      nEn: "7",
      ar: "ثم يُقاس ما حدث فعلاً",
      en: "Then what actually happened is measured",
      arBody:
        "بعد التنفيذ تُسجّل القيمة الفعلية بجانب المقدَّرة. الفارق بينهما هو المقياس الوحيد الذي يُعتدّ به — لا عدد المقترحات.",
      enBody:
        "After execution you record the realized value next to the estimate. The gap between them is the only number that counts — not how many proposals were produced.",
    },
  ];

  const promises = [
    {
      ar: "يقترح ولا ينفّذ",
      en: "It proposes; it never executes",
      arBody: "لا وكيل يكتب في بياناتك. الحدّ مفروض في الكود، لا في السياسة.",
      enBody: "No agent writes to your data. The boundary is enforced in code, not in policy.",
    },
    {
      ar: "طابور فارغ إجابة صحيحة",
      en: "An empty queue is a valid answer",
      arBody:
        "أسبوع بلا مقترحات يعني أن لا شيء يستحق قراراً — لا أن النظام متوقف. النظام الذي يجب أن ينتج شيئاً كل يوم سينتج ضجيجاً.",
      enBody:
        "A week with no proposals means nothing warranted a decision — not that the system is down. A system that must produce something daily will produce noise.",
    },
    {
      ar: "الرفض سطر في السجل",
      en: "A refusal is a row in the ledger",
      arBody:
        "حين يرفض الوكيل العمل (تجاوز سقف، ميزانية منتهية) يُسجَّل ذلك صراحةً. الصمت ليس خياراً.",
      enBody:
        "When an agent declines to work (a hop ceiling, an exhausted budget) it is recorded explicitly. Silence is not an option.",
    },
    {
      ar: "الثقة مذكورة أو غائبة — لا مُختلَقة",
      en: "Confidence is stated or absent — never fabricated",
      arBody:
        "إن لم يذكر الوكيل ثقته، تُعرَض «ثقة غير مذكورة». لا يُوضَع رقم وسطي في مكانها.",
      enBody:
        'If the agent stated no confidence, the card reads "not stated". A middle value is never invented to fill the gap.',
    },
  ];

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={
          <Link href="/voac" className="vo-link vo-back">
            <ArrowLeft size={13} /> {L("عودة إلى الطابور", "Back to the queue")}
          </Link>
        }
        title={L("كيف يعمل النظام", "How the system works")}
        subtitle={L(
          "من لحظة استيقاظ الوكيل إلى لحظة قياس ما حدث فعلاً — بلا مصطلحات.",
          "From the moment an agent wakes to the moment the outcome is measured — without jargon.",
        )}
        actions={
          <span className="vo-header-links">
            <Link href="/voac/map" className="vo-ghost-btn">
              {L("الخريطة", "The map")}
            </Link>
            <Link href="/voac/stack" className="vo-ghost-btn">
              {L("البنية التقنية", "The stack")}
            </Link>
          </span>
        }
      />

      {/* ── The one sentence ──────────────────────────────────────── */}
      <div className="ex-thesis">
        <p>
          {L(
            "شركة وكلاء تعمل داخل نظامك: تقرأ بياناتك، وتكتب مقترحاً واحداً حين يستحق الأمر قراراً، ثم تتوقف وتنتظرك.",
            "An agent company running inside your system: it reads your data, writes one proposal when something warrants a decision, then stops and waits for you.",
          )}
        </p>
      </div>

      {/* ── The seven steps ───────────────────────────────────────── */}
      <DaylightPanel title={L("الدورة الكاملة", "The full cycle")}>
        <ol className="ex-steps">
          {steps.map((s, i) => (
            <li key={s.en} className="ex-step" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="ex-step-n" aria-hidden>{ar ? s.n : s.nEn}</span>
              <div className="ex-step-body">
                <h3>{ar ? s.ar : s.en}</h3>
                <p>{ar ? s.arBody : s.enBody}</p>
              </div>
            </li>
          ))}
        </ol>
      </DaylightPanel>

      {/* ── The four promises ─────────────────────────────────────── */}
      <DaylightPanel
        title={L("أربعة التزامات ثابتة", "Four standing promises")}
        aside={
          <span className="vo-note">
            {L("مفروضة في الكود، لا في نيّة حسنة.", "Enforced in code, not in good intentions.")}
          </span>
        }
      >
        <div className="ex-grid">
          {promises.map((p, i) => (
            <div key={p.en} className="ex-card" style={{ animationDelay: `${i * 80}ms` }}>
              <h4>{ar ? p.ar : p.en}</h4>
              <p>{ar ? p.arBody : p.enBody}</p>
            </div>
          ))}
        </div>
      </DaylightPanel>

      {/* ── Loop vs graph ─────────────────────────────────────────────
          The single most-asked question about this layer, answered where it
          is asked rather than in a doc nobody opens. */}
      <DaylightPanel
        title={L("لماذا شكل محدَّد مسبقاً، لا حلقة", "Why a predetermined shape, not a loop")}
        aside={
          <span className="vo-note">
            {L("الشكل يُقرَّر قبل أول رمز.", "The shape is decided before the first token.")}
          </span>
        }
      >
        <div className="ex-grid">
          <div className="ex-card">
            <h4>{L("الحلقة", "The loop")}</h4>
            <p>
              {L(
                "النموذج يقرّر الخطوة التالية في كل دورة. مرن — لكنه يتوقّف عن التقدّم إن لم يطلب أداة، وهذا بالضبط ما تفعله النماذج الصغيرة المحلية: تجيب نثراً بلا استدعاء، فتتحوّل الحلقة إلى ردّ واحد بلا أساس.",
                "The model decides the next step each round. Flexible — but it only advances if it asks for a tool, and that is exactly what small local models fail to do: they answer in prose without calling anything, so the loop collapses into one ungrounded reply.",
              )}
            </p>
          </div>
          <div className="ex-card">
            <h4>{L("الرسم", "The graph")}</h4>
            <p>
              {L(
                "الكود يختار الأدوات قبل بدء التشغيل، ويشغّل المستقلّ منها دفعة واحدة، ثم يعطي النموذج النتائج ليستنتج فقط. الكلفة معروفة قبل الإنفاق، والنموذج الضعيف يظلّ مؤسَّساً على وقائع.",
                "Our code picks the tools before the run starts, fires the independent ones at once, and hands the model results to reason over. The cost is known before it is spent, and even a weak model stays grounded in facts.",
              )}
            </p>
          </div>
          <div className="ex-card">
            <h4>{L("ما بقي حلقةً عمداً", "What stays a loop, deliberately")}</h4>
            <p>
              {L(
                "الأنماط التي لا تُعرف مهامّها إلا أثناء التشغيل (منسّق، ذاتي التشغيل) تبقى على الحلقة: رسمُ شكلٍ ثابتٍ لخطّة تُكتشف لاحقاً كذبٌ على الخطة. والمجلس يبقى مجلساً — فهو أصلاً رسم: تفرّع ثم ترجيح.",
                "Shapes whose subtasks are only knowable at runtime (orchestrate, autonomous) keep the loop: drawing a fixed shape over a plan discovered later is a lie about the plan. And the council stays the council — it already is a graph: fan out, then reconcile.",
              )}
            </p>
          </div>
        </div>
      </DaylightPanel>

      {/* ── The roster, in one table ──────────────────────────────── */}
      <DaylightPanel
        title={L("من يعمل عندك", "Who works for you")}
        aside={
          <span className="vo-note">
            {L(
              "إضافة دور = ملف تعليمات واحد + سطر تسجيل.",
              "Adding a role = one instruction file plus one registry line.",
            )}
          </span>
        }
      >
        <table className="vo-table">
          <thead>
            <tr>
              <th>{L("الدور", "Role")}</th>
              <th>{L("القطاع", "Sector")}</th>
              <th>{L("النمط", "Topology")}</th>
              <th>{L("ما يستطيع استدعاءه", "What it may call")}</th>
            </tr>
          </thead>
          <tbody>
            {VOAC_ROLES.map((r) => (
              <tr key={r.id}>
                <td>{ar ? r.labelAr : r.labelEn}</td>
                <td className="om-mono om-dim">{r.sector}</td>
                <td className="om-mono">{r.defaultTopology}</td>
                <td>
                  <span className="om-tools">
                    {r.tools.map((t) => (
                      <span key={t} className="om-tool">{t}</span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DaylightPanel>

      {/* ── What it is NOT ────────────────────────────────────────── */}
      <DaylightPanel title={L("ما ليس هذا النظام", "What this is not")}>
        <ul className="ex-nots">
          <li>
            {L(
              "ليس بديلاً عن مديريك. الوكيل يرفع سؤالاً؛ القرار يبقى لصاحبه.",
              "Not a replacement for your managers. The agent raises a question; the decision stays with the person who owns it.",
            )}
          </li>
          <li>
            {L(
              "ليس لوحة مؤشرات. اللوحة تعرض ما حدث؛ هذا يقترح ما يُفعَل.",
              "Not a dashboard. A dashboard shows what happened; this proposes what to do.",
            )}
          </li>
          <li>
            {L(
              "ليس آلياً بالكامل. الحلقة تُغلَق بيد إنسان، عمداً.",
              "Not fully automatic. The loop closes on a human hand, deliberately.",
            )}
          </li>
          <li>
            {L(
              "ليس نبوءة. القيمة المُقدَّرة تقدير — ولهذا يُسجَّل الفعلي بجانبها.",
              "Not a prophecy. The estimated value is an estimate — which is exactly why the realized figure is recorded beside it.",
            )}
          </li>
        </ul>
      </DaylightPanel>
    </DaylightShell>
  );
}
