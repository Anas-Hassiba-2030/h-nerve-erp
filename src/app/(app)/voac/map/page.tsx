import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { loadOrgMap } from "@/lib/voac/orgMap.live";
import { stateMeta, pipelineFor, type AgentNode } from "@/lib/voac/orgMap";
import { skillVersionFor } from "@/lib/voac/roles";
import { formatShortDate } from "@/lib/utils/utils";
import "../../daylight.css";
import "../voac.css";
import "./map.css";

export const dynamic = "force-dynamic";

/** Plain-language gloss of each topology — why this agent runs the way it does. */
function topologyWhy(topology: string, ar: boolean): string {
  switch (topology) {
    case "parallel":
      return ar
        ? "عمل عابر للشركات = أهداف متنافسة. المواقف تُطرح بالتوازي ثم تُرجَّح، بدل أن يقرّر صوت واحد بهدوء عن الطرفين."
        : "Cross-company work means competing objectives. Positions are argued in parallel and reconciled, rather than one voice quietly deciding for both.";
    case "chain":
      return ar
        ? "كل خطوة تعتمد على التي قبلها، فتُنفَّذ بالتسلسل — التوازي هنا يعني الاستنتاج قبل وصول الوقائع."
        : "Each step depends on the one before it, so they run in sequence — parallelising here would mean reasoning before the facts land.";
    case "route":
      return ar
        ? "سؤال واحد واضح: يُصنَّف، ثم يُوجَّه إلى الأداة المناسبة له وحدها. أرخص نمط، ويكفي لأغلب الأسئلة."
        : "One clear question: classify it, then send it to the single tool that answers it. The cheapest pattern, and enough for most questions.";
    default:
      return "";
  }
}

