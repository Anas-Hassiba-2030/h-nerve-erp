// /brain/graph — the live causal graph view (Phase 1).
//
// Ported to its Claude Design reference (docs/design/system/sections/causal.html).
// The page is a thin server shell that loads the real Prisma graph and feeds it
// into the reference's night-register HTML structure (br-* ribbon + cg-* stage).
// The interactive cascade lives in components/brain/CausalGraph.tsx, a faithful
// port of causal-ops.js. No DaylightShell/DaylightPanel — exact reference markup.
//
// Phase 1 of docs/PHASES-INTELLIGENCE.md.

import "../../daylight.css";
import "./causal.css";
import { CausalGraph } from "@/components/brain/CausalGraph";
import { causalGraph } from "@/lib/brain/graph.prisma";
import { getLocale } from "@/lib/i18n/i18n.server";
import { rebuildBrainGraph } from "./actions";
import { ConfirmRebuildForm } from "./ConfirmRebuildForm";
import { Brain } from "lucide-react";

// Arabic-Indic numerals for KPI display.
function toAr(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default async function BrainGraphPage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const { nodes, edges } = await causalGraph().loadAll();

  // KPI strip — node/edge footprint + derived averages & model confidence.
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  // "Network density" (edges / n·(n-1)) rendered as "0.00" for any real-sized
  // graph — meaningless to an operator. Show the average number of links per
  // entity instead: a number a human can actually reason about.
  const avgLinks = nodeCount > 0 ? edgeCount / nodeCount : 0;
  const avgEdgeConfidence =
    edges.length > 0
      ? edges.reduce((a, e) => a + (e.confidence ?? 0), 0) / edges.length
      : 0;

  // Focused view (2026-07-24, owner-directed): rendering all ~650 nodes in one
  // SVG produced an unreadable hairball. Show the most-connected entities —
  // the hubs that actually drive the group — with readable labels; the KPIs
  // above still report the full graph.
  const FOCUS = 24;
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  const focusNodes = [...nodes]
    .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
    .slice(0, FOCUS);
  const focusIds = new Set(focusNodes.map((n) => n.id));
  const focusEdges = edges.filter((e) => focusIds.has(e.from) && focusIds.has(e.to));

  const fmtNum = (n: number) => (ar ? toAr(n) : String(n));
  const fmtPct = (v: number) => {
    const s = `${Math.round(v * 100)}%`;
    return ar ? toAr(`${Math.round(v * 100)}`) + "٪" : s;
  };
  const fmtAvg = (v: number) => {
    const s = v.toFixed(1);
    return ar ? toAr(s) : s;
  };

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick"></span>
              {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
            </span>
            <h1>{ar ? "تحليل التأثير" : "Impact Analysis"}</h1>
          </div>
          <div className="br-intro">
            {ar ? (
              <>
                شبكة العلاقات بين كيانات المجموعة. انقر أيّ عقدة لتشاهد <b>التأثير يتتالى</b>{" "}
                عبر الكيانات المرتبطة — كما يراه الدماغ.
              </>
            ) : (
              <>
                The network of relationships between the group&apos;s entities. Click any node to watch
                the <b>effect cascade</b> across connected entities — as the brain sees it.
              </>
            )}
          </div>
        </div>

        {nodeCount === 0 ? (
          <EmptyState ar={ar} />
        ) : (
          <>
            <div className="br-kpis">
              <div className="br-kpi">
                <div className="v">{fmtNum(nodeCount)}</div>
                <div className="k">{ar ? "العُقد" : "Nodes"}</div>
              </div>
              <div className="br-kpi">
                <div className="v">{fmtNum(edgeCount)}</div>
                <div className="k">{ar ? "الروابط" : "Edges"}</div>
              </div>
              <div className="br-kpi">
                <div className="v">{fmtAvg(avgLinks)}</div>
                <div className="k">{ar ? "متوسط الروابط لكل كيان" : "Avg links per entity"}</div>
              </div>
              <div className="br-kpi">
                <div className="v">{fmtPct(avgEdgeConfidence)}</div>
                <div className="k">{ar ? "ثقة النموذج" : "Model confidence"}</div>
              </div>
            </div>

            <CausalGraph
              ar={ar}
              nodes={focusNodes.map((n) => ({ id: n.id, label: n.label }))}
              edges={focusEdges.map((e) => ({ from: e.from, to: e.to }))}
              subtitle={
                ar
                  ? `لعرض أوضح: تُعرض أكثر ${toAr(focusNodes.length)} كيانات ارتباطاً من أصل ${toAr(nodeCount)}.`
                  : `For clarity: showing the ${focusNodes.length} most-connected entities of ${nodeCount}.`
              }
              rebuildSlot={<ConfirmRebuildForm ar={ar} />}
            />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <div className="cg-stage" style={{ padding: "60px 32px", textAlign: "center" }}>
      <h2 style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 600, color: "#fff" }}>
        {ar ? "الدماغ ينتظر." : "The brain is waiting."}
      </h2>
      <p style={{ fontSize: 14, color: "var(--mist)", opacity: 0.8, marginTop: 12 }}>
        {ar
          ? "اضغط على الزر بالأسفل لمسح كل الكيانات وبناء الرسم السببي للأعمال. سيستغرق ذلك ثوانٍ."
          : "Press the button below to scan every entity in the system and build the business causal graph. Takes a few seconds."}
      </p>
      <div className="br-controls" style={{ justifyContent: "center", marginTop: 24 }}>
        <form action={rebuildBrainGraph}>
          <button type="submit" className="br-btn br-btn-primary">
            <Brain className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ابنِ الدماغ" : "Build the brain"}
          </button>
        </form>
      </div>
    </div>
  );
}
