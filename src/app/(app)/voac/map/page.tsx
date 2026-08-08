import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { loadOrgMap } from "@/lib/voac/orgMap.live";
import {
  stateMeta,
  pipelineFor,
  runtimeChildren,
  runtimeChildKindLabel,
  type AgentNode,
} from "@/lib/voac/orgMap";
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

/** The run pipeline, rendered as an ordered strip of steps. */
function Pipeline({ topology, ar }: { topology: string; ar: boolean }) {
  const steps = pipelineFor(topology);
  return (
    <div className="om-pipe" aria-label={ar ? "مسار التشغيل" : "Run pipeline"}>
      {steps.map((step, i) => (
        <span key={step.en} className="contents">
          <span
            className={`om-pipe-step${i === 0 ? " om-pipe-step-in" : ""}${
              i === steps.length - 1 ? " om-pipe-step-out" : ""
            }`}
            style={{ animationDelay: `${i * 320}ms` }}
          >
            {ar ? step.ar : step.en}
          </span>
          {i < steps.length - 1 ? (
            <span className="om-pipe-arrow" aria-hidden>{ar ? "←" : "→"}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/**
 * The layer BELOW the org chart: what this node expands into when it runs.
 *
 * This is the part an org chart normally hides. A box labelled "Group Broker"
 * tells you nothing about the six agents that actually convene inside it; the
 * whole point of the map is that you can see them.
 */
function RuntimeTree({ node, ar }: { node: Pick<AgentNode, "topology" | "tools">; ar: boolean }) {
  const kids = runtimeChildren(node);
  if (kids.length === 0) return null;
  const isCouncil = node.topology === "parallel";

  return (
    <div className="om-runtime">
      <div className="om-runtime-label">
        {isCouncil
          ? (ar
              ? `يستدعي مجلساً — ${kids.length - 1} أصوات تتحدّث بالتوازي، ثم مُيَسّر يرجّح`
              : `Convenes a council — ${kids.length - 1} voices argue in parallel, then a moderator reconciles`)
          : (ar
              ? `يستدعي ${kids.length} أدوات في حلقة الأدوات`
              : `Calls ${kids.length} tools in the tool loop`)}
      </div>
      <div className={`om-tree om-tree-leaf${isCouncil ? " om-tree-council" : ""}`}>
        {kids.map((k, i) => {
          // The gloss is only rendered where it ADDS something. Five sibling
          // rows each captioned "council voice" is five copies of the heading
          // above them; the moderator is the one child that behaves
          // differently, so it is the one that says so.
          const gloss = k.kind === "moderator" ? runtimeChildKindLabel(k.kind) : null;
          return (
            <div
              key={k.id}
              className={`om-node om-leaf om-leaf-${k.kind}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="om-leaf-name">{ar ? k.ar : k.en}</span>
              {gloss ? <span className="om-leaf-role">{ar ? gloss.ar : gloss.en}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One agent node — identity, live state, the pipeline it runs, what it convenes. */
function AgentNodeCard({ node, ar, delay }: { node: AgentNode; ar: boolean; delay: number }) {
  const m = stateMeta(node.state);
  const version = skillVersionFor(node.roleId);
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  return (
    <div className="om-node" style={{ animationDelay: `${delay}ms` }}>
      <div className={`om-agent om-${m.tone}`} title={`${node.labelEn} · ${node.topology}`}>
        <div className="om-agent-top">
          <span className={`om-dot om-dot-${m.tone}`} aria-hidden />
          <span className="om-agent-name">{ar ? node.labelAr : node.labelEn}</span>
          <span className={`om-chip om-chip-${m.tone}`}>{ar ? m.ar : m.en}</span>
        </div>

        <div className="om-agent-meta">
          <span className="om-mono">{node.topology}</span>
          <span className="om-sep">·</span>
          <span className="om-mono om-dim">{node.skillDocId}.md @ {version}</span>
          <span className="om-sep">·</span>
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

        <Pipeline topology={node.topology} ar={ar} />
        <RuntimeTree node={node} ar={ar} />

        <details className="om-more">
          <summary>{L("لماذا يعمل هكذا", "Why it runs this way")}</summary>
          <div className="om-more-body">
            <div className="om-more-row">
              <span className="om-more-key">{L("النمط", "Topology")}</span>
              <span>{topologyWhy(node.topology, ar)}</span>
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
          </div>
        </details>
      </div>
    </div>
  );
}

export default async function VoacMapPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const L = <T,>(a: T, e: T) => (ar ? a : e);

  const map = await loadOrgMap();
  const bm = stateMeta(map.broker.state);
  const brokerKids = runtimeChildren(map.broker);

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
          "كل وكيل، وأين يقف، ومن يشرف على من — وما الذي يستدعيه حين يعمل.",
          "Every agent, where it sits, who supervises whom — and what it convenes when it runs.",
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
        <DaylightKpi
          label={L("وكلاء في الخريطة", "Agents on the chart")}
          value={map.totals.agents}
          hint={L("مشرف واحد فقط", "Exactly one supervisor")}
        />
        <DaylightKpi
          // "agents", not "voices": the count includes the Moderator, which
          // reconciles rather than argues. The broker card says "5 voices, then
          // a moderator" three lines below — a KPI that says 6 voices next to
          // it is a small lie on the one surface built to prove precision.
          label={L("وكلاء وقت التشغيل", "Run-time agents")}
          value={brokerKids.length}
          hint={L("يستدعيهم الوسيط عند كل قرار", "Convened by the broker on every decision")}
        />
        <DaylightKpi label={L("شركات مُغطّاة", "Companies covered")} value={map.totals.companies} />
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
        <div className="om-tier-root">
          <div className="om-root">
            <span className="om-root-name">
              {L("مجلس التشغيل الافتراضي", "Virtual Orchestration Agent Company")}
            </span>
            <span className="om-root-meta">
              {map.totals.agents} {L("وكيل", "agents")} · {map.totals.companies} {L("شركة", "companies")}
            </span>
          </div>
        </div>

        <div className="om-trunk" aria-hidden>
          <span className="om-trunk-line" />
          <span className="om-trunk-pulse" />
        </div>

        {/* Tier 1 — the only supervisor */}
        <div className="om-tier-label">{L("الطبقة ١ — الإشراف", "Tier 1 — supervision")}</div>
        <div className="om-tier-group">
          <div className={`om-broker om-${bm.tone}`}>
            <div className="om-broker-eyebrow">{L("المشرف الوحيد", "The only supervisor")}</div>
            <div className="om-broker-name">
              <span className={`om-dot om-dot-${bm.tone}`} aria-hidden />
              {ar ? map.broker.labelAr : map.broker.labelEn}
              <span className={`om-chip om-chip-${bm.tone}`}>{ar ? bm.ar : bm.en}</span>
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
              <span className="om-mono om-dim">{map.broker.skillDocId}.md</span>
            </div>
            <Pipeline topology={map.broker.topology} ar={ar} />
            <RuntimeTree node={map.broker} ar={ar} />
          </div>
        </div>

        <div className="om-trunk" aria-hidden>
          <span className="om-trunk-line" />
          <span className="om-trunk-pulse" />
        </div>

        {/* Tier 2 — one branch per company, hanging off a single spine.
            A spine, not a grid: a wrapping grid puts row 2 under nothing, and
            a connector that points at empty space is what makes an org chart
            read as a pile of cards. */}
        <div className="om-tier-label">
          {L("الطبقة ٢ — فرق الشركات", "Tier 2 — company rosters")}
        </div>
        {map.branches.length === 0 ? (
          <p className="vo-empty">{L("لا شركات مُغطّاة بعد.", "No companies covered yet.")}</p>
        ) : (
          <div className="om-tree om-tree-root">
            {map.branches.map((b, bi) => (
              <section
                key={b.companyId}
                className={`om-node om-branch${b.pendingProposals > 0 ? " om-branch-hot" : ""}`}
                style={{ animationDelay: `${120 + bi * 70}ms` }}
              >
                <header className="om-branch-head">
                  <span className="om-branch-code">{b.code}</span>
                  <span className="om-branch-name">{b.name}</span>
                  <span className="om-branch-sector">{b.sector}</span>
                  <span className="om-branch-count">
                    {b.agents.length} {L("وكيل", b.agents.length === 1 ? "agent" : "agents")}
                  </span>
                  {b.pendingProposals > 0 ? (
                    <span className="om-chip om-chip-waiting">
                      {b.pendingProposals} {L("بانتظارك", "waiting")}
                    </span>
                  ) : null}
                </header>
                <div className="om-tree om-tree-branch">
                  {b.agents.map((a, ai) => (
                    <AgentNodeCard key={a.roleId} node={a} ar={ar} delay={160 + bi * 70 + ai * 50} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

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
