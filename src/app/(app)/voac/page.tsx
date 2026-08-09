import Link from "next/link";
// CROSS-TENANT INTENT: the VOAC ledger is group-wide by design — the Group
// Broker (companyId=null) exists specifically to broker value BETWEEN
// companies, and a manager reviewing one company's roster still needs to see
// the group-scope proposals that concern it. Scoping this page by the
// operator's currently-pinned tenant cookie (the ordinary `prisma` client)
// silently empties it the moment that cookie points anywhere other than the
// tenant the seed happened to use — which is exactly what happened here: the
// data was never missing, this page just couldn't see past the cookie.
import { prismaUnscoped as prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { formatShortDate } from "@/lib/utils/utils";
import {
  runStatusLabel, proposalStatusLabel, confidenceBand, valueLabel, realizedDelta,
} from "@/lib/voac/present";
import { decideProposal, recordOutcome } from "./actions";
import "../daylight.css";
import "./voac.css";

export const dynamic = "force-dynamic";

export default async function VoacPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [pending, decided, runs, runCount, acceptedAgg, realizedAgg] = await Promise.all([
    prisma.agentProposal.findMany({
      where: { status: "PENDING" },
      orderBy: [{ estimatedValueJod: "desc" }, { createdAt: "desc" }],
      take: 25,
      include: { run: { select: { roleId: true, companyId: true, topology: true } } },
    }),
    prisma.agentProposal.findMany({
      where: { status: { in: ["ACCEPTED", "REJECTED"] } },
      orderBy: { decidedAt: "desc" },
      take: 12,
    }),
    prisma.agentRun.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.agentRun.count({ where: { createdAt: { gte: since } } }),
    prisma.agentProposal.count({ where: { status: "ACCEPTED" } }),
    prisma.agentProposal.aggregate({ _sum: { realizedValueJod: true }, where: { realizedValueJod: { not: null } } }),
  ]);

  const decidedCount = decided.length;
  const acceptRate = decidedCount > 0 ? Math.round((acceptedAgg / Math.max(1, acceptedAgg + decided.filter((d) => d.status === "REJECTED").length)) * 100) : null;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"} wide>
      <DaylightHeader
        eyebrow={L("شركة الوكلاء", "Agent company")}
        title={L("مجلس التشغيل الافتراضي", "Virtual Orchestration Agent Company")}
        subtitle={L(
          "الوكلاء يقترحون. أنت من يقرّر. كل قرار يُسجَّل باسم صاحبه.",
          "The agents propose. You decide. Every decision is recorded against a name.",
        )}
        actions={
          <span className="vo-header-links">
            <Link href="/voac/map" className="vo-map-cta">
              <span className="vo-map-cta-dot" aria-hidden />
              {L("خريطة التنسيق الكاملة", "Full orchestration map")}
              <span className="vo-map-cta-arrow" aria-hidden>{ar ? "←" : "→"}</span>
            </Link>
            <Link href="/voac/how" className="vo-ghost-btn">
              {L("كيف يعمل النظام", "How it works")}
            </Link>
            <Link href="/voac/stack" className="vo-ghost-btn">
              {L("البنية التقنية", "The stack")}
            </Link>
          </span>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi
          label={L("بانتظار قرارك", "Awaiting your decision")}
          value={pending.length}
          hint={L("مُرتَّبة بالقيمة المتوقعة", "Ranked by expected value")}
        />
        <DaylightKpi
          label={L("تشغيلات (٣٠ يوماً)", "Runs (30 days)")}
          value={runCount}
        />
        <DaylightKpi
          label={L("نسبة القبول", "Accept rate")}
          value={acceptRate === null ? "—" : `${acceptRate}%`}
          hint={acceptRate === null ? L("لا قرارات بعد", "No decisions yet") : undefined}
        />
        <DaylightKpi
          label={L("قيمة محقَّقة فعلياً", "Realized value")}
          value={valueLabel(realizedAgg._sum.realizedValueJod, ar ? "ar" : "en")}
          hint={L("مقيسة بعد التنفيذ — لا تقديرات", "Measured after the fact — not estimates")}
        />
      </DaylightKpiGrid>

      {/* ── How this works / what it runs on ────────────────────────
          Asked for twice as a SECTION beside the agent company, not a link.
          The depth still lives on /voac/how and /voac/stack; what belongs
          here is enough to answer "what am I looking at" without leaving. */}
      <div className="vo-explain">
        <section className="vo-explain-card">
          <h2>{L("كيف يعمل هذا", "How this works")}</h2>
          <p>
            {L(
              "الوكلاء يقرأون بياناتك، ويكتبون مقترحاً واحداً حين يستحق الأمر قراراً، ثم يتوقّفون. لا ينفّذون شيئاً بأنفسهم — القرار لك، ويُسجَّل باسمك.",
              "The agents read your data, write one proposal when something warrants a decision, then stop. They never act on their own — the decision is yours, and it is recorded against your name.",
            )}
          </p>
          <ul className="vo-explain-list">
            <li>
              <b>{L("مجلس", "A council")}</b>
              {L(
                " — حين تتنازع شركتان، تُطرح المواقف بالتوازي ثم تُرجَّح، بدل أن يقرّر صوت واحد عن الطرفين.",
                " — when two companies' interests collide, the positions are argued in parallel and reconciled instead of one voice deciding for both.",
              )}
            </li>
            <li>
              <b>{L("رسم محدَّد مسبقاً", "A predetermined graph")}</b>
              {L(
                " — للأسئلة الواضحة: الكود يختار الأدوات ويجلب الوقائع، والنموذج يستنتج فوقها فقط.",
                " — for clear questions: our code picks the tools and fetches the facts, and the model only reasons over them.",
              )}
            </li>
            <li>
              <b>{L("حلقة أدوات", "A tool loop")}</b>
              {L(
                " — فقط حين لا تُعرف الخطوات إلا أثناء التشغيل.",
                " — only where the steps are unknowable until the work starts.",
              )}
            </li>
          </ul>
          <Link href="/voac/how" className="vo-explain-more">
            {L("التفصيل الكامل ←", "The full explanation →")}
          </Link>
        </section>

        <section className="vo-explain-card">
          <h2>{L("على ماذا يعمل", "What it runs on")}</h2>
          <p>
            {L(
              "سبع أدوات يقرأ بها الدماغ قاعدة بياناتك: الوقائع، الرسم السببي، المحاكاة، الذاكرة، المستندات، المجلس، والصياغة. لا يكتب أيٌّ منها في جداول عملك.",
              "Seven tools the brain reads your database with: facts, the causal graph, simulation, memory, documents, the council, and narration. None of them writes to your operating tables.",
            )}
          </p>
          <ul className="vo-explain-list">
            <li>
              <b>{L("ثلاثة مكابح", "Three brakes")}</b>
              {L(
                " — سقف لكل نمط، وميزانية يومية لكل مستأجر، وحدّ أعلى لما يصل إلى إنسان.",
                " — a ceiling per shape, a daily budget per tenant, and a hard cap on what reaches a human.",
              )}
            </li>
            <li>
              <b>{L("نموذج على جهازك", "A model on your machine")}</b>
              {L(
                " — يمكن تشغيل الاستدلال محلياً بلا مفتاح واجهة برمجية (بيئة التطوير).",
                " — inference can run locally with no API key (development only).",
              )}
            </li>
          </ul>
          <Link href="/voac/stack" className="vo-explain-more">
            {L("كل المكتبات المستخدمة ←", "Every library used →")}
          </Link>
        </section>
      </div>

      {/* ── The queue ─────────────────────────────────────────────── */}
      <DaylightPanel
        title={L("طابور المقترحات", "The proposal queue")}
        aside={
          <span className="vo-note">
            {L(
              "محدود يومياً بالتصميم — الدقّة هي المنتج، لا الكثرة.",
              "Capped daily by design — precision is the product, not volume.",
            )}
          </span>
        }
      >
        {pending.length === 0 ? (
          <p className="vo-empty">
            {L(
              "لا شيء بانتظارك. طابور فارغ إجابة صحيحة وشائعة — لا يعني أن النظام متوقف.",
              "Nothing waiting. An empty queue is a valid and common answer — it does not mean the system is idle.",
            )}
          </p>
        ) : (
          <ul className="vo-list">
            {pending.map((p) => {
              // The agent's OWN stated confidence — the number budget.ts ranked
              // this proposal by. Shown next to the value so "why is this one
              // first?" is answerable, and shown as "not stated" when the agent
              // never claimed one.
              const band = confidenceBand(p.confidence);
              return (
                <li key={p.id} className="vo-card">
                  <div className="vo-card-head">
                    <h3>{p.title}</h3>
                    <span className="vo-tag">
                      {valueLabel(p.estimatedValueJod, ar ? "ar" : "en")}
                    </span>
                  </div>
                  <div className="vo-conf">
                    <span className={`vo-tag vo-${band.tone}`}>{ar ? band.ar : band.en}</span>
                  </div>
                  <p className="vo-rationale">{p.rationale}</p>
                  <div className="vo-meta">
                    <span>{p.run?.roleId}</span>
                    <span>·</span>
                    <span>{p.run?.topology}</span>
                    {p.counterpartyCompanyId ? (
                      <>
                        <span>·</span>
                        <span className="vo-cross">
                          {L("بين شركتين", "cross-company")} → {p.counterpartyCompanyId}
                        </span>
                      </>
                    ) : null}
                    <span>·</span>
                    <span>{formatShortDate(p.createdAt)}</span>
                  </div>

                  <form action={decideProposal} className="vo-decide">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="note"
                      className="input vo-note-input"
                      placeholder={L(
                        "السبب (مطلوب عند الرفض) — خاطئ؟ نعرفه؟ غير ممكن الآن؟",
                        "Reason (required to reject) — wrong? already knew? not possible now?",
                      )}
                      maxLength={1000}
                    />
                    <button
                      type="submit"
                      name="decision"
                      value="ACCEPTED"
                      className="btn btn-primary vo-btn"
                    >
                      {L("أوافق", "Accept")}
                    </button>
                    <button type="submit" name="decision" value="REJECTED" className="btn vo-btn">
                      {L("أرفض", "Reject")}
                    </button>
                  </form>
                  <p className="vo-fineprint">
                    {L(
                      "القبول يسجّل قرارك فقط — التنفيذ يتم من الوحدة المعنية.",
                      "Accepting records your decision only — carrying it out happens in the relevant module.",
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </DaylightPanel>

      {/* ── Decided, with outcomes ────────────────────────────────── */}
      <DaylightPanel title={L("قرارات سابقة", "Recent decisions")}>
        {decided.length === 0 ? (
          <p className="vo-empty">{L("لا قرارات بعد.", "No decisions yet.")}</p>
        ) : (
          <table className="vo-table">
            <thead>
              <tr>
                <th>{L("المقترح", "Proposal")}</th>
                <th>{L("القرار", "Decision")}</th>
                <th>{L("السبب", "Reason")}</th>
                <th>{L("مُقدَّر", "Estimated")}</th>
                <th>{L("فعلي", "Realized")}</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((d) => {
                const st = proposalStatusLabel(d.status);
                const delta = realizedDelta(d.estimatedValueJod, d.realizedValueJod);
                return (
                  <tr key={d.id}>
                    <td>{d.title}</td>
                    <td>
                      <span className={`vo-tag vo-${st.tone}`}>{ar ? st.ar : st.en}</span>
                    </td>
                    <td className="vo-reason">
                      {d.decisionNote || <em>{L("بلا سبب مسجَّل", "no reason recorded")}</em>}
                    </td>
                    <td>{valueLabel(d.estimatedValueJod, ar ? "ar" : "en")}</td>
                    <td>
                      {d.realizedValueJod === null ? (
                        d.status === "ACCEPTED" ? (
                          <form action={recordOutcome} className="vo-outcome">
                            <input type="hidden" name="id" value={d.id} />
                            <input
                              name="realizedValueJod"
                              type="number"
                              step="1"
                              className="input vo-outcome-input"
                              placeholder={L("القيمة الفعلية", "actual")}
                            />
                            <button className="btn vo-btn-sm">{L("سجّل", "Record")}</button>
                          </form>
                        ) : (
                          <span className="vo-muted">—</span>
                        )
                      ) : (
                        <>
                          {valueLabel(d.realizedValueJod, ar ? "ar" : "en")}
                          {delta ? (
                            <span className={`vo-delta vo-${delta.tone}`}>
                              {delta.pct >= 0 ? "+" : ""}
                              {delta.pct}%
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DaylightPanel>

      {/* ── The ledger ────────────────────────────────────────────── */}
      <DaylightPanel
        title={L("سجلّ التشغيل", "Run ledger")}
        aside={
          <span className="vo-note">
            {L("الرفض سطر في السجل، لا صمت.", "A refusal is a row in the ledger, not silence.")}
          </span>
        }
      >
        {runs.length === 0 ? (
          <p className="vo-empty">{L("لا تشغيلات بعد.", "No runs yet.")}</p>
        ) : (
          <table className="vo-table">
            <thead>
              <tr>
                <th>{L("الدور", "Role")}</th>
                <th>{L("النطاق", "Scope")}</th>
                <th>{L("النمط", "Topology")}</th>
                <th>{L("الحالة", "Status")}</th>
                <th>{L("نداءات النموذج", "LLM calls")}</th>
                <th>{L("التاريخ", "When")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const st = runStatusLabel(r.status);
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/voac/${r.id}`} className="vo-link">
                        {r.roleId}
                      </Link>
                    </td>
                    <td>
                      {r.companyId === null ? (
                        <span className="vo-group">{L("المجموعة", "Group")}</span>
                      ) : (
                        <span className="vo-muted">{L("شركة", "Company")}</span>
                      )}
                    </td>
                    <td className="vo-mono">{r.topology}</td>
                    <td>
                      <span className={`vo-tag vo-${st.tone}`}>{ar ? st.ar : st.en}</span>
                      {r.error ? <div className="vo-err">{r.error}</div> : null}
                    </td>
                    <td className="vo-mono">{r.llmCalls}</td>
                    <td>{formatShortDate(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