/** One agent card — identity, live state, the pipeline it runs, and the detail on demand. */
function AgentCard({ node, ar, delay }: { node: AgentNode; ar: boolean; delay: number }) {
  const m = stateMeta(node.state);
  const version = skillVersionFor(node.roleId);
  const pipeline = pipelineFor(node.topology);
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  return (
    <div
      className={`om-agent om-${m.tone}`}
      style={{ animationDelay: `${delay}ms` }}
      title={`${node.labelEn} · ${node.topology}`}
    >
      <div className="om-agent-top">
        <span className={`om-dot om-dot-${m.tone}`} aria-hidden />
        <span className="om-agent-name">{ar ? node.labelAr : node.labelEn}</span>
      </div>
      <div className="om-agent-state">{ar ? m.ar : m.en}</div>

      <div className="om-agent-meta">
        <span className="om-mono">{node.topology}</span>
        <span className="om-sep">·</span>
        <span className="om-mono om-dim">{version}</span>
      </div>

      <div className="om-agent-stats">
        <span>
          <b>{node.stats.runs}</b> {L("تشغيل", "runs")}
        </span>
        {node.stats.pendingProposals > 0 ? (
          <span className="om-pending">
            <b>{node.stats.pendingProposals}</b> {L("بانتظارك", "waiting")}
          </span>
        ) : null}
        {node.stats.lastRunAt ? (
          <span className="om-dim">{formatShortDate(node.stats.lastRunAt)}</span>
        ) : null}
      </div>

      {/* What one run of this agent actually does, in order. */}
      <div className="om-pipe" aria-label={L("مسار التشغيل", "Run pipeline")}>
        {pipeline.map((step, i) => (
          <span key={step.en} className="contents">
            <span
              className={`om-pipe-step${i === 0 ? " om-pipe-step-in" : ""}${
                i === pipeline.length - 1 ? " om-pipe-step-out" : ""
              }`}
              style={{ animationDelay: `${i * 320}ms` }}
            >
              {ar ? step.ar : step.en}
            </span>
            {i < pipeline.length - 1 ? (
              <span className="om-pipe-arrow" aria-hidden>{ar ? "←" : "→"}</span>
            ) : null}
          </span>
        ))}
      </div>

      <details className="om-more">
        <summary>{L("التفاصيل الكاملة", "Full detail")}</summary>
        <div className="om-more-body">
          <div className="om-more-row">
            <span className="om-more-key">{L("النمط", "Topology")}</span>
            <span>{topologyWhy(node.topology, ar)}</span>
          </div>
          <div className="om-more-row">
            <span className="om-more-key">{L("المهارة", "Skill doc")}</span>
            <span className="om-mono">
              {node.skillDocId}.md @ {version}
            </span>
          </div>
          <div className="om-more-row">
            <span className="om-more-key">{L("النطاق", "Scope")}</span>
            <span>
              {node.companyCode
                ? L(`شركة واحدة — ${node.companyCode}`, `One company — ${node.companyCode}`)
                : L("المجموعة كلها", "The whole group")}
            </span>
          </div>
          <div className="om-more-row">
            <span className="om-more-key">{L("آخر حالة", "Last status")}</span>
            <span className="om-mono">{node.stats.lastStatus ?? L("لم يعمل بعد", "never run")}</span>
          </div>
          <div className="om-more-row">
            <span className="om-more-key">{L("الأدوات", "Tools")}</span>
            <span>
              <span className="om-tools">
                {node.tools.map((t) => (
                  <span key={t} className="om-tool">{t}</span>
                ))}
              </span>
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}

export default async function VoacMapPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  const map = await loadOrgMap();
  const bm = stateMeta(map.broker.state);
  const brokerPipeline = pipelineFor(map.broker.topology);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"} wide>
      <DaylightHeader
        eyebrow={
          <Link href="/voac" className="vo-link vo-back">
            <ArrowLeft size={13} /> {L("عودة إلى الطابور", "Back to the queue")}
          </Link>
        }
        title={L("خريطة التنسيق", "The orchestration map")}
        subtitle={L(
          "كل وكيل، وأين يقف، ومن يشرف على من — وما الذي يفعله الآن.",
          "Every agent, where it sits, who supervises whom — and what it is doing right now.",
        )}
        actions={
          <span className="vo-header-links">
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
        <DaylightKpi label={L("وكلاء", "Agents")} value={map.totals.agents} hint={L("مشرف واحد فقط", "Exactly one supervisor")} />
        <DaylightKpi label={L("شركات مُغطّاة", "Companies covered")} value={map.totals.companies} />
        <DaylightKpi label={L("تشغيلات", "Runs")} value={map.totals.runs} />
        <DaylightKpi
          label={L("بانتظار قرار", "Awaiting a decision")}
          value={map.totals.pending}
          hint={map.totals.pending > 0 ? L("يوجد من ينتظرك", "Someone is waiting on you") : undefined}
        />
      </DaylightKpiGrid>

      {/* ── The chart ─────────────────────────────────────────────── */}
      <div className="om-chart" role="group" aria-label={L("خريطة الوكلاء", "Agent map")}>
        {/* Tier 0 — the company the chart is of */}
        <div className="om-tier-label">{L("الطبقة ٠ — الشركة", "Tier 0 — the company")}</div>
        <div className="om-tier om-tier-root">
          <div className="om-root">
            <span className="om-root-name">
              {L("مجلس التشغيل الافتراضي", "Virtual Orchestration Agent Company")}
            </span>
            <span className="om-root-meta">
              {map.totals.agents} {L("وكيل", "agents")} · {map.totals.companies} {L("شركة", "companies")}
            </span>
          </div>
        </div>

        <div className="om-trunk om-trunk-short" aria-hidden>
          <span className="om-trunk-line" />
          <span className="om-trunk-pulse" />
        </div>

        {/* Tier 1 — the only supervisor */}
        <div className="om-tier-label">{L("الطبقة ١ — الإشراف", "Tier 1 — supervision")}</div>
        <div className="om-tier om-tier-group">
          <div className={`om-broker om-${bm.tone}`}>
            <div className="om-broker-eyebrow">{L("المشرف الوحيد", "The only supervisor")}</div>
            <div className="om-broker-name">
              <span className={`om-dot om-dot-${bm.tone}`} aria-hidden />
              {ar ? map.broker.labelAr : map.broker.labelEn}
            </div>
            <div className="om-broker-why">
              {L(
                "يملك ما لا يملكه من تحته: رؤية عابرة للشركات، وصلاحية الترجيح بين ميزانيتين. لا يوجد مشرف لكل شركة عمداً — مشرف فوق وكلاء يشتركون في الشركة نفسها لا يملك معلومة ولا صلاحية تزيد عمّن تحته، فيكون مجرد ممرّ يكلّف خطوة.",
                "Holds what those below it do not: the cross-company view, and the standing to arbitrate between two P&Ls. There is deliberately no per-company supervisor — a supervisor over agents that share a company has neither information nor authority its subordinates lack, so it is a pass-through that costs a hop.",
              )}
            </div>
            <div className="om-broker-stats">
              <span><b>{map.broker.stats.runs}</b> {L("تشغيل", "runs")}</span>
              <span className="om-mono">{map.broker.topology}</span>
              <span className={`om-chip om-chip-${bm.tone}`}>{ar ? bm.ar : bm.en}</span>
            </div>
            <div className="om-pipe">
              {brokerPipeline.map((step, i) => (
                <span key={step.en} className="contents">
                  <span
                    className={`om-pipe-step${i === 0 ? " om-pipe-step-in" : ""}${
                      i === brokerPipeline.length - 1 ? " om-pipe-step-out" : ""
                    }`}
                    style={{ animationDelay: `${i * 320}ms` }}
                  >
                    {ar ? step.ar : step.en}
                  </span>
                  {i < brokerPipeline.length - 1 ? (
                    <span className="om-pipe-arrow" aria-hidden>{ar ? "←" : "→"}</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* The fan — one supervisor splitting out to every roster */}
        <div className="om-fan" aria-hidden>
          <span className="om-fan-drop" />
          <span className="om-fan-rail" />
          <span className="om-fan-charge" />
        </div>

        {/* Tier 2 — one branch per company */}
        <div className="om-tier-label">
          {L("الطبقة ٢ — فرق الشركات", "Tier 2 — company rosters")}
        </div>
        <div className="om-tier om-tier-branches">
          {map.branches.length === 0 ? (
            <p className="vo-empty">
              {L("لا شركات مُغطّاة بعد.", "No companies covered yet.")}
            </p>
          ) : (
            map.branches.map((b, bi) => (
              <section
                key={b.companyId}
                className={`om-branch${b.pendingProposals > 0 ? " om-branch-hot" : ""}`}
                style={{ animationDelay: `${160 + bi * 90}ms` }}
              >
                <header className="om-branch-head">
                  <span className="om-branch-code">{b.code}</span>
                  <span className="om-branch-name">{b.name}</span>
                  <span className="om-branch-sector">{b.sector}</span>
                  {b.pendingProposals > 0 ? (
                    <span className="om-chip om-chip-waiting">
                      {b.pendingProposals} {L("بانتظارك", "waiting")}
                    </span>
                  ) : null}
                </header>
                <div className="om-branch-agents">
                  {b.agents.map((a, ai) => (
                    <AgentCard key={a.roleId} node={a} ar={ar} delay={220 + bi * 90 + ai * 60} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Honest gap — companies the agent company cannot serve */}
        {map.totals.uncovered.length > 0 ? (
          <div className="om-uncovered">
            <span className="om-uncovered-label">
              {L("شركات بلا دور مطابق بعد", "Companies with no matching role yet")}
            </span>
            <div className="om-uncovered-list">
              {map.totals.uncovered.map((c) => (
                <span key={c} className="om-uncovered-chip">{c}</span>
              ))}
            </div>
            <p className="om-uncovered-note">
              {L(
                "تُعرَض هنا صراحةً — شركة بلا وكيل فجوة حقيقية، وإخفاؤها يجعل التغطية تبدو كاملة وهي ليست كذلك.",
                "Listed on purpose — a company with no agent is a real gap, and hiding it makes coverage look complete when it is not.",
              )}
            </p>
          </div>
        ) : null}
      </div>

      <p className="om-legend">
        {(["waiting", "attention", "active", "idle", "dormant"] as const).map((s) => {
          const m = stateMeta(s);
          return (
            <span key={s} className="om-legend-item">
              <span className={`om-dot om-dot-${m.tone}`} aria-hidden />
              {ar ? m.ar : m.en}
            </span>
          );
        })}
      </p>
    </DaylightShell>
  );
}
