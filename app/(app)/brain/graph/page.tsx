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
import { HeritageSection } from "@/components/heritage";
import { GraphView } from "@/components/brain/GraphView";
import { causalGraph } from "@/lib/brain/graph.prisma";
import { getLocale } from "@/lib/i18n.server";
import { rebuildBrainGraph } from "./actions";
import { Brain, Network, Sparkles } from "lucide-react";

export default async function BrainGraphPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const { nodes, edges } = await causalGraph().loadAll();

  // Quick stats for the side panel
  const byKind: Record<string, number> = {};
  for (const n of nodes) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
  const causalEdgeCount = edges.filter((e) => e.kind === "causal").length;
  const structuralEdgeCount = edges.filter((e) => e.kind === "structural").length;

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
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Canvas takes the lion's share */}
            <div className="lg:col-span-9">
              <GraphView
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
              />
            </div>

            {/* Side panel — Heritage Modern */}
            <div className="lg:col-span-3 space-y-4">
              <HeritageSection
                eyebrow={ar ? "إحصاءات" : "Stats"}
                title={ar ? "تكوين الرسم" : "Graph composition"}
                aside={
                  ar
                    ? "العقد والحواف الحالية في الرسم"
                    : "Current node and edge counts"
                }
              >
                <div className="space-y-3">
                  <StatRow
                    label={ar ? "العقد" : "Nodes"}
                    value={nodes.length}
                    icon={<Network className="h-3 w-3" strokeWidth={1.5} />}
                  />
                  <StatRow
                    label={ar ? "حواف هيكلية" : "Structural edges"}
                    value={structuralEdgeCount}
                  />
                  <StatRow
                    label={ar ? "حواف سببية" : "Causal edges"}
                    value={causalEdgeCount}
                    accent="ochre"
                  />
                </div>

                <div
                  className="mt-4 pt-3"
                  style={{ borderTop: "1px solid var(--heri-rule)" }}
                >
                  <div className="heri-eyebrow heri-eyebrow-ink mb-2.5">
                    {ar ? "حسب النوع" : "By kind"}
                  </div>
                  <ul className="space-y-1.5">
                    {Object.entries(byKind)
                      .sort((a, b) => b[1] - a[1])
                      .map(([kind, count]) => (
                        <li
                          key={kind}
                          className="flex items-center justify-between"
                          style={{ fontSize: 12 }}
                        >
                          <span style={{ color: "var(--heri-ink-2)" }}>{kind}</span>
                          <span
                            className="heri-number-mono"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--heri-ink)",
                            }}
                          >
                            {count}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </HeritageSection>

              <HeritageSection
                eyebrow={ar ? "صيانة" : "Maintenance"}
                title={ar ? "إعادة بناء الرسم" : "Rebuild graph"}
                aside={
                  ar
                    ? "يقوم الدماغ بمسح كل الكيانات وإنشاء عقد وحواف جديدة من الصفر."
                    : "The brain scans every entity and produces fresh nodes and edges."
                }
              >
                <form action={rebuildBrainGraph}>
                  <button type="submit" className="heri-btn heri-btn-primary w-full justify-center">
                    <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {ar ? "إعادة بناء الدماغ" : "Rebuild brain"}
                  </button>
                </form>
                <p
                  className="mt-3"
                  style={{
                    fontSize: 11,
                    color: "var(--heri-ink-3)",
                    lineHeight: 1.5,
                  }}
                >
                  {ar
                    ? "آمن للتشغيل في أي وقت. التحديثات لا تكسر الحواف المُتعلَّمة."
                    : "Safe to run anytime. Doesn't clobber learned edges."}
                </p>
              </HeritageSection>

              <HeritageSection
                eyebrow={ar ? "الخطوة التالية" : "Coming next"}
                title={ar ? "المُحاكي" : "The simulator"}
                aside={
                  ar
                    ? "المرحلة 2: اسحب أي مؤشر إلى قيمة افتراضية وشاهد التأثير ينتشر عبر الرسم في الوقت الحقيقي."
                    : "Phase 2: drag any KPI to a hypothetical value and watch the impact propagate across the graph in real time."
                }
              >
                <div
                  className="flex items-center gap-2"
                  style={{ color: "var(--heri-copper)" }}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  <span
                    className="heri-eyebrow"
                    style={{ color: "var(--heri-copper)" }}
                  >
                    {ar ? "في الطريق" : "On the way"}
                  </span>
                </div>
              </HeritageSection>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}

function StatRow({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent?: "ochre";
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="inline-flex items-center gap-2"
        style={{ fontSize: 12, color: "var(--heri-ink-2)" }}
      >
        {icon}
        {label}
      </span>
      <span
        className="heri-number"
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: accent === "ochre" ? "var(--heri-ochre-2)" : "var(--heri-ink)",
        }}
      >
        {value}
      </span>
    </div>
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
