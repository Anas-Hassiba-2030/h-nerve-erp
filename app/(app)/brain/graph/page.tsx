// /brain/graph — the live causal graph view (Phase 1).
//
// The page chrome (PageHeader, sidebar) stays in Heritage Modern. The
// canvas itself flips into Industrial Precision (off-black engine room)
// because that's the right vocabulary for technical data work — see
// docs/DESIGN-SKILL.md §1.B + §6 Decision Matrix.
//
// Phase 1 of docs/PHASES-INTELLIGENCE.md.

import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { CausalStudio } from "@/components/brain/CausalStudio";
import { causalGraph } from "@/lib/brain/graph.prisma";
import { getLocale } from "@/lib/i18n.server";
import { rebuildBrainGraph } from "./actions";
import { ConfirmRebuildForm } from "./ConfirmRebuildForm";
import { Brain } from "lucide-react";

export default async function BrainGraphPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const { nodes, edges } = await causalGraph().loadAll();

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · الرسم السببي" : "Brain · Causal graph"}
        title={ar ? "الرسم السببي للأعمال" : "Business causal graph"}
        subtitle={
          ar
            ? "كل وحدة، كل علاقة، كل أثر. اضغط على عقدة لترى ما يتأثر بها أسفل التيار."
            : "Every entity, every relationship, every downstream effect. Click a node to watch the cascade."
        }
      />

      <PageContainer>
        {nodes.length === 0 ? (
          <EmptyState ar={ar} />
        ) : (
          <CausalStudio
            ar={ar}
            nodes={nodes.map((n) => ({
              id: n.id,
              kind: n.kind,
              label: n.label,
              importance: (n as any).importance ?? 0.5,
              payload: n.payload,
            }))}
            edges={edges.map((e) => ({
              from: e.from,
              to: e.to,
              kind: e.kind,
              weight: e.weight,
              confidence: e.confidence,
            }))}
            rebuildSlot={<ConfirmRebuildForm ar={ar} />}
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
          fontSize: "clamp(28px, 3.4vw, 46px)",
          lineHeight: 1.05,
          letterSpacing: ar ? "-0.005em" : "-0.022em",
          fontWeight: ar ? 600 : 500,
          color: "var(--heri-ink)",
          textWrap: "balance" as any,
        }}
      >
        {ar ? "الدماغ ينتظر." : "The brain is waiting."}
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
          ? "اضغط على الزر بالأسفل لمسح كل الكيانات وبناء الرسم السببي للأعمال. سيستغرق ذلك ثوانٍ."
          : "Press the button below to scan every entity in the system and build the business causal graph. Takes a few seconds."}
      </p>
      <div className="mt-6">
        <form action={rebuildBrainGraph}>
          <button
            type="submit"
            className="heri-btn heri-btn-primary"
            style={{ fontSize: 13 }}
          >
            <Brain className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ابنِ الدماغ" : "Build the brain"}
          </button>
        </form>
      </div>
    </section>
  );
}
