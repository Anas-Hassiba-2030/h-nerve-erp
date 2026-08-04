import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { formatShortDate } from "@/lib/utils/utils";
import { runStatusLabel, stepKindLabel, scoreLabel, valueLabel } from "@/lib/voac/present";
import { skillVersionFor, getRole } from "@/lib/voac/roles";
import "../../daylight.css";
import "../voac.css";

export const dynamic = "force-dynamic";

export default async function VoacRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  // The scoped client returns null for another tenant's run, so this is the
  // authorization check as well as the lookup.
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: {
      steps: { orderBy: { seq: "asc" } },
      proposals: true,
    },
  });

  if (!run) notFound();

  const st = runStatusLabel(run.status);
  const role = getRole(run.roleId);
  const currentVersion = skillVersionFor(run.roleId);
  const drifted = currentVersion !== "unknown" && currentVersion !== run.skillVersion;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"} wide>
      <DaylightHeader
        eyebrow={
          <Link href="/voac" className="vo-link vo-back">
            <ArrowLeft size={13} /> {L("عودة إلى السجل", "Back to the ledger")}
          </Link>
        }
        title={role ? (ar ? role.labelAr : role.labelEn) : run.roleId}
        subtitle={run.objective}
        status={<span className={`vo-tag vo-${st.tone}`}>{ar ? st.ar : st.en}</span>}
      />

      <DaylightPanel title={L("بطاقة التشغيل", "Run card")}>
        <table className="vo-table vo-kv">
          <tbody>
            <tr>
              <th>{L("النطاق", "Scope")}</th>
              <td>
                {run.companyId === null
                  ? L("المجموعة — وسيط بين الشركات", "Group — brokering across companies")
                  : L("شركة واحدة", "A single company")}
              </td>
            </tr>
            <tr>
              <th>{L("النمط", "Topology")}</th>
              <td className="vo-mono">{run.topology}</td>
            </tr>
            <tr>
              <th>{L("إصدار وثيقة المهارة", "Skill document version")}</th>
              <td className="vo-mono">
                {run.skillVersion}
                {drifted ? (
                  <span className="vo-tag vo-warn vo-inline">
                    {L(
                      `تغيّرت الوثيقة منذ التشغيل (الآن ${currentVersion})`,
                      `document changed since this run (now ${currentVersion})`,
                    )}
                  </span>
                ) : null}
              </td>
            </tr>
            <tr>
              <th>{L("التكلفة", "Cost")}</th>
              <td className="vo-mono">
                {run.llmCalls} {L("نداء", "calls")} · {run.tokensIn + run.tokensOut} {L("رمز", "tokens")} ·{" "}
                {run.latencyMs} ms
              </td>
            </tr>
            <tr>
              <th>{L("التوقيت", "Timing")}</th>
              <td>
                {formatShortDate(run.createdAt)}
                {run.endedAt ? ` → ${formatShortDate(run.endedAt)}` : ""}
              </td>
            </tr>
            {run.error ? (
              <tr>
                <th>{L("السبب", "Reason")}</th>
                <td className="vo-err">{run.error}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DaylightPanel>

      <DaylightPanel
        title={L("أثر التنفيذ", "Execution trace")}
        aside={
          <span className="vo-note">
            {L(
              "كل خطوة كما حدثت — بما فيها ما رفضه النظام.",
              "Every step as it happened — including what the system refused.",
            )}
          </span>
        }
      >
        {run.steps.length === 0 ? (
          <p className="vo-empty">
            {L(
              "لا خطوات — رُفض التشغيل قبل إنفاق أي رمز.",
              "No steps — the run was refused before spending a token.",
            )}
          </p>
        ) : (
          <ol className="vo-trace">
            {run.steps.map((s) => {
              const k = stepKindLabel(s.kind);
              const sc = scoreLabel(s.score, s.scoredBy);
              return (
                <li key={s.id} className={`vo-step vo-step-${s.kind}`}>
                  <div className="vo-step-head">
                    <span className="vo-seq">{s.seq}</span>
                    <span className="vo-kind">{ar ? k.ar : k.en}</span>
                    <span className="vo-mono vo-dim">{s.roleId}</span>
                    <span className={`vo-tag vo-${sc.tone}`}>{ar ? sc.text.ar : sc.text.en}</span>
                  </div>
                  <div className="vo-step-io">
                    <div className="vo-io-label">{L("المُدخل", "in")}</div>
                    <pre className="vo-pre">{s.input}</pre>
                  </div>
                  {s.output ? (
                    <div className="vo-step-io">
                      <div className="vo-io-label">{L("المُخرج", "out")}</div>
                      <pre className="vo-pre">{s.output}</pre>
                    </div>
                  ) : null}
                  {s.error ? <div className="vo-err">{s.error}</div> : null}
                </li>
              );
            })}
          </ol>
        )}
      </DaylightPanel>

      <DaylightPanel title={L("ما طُلب من إنسان", "What a human was asked to do")}>
        {run.proposals.length === 0 ? (
          <p className="vo-empty">
            {L(
              "لم يُطلب شيء. لا شيء يستحق انتباهك إجابةٌ صحيحة.",
              "Nothing was asked. Having nothing worth your attention is a correct answer.",
            )}
          </p>
        ) : (
          <ul className="vo-list">
            {run.proposals.map((p) => (
              <li key={p.id} className="vo-card vo-card-flat">
                <div className="vo-card-head">
                  <h3>{p.title}</h3>
                  <span className="vo-tag">{valueLabel(p.estimatedValueJod, ar ? "ar" : "en")}</span>
                </div>
                <p className="vo-rationale">{p.rationale}</p>
              </li>
            ))}
          </ul>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
