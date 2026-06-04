// /workflows/studio/[id] — the visual flow editor.
//
// Industrial Precision (DESIGN-SKILL §1.B). Off-black canvas, luminous
// hairline edges, palette on the left, inspector on the right, test-run
// strip at the bottom. Phase 12 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/db";
import Link from "next/link";
import { ArrowLeft, Power, Trash2, FlaskConical } from "lucide-react";
import { templatesByKind, getTemplate } from "@/lib/workflows/templates";
import { StudioCanvas, type StudioNode, type StudioEdge } from "@/components/workflows/StudioCanvas";
import { TestRunStrip } from "@/components/workflows/TestRunStrip";
import { Palette } from "@/components/workflows/Palette";
import { toggleWorkflow, deleteWorkflow } from "../../actions";
import { getLocale } from "@/lib/i18n/i18n.server";

export default async function StudioPage({ params }: { params: { id: string } }) {
  const wf = await prisma.workflow.findUnique({
    where: { id: params.id },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
      edges: true,
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
  if (!wf) notFound();

  const locale = getLocale();
  const ar = locale === "ar";

  const studioNodes: StudioNode[] = wf.nodes.map((n) => {
    const t = getTemplate(n.templateKey);
    return {
      id: n.id,
      kind: n.kind as any,
      templateKey: n.templateKey,
      label: t?.labelEn ?? n.templateKey,
      labelAr: t?.labelAr ?? n.templateKey,
      module: (t?.module ?? "GROUP") as any,
      summary: t ? t.summary(safeJson(n.configJson)) : "",
      // Prefer the stored posX (the node's column) so a saved position is
      // honored; fall back to the template's default column.
      column: (n.posX ?? t?.defaultColumn ?? 1) as 1 | 2 | 3,
      orderInColumn: n.posY ?? 0,
      configJson: n.configJson,
    };
  });

  const studioEdges: StudioEdge[] = wf.edges.map((e) => ({
    id: e.id,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
  }));

  const lastRun = wf.runs[0];

  return (
    <div className="studio-shell">
      {/* Top rail */}
      <header className="studio-rail">
        <div className="studio-rail-left">
          <Link href="/workflows" className="studio-back" title="Back to workflows">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
          <span className="studio-eyebrow">
            {wf.enabled ? "ACTIVE" : "DRAFT"} · {wf.nodes.length} {wf.nodes.length === 1 ? "node" : "nodes"}
          </span>
          <span className="studio-name">{wf.name}</span>
        </div>
        <div className="studio-rail-right">
          <form action={toggleWorkflow}>
            <input type="hidden" name="id" value={wf.id} />
            <button type="submit" className="studio-btn-ghost">
              <Power className="h-3.5 w-3.5" strokeWidth={1.5} />
              {wf.enabled ? "Disable" : "Enable"}
            </button>
          </form>
          <form action={deleteWorkflow}>
            <input type="hidden" name="id" value={wf.id} />
            <button
              type="submit"
              className="studio-btn-ghost"
              style={{ color: "#e85a72" }}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </header>

      <div className="studio-grid">
        {/* Palette */}
        <aside className="studio-palette">
          <Palette
            workflowId={wf.id}
            triggers={templatesByKind("trigger")}
            conditions={templatesByKind("condition")}
            actions={templatesByKind("action")}
          />
        </aside>

        {/* Canvas */}
        <section className="studio-stage">
          <StudioCanvas
            workflowId={wf.id}
            nodes={studioNodes}
            edges={studioEdges}
            ar={ar}
          />
        </section>
      </div>

      {/* Test run strip */}
      <TestRunStrip
        workflowId={wf.id}
        lastRun={
          lastRun
            ? {
                id: lastRun.id,
                status: lastRun.status,
                durationMs: lastRun.durationMs ?? 0,
                trace: safeJsonArray(lastRun.traceJson),
              }
            : null
        }
      />
    </div>
  );
}

function safeJson(s: string | null | undefined) {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}
function safeJsonArray(s: string | null | undefined): any[] {
  try {
    const v = JSON.parse(s ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
