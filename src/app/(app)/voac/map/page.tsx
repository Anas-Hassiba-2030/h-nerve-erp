import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { loadOrgMap } from "@/lib/voac/orgMap.live";
import { stateMeta, type AgentNode } from "@/lib/voac/orgMap";
import { skillVersionFor } from "@/lib/voac/roles";
import { formatShortDate } from "@/lib/utils/utils";
import "../../daylight.css";
import "../voac.css";
import "./map.css";

export const dynamic = "force-dynamic";

/** One agent card. The pulse only runs on states that actually want a human. */
function AgentCard({ node, ar, delay }: { node: AgentNode; ar: boolean; delay: number }) {
  const m = stateMeta(node.state);
  const version = skillVersionFor(node.roleId);
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
          <b>{node.stats.runs}</b> {ar ? "تشغيل" : "runs"}
        </span>
        {node.stats.pendingProposals > 0 ? (
          <span className="om-pending">
            <b>{node.stats.pendingProposals}</b> {ar ? "بانتظارك" : "waiting"}
          </span>
        ) : null}
        {node.stats.lastRunAt ? (
          <span className="om-dim">{formatShortDate(node.stats.lastRunAt)}</span>
        ) : null}
      </div>
      <div className="om-tools">
        {node.tools.slice(0, 4).map((t) => (
          <span key={t} className="om-tool">{t}</span>
        ))}
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
        {/* Tier 1 — the only supervisor */}
        <div className="om-tier om-tier-group">
          <div className={`om-broker om-${bm.tone}`}>
            <div className="om-broker-eyebrow">{L("المشرف الوحيد", "The only supervisor")}</div>
            <div className="om-broker-name">
              <span className={`om-dot om-dot-${bm.tone}`} aria-hidden />
              {ar ? map.broker.labelAr : map.broker.labelEn}
            </div>
            <div className="om-broker-why">
              {L(
                "يملك ما لا يملكه من تحته: رؤية عابرة للشركات، وصلاحية الترجيح بين ميزانيتين.",
                "Holds what those below it do not: the cross-company view, and the standing to arbitrate between two P&Ls.",
              )}
            </div>
            <div className="om-broker-stats">
              <span><b>{map.broker.stats.runs}</b> {L("تشغيل", "runs")}</span>
              <span className="om-mono">{map.broker.topology}</span>
              <span className={`om-chip om-chip-${bm.tone}`}>{ar ? bm.ar : bm.en}</span>
            </div>
          </div>
        </div>

        {/* The spine — animated flow from the broker down to the rosters */}
        <div className="om-spine" aria-hidden>
          <span className="om-spine-line" />
          <span className="om-spine-pulse" />
        </div>

        <div className="om-rosters-label">
          {L(
            "فرق الشركات — الفريق بيانات (أي الأدوار مُفعّلة)، وليس طبقة إدارية.",
            "Company rosters — a roster is data (which roles are on), not a management layer.",
          )}
        </div>

        {/* Tier 2 — one branch per company */}
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
                style={{ animationDelay: `${120 + bi * 90}ms` }}
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
                    <AgentCard key={a.roleId} node={a} ar={ar} delay={180 + bi * 90 + ai * 60} />
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
