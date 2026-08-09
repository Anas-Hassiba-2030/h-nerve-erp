import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
// CROSS-TENANT INTENT: see the note in ../page.tsx — VOAC is group-wide by
// design (the Group Broker's whole purpose is cross-company), so a run must
// remain reachable regardless of which tenant is currently pinned in the
// operator's cookie. This also means the tenant cookie is no longer an
// authorization boundary for this lookup — /voac's own MANAGER+ role gate
// (permissions.ts) is what protects the page, not the scoped client.
import { prismaUnscoped as prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { formatShortDate } from "@/lib/utils/utils";
import {
  runStatusLabel, stepKindLabel, scoreLabel, valueLabel, traceLanes, parallelSaving, topologyWhy,
} from "@/lib/voac/present";
import { skillVersionFor, getRole } from "@/lib/voac/roles";
import "../../daylight.css";
import "../voac.css";

export const dynamic = "force-dynamic";

export default async function VoacRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

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
  // Drawn from the STEPS, never from the spec: a chart built from the intended
  // shape stays pretty while a node fails, which is the one picture an operator
  // must never be shown.
  const lanes = traceLanes(run.steps);
  const saving = parallelSaving(lanes);
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
              <td>
                <span className="vo-mono">{run.topology}</span>
                {/* The shape used to arrive as an unexplained keyword. The
                    selector's own comment says a manager should be able to
                    disagree with it — which needs the reason on the page. */}
                <div className="vo-why">{topologyWhy(run.topology, ar ? "ar" : "en")}</div>
              </td>
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
        {lanes.length === 0 ? (
          <p className="vo-empty">
            {L(
              "لا خطوات — رُفض التشغيل قبل إنفاق أي رمز.",
              "No steps — the run was refused before spending a token.",
            )}
          </p>
        ) : (
          <>
            {saving ? (
              <p className="vg-saving">
                {L(
                  `العُقد المتوازية وفّرت ${saving.savedMs} م.ث — ${saving.actualMs} م.ث بدل ${saving.serialMs} لو نُفِّذت واحدة تلو الأخرى.`,
                  `Running those nodes at once took ${saving.actualMs} ms instead of ${saving.serialMs} ms — ${saving.savedMs} ms saved.`,
                )}
              </p>
            ) : null}

            <ol className="vg-graph">
              {lanes.map((lane, i) => (
                <li key={`${lane.id}-${i}`} className={`vg-lane${lane.parallel ? " vg-lane-par" : ""}`}>
                  <div className="vg-lane-head">
                    <span className="vg-lane-no">{i + 1}</span>
                    <span className="vg-lane-name">{ar ? lane.ar : lane.en}</span>
                    {lane.parallel ? (
                      <span className="vg-badge">
                        {L(`${lane.steps.length} معاً`, `${lane.steps.length} at once`)}
                      </span>
                    ) : null}
                    <span className="vg-lane-ms">{lane.latencyMs} ms</span>
                  </div>

                  <div className="vg-nodes">
                    {lane.steps.map((s) => {
                      const k = stepKindLabel(s.kind);
                      const sc = scoreLabel(s.score, s.scoredBy);
                      const title = s.input.split("(")[0].trim() || (ar ? k.ar : k.en);
                      return (
                        <details
                          key={s.id}
                          className={`vg-node vg-node-${s.kind}${s.error ? " vg-node-bad" : ""}`}
                        >
                          <summary className="vg-node-head">
                            <span className="vg-node-kind">{ar ? k.ar : k.en}</span>
                            <span className="vg-node-title">{title.slice(0, 46)}</span>
                            {s.latencyMs ? <span className="vg-node-ms">{s.latencyMs} ms</span> : null}
                          </summary>
                          <div className="vg-node-body">
                            {s.roleId !== run.roleId ? (
                              <div className="vo-mono vo-dim">{s.roleId}</div>
                            ) : null}
                            {sc.trustworthy || s.score !== null ? (
                              <span className={`vo-tag vo-${sc.tone}`}>{ar ? sc.text.ar : sc.text.en}</span>
                            ) : null}
                            <div className="vo-io-label">{L("المُدخل", "in")}</div>
                            <pre className="vo-pre">{s.input}</pre>
                            {s.output ? (
                              <>
                                <div className="vo-io-label">{L("المُخرج", "out")}</div>
                                <pre className="vo-pre">{s.output}</pre>
                              </>
                            ) : null}
                            {s.error ? <div className="vo-err">{s.error}</div> : null}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
          </>
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
