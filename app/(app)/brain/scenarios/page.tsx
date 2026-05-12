// /brain/scenarios — Phase 2 of docs/PHASES-INTELLIGENCE.md.
//
// Pick any node, drag the slider, watch the impact propagate through the
// causal graph in real-time. The simulator runs in-browser against a
// snapshot of the graph for sub-millisecond per-frame propagation.
//
// Page chrome: Heritage Modern. Scrub deck: Industrial Precision.
// Impact stories: Heritage Modern editorial.

import Link from "next/link";
import { Brain, Network } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { Scenario } from "@/components/brain/Scenario";
import { causalGraph } from "@/lib/brain/graph.prisma";
import { getLocale } from "@/lib/i18n.server";

export default async function BrainScenariosPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const { nodes, edges } = await causalGraph().loadAll();

  // Pick a sensible default source for the demo punch:
  // 1) prefer Arena Space Hospitality (HOSPITALITY) — the canonical demo node
  // 2) else any HOSPITALITY company
  // 3) else first hub-kind node
  const HUBS = new Set(["Company", "Hotel", "Forecast"]);
  const arena =
    nodes.find((n) => n.kind === "Company" && /arena/i.test(n.label)) ??
    nodes.find((n) => n.kind === "Hotel") ??
    nodes.find((n) => HUBS.has(n.kind));

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · المُحاكي" : "Brain · Simulator"}
        title={ar ? "ماذا لو…" : "What if…"}
        subtitle={
          ar
            ? "اسحب أي مؤشر إلى قيمة افتراضية، شاهد التأثير ينتشر عبر كامل الأعمال — في الوقت الحقيقي."
            : "Drag any KPI to a hypothetical value. Watch the impact propagate across the entire business — in real time."
        }
      />

      <PageContainer>
        {nodes.length === 0 ? (
          <EmptyState ar={ar} />
        ) : (
          <Scenario
            nodes={nodes}
            edges={edges}
            ar={ar}
            defaultSourceId={arena?.id}
          />
        )}
      </PageContainer>
    </>
  );
}

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <section
      className="heri-hero"
      style={{ padding: "60px 32px", textAlign: "center" }}
    >
      <div
        className="inline-flex h-12 w-12 items-center justify-center mx-auto"
        style={{
          border: "1px solid var(--heri-rule-strong)",
          color: "var(--heri-ochre)",
          background: "var(--heri-cream-2)",
        }}
      >
        <Brain className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        className={ar ? "mt-5" : "font-display-latin mt-5"}
        style={{
          fontSize: "clamp(24px, 3vw, 38px)",
          lineHeight: 1.05,
          letterSpacing: ar ? "-0.005em" : "-0.022em",
          fontWeight: ar ? 600 : 500,
          color: "var(--heri-ink)",
        }}
      >
        {ar
          ? "ابنِ الدماغ أولاً."
          : "Build the brain first."}
      </h2>
      <p
        className="measure mt-3 mx-auto"
        style={{
          fontSize: "clamp(13px, 1vw, 14.5px)",
          lineHeight: 1.55,
          color: "var(--heri-ink-2)",
        }}
      >
        {ar
          ? "المُحاكي يحتاج إلى الرسم السببي. اذهب إلى الرسم السببي واضغط «ابنِ الدماغ»."
          : "The simulator needs the causal graph. Head to the graph view and press \"Build the brain\"."}
      </p>
      <div className="mt-6">
        <Link href="/brain/graph" className="heri-btn heri-btn-primary">
          <Network className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "اذهب إلى الرسم السببي" : "Open the causal graph"}
        </Link>
      </div>
    </section>
  );
}
