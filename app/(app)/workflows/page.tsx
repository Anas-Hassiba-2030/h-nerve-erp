export const dynamic = "force-dynamic";
// /workflows — Workflow studio, restyled to the Claude Design "workflows"
// reference (docs/design/system/sections/workflows.html).
//
// BRAIN-subsystem "night register": slim ribbon + control buttons, a
// three-column Studio (palette → canvas → inspector) and a run-strip.
// The reference markup's drag-canvas is an in-page demo; here the canvas
// is populated with the operator's real workflows (Prisma) and the
// control buttons drive the existing server actions. The look is the
// design; the data is real.
//
// Phase 12 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { prisma } from "@/lib/db";
import "../daylight.css";
import "./workflows.css";
import { getLocale } from "@/lib/i18n.server";
import { createWorkflow, createWorkflowFromTemplate } from "./actions";
import { TEMPLATE_GALLERY } from "@/lib/workflows/templates.gallery";

const KIND_PI: Record<string, { cls: string; icon: string }> = {
  trigger: { cls: "trigger", icon: "⚡" },
  condition: { cls: "cond", icon: "◆" },
  cond: { cls: "cond", icon: "◆" },
  action: { cls: "action", icon: "▶" },
};

export default async function WorkflowsPage() {
  const ar = getLocale() === "ar";

  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      nodes: true,
      _count: { select: { runs: true } },
    },
  });

  const total = workflows.length;
  const active = workflows.filter((w) => w.enabled).length;
  const totalRuns = workflows.reduce((a, w) => a + w._count.runs, 0);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        {/* ── ribbon ── */}
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "النظام" : "System"}
            </span>
            <h1>{ar ? "الأتمتة" : "Workflows"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "صمّم مسارات عمل تلقائية بالسحب والإفلات. محفّز ← شرط ← إجراء — ودع الدماغ ينفّذها."
              : "Design automatic workflows by drag-and-drop. Trigger → condition → action — and let the brain run them."}
          </div>
        </div>

        {/* ── controls ── */}
        <div className="br-controls">
          <form action={createWorkflow}>
            <input type="hidden" name="name" value="New workflow" />
            <button type="submit" className="br-btn br-btn-primary">
              {ar ? "＋ مسار من الصفر" : "＋ New from scratch"}
            </button>
          </form>
          {TEMPLATE_GALLERY.length > 0 ? (
            <form action={createWorkflowFromTemplate}>
              <input type="hidden" name="templateId" value={TEMPLATE_GALLERY[0].id} />
              <button type="submit" className="br-btn br-btn-ghost">
                {ar ? "من قالب" : "From template"}
              </button>
            </form>
          ) : null}
          <Link href="#runstrip" className="br-btn br-btn-ghost">
            {ar ? "▶ تشغيل تجريبي" : "▶ Test run"}
          </Link>
        </div>

        {/* ── studio: palette · canvas · inspector ── */}
        <div className="wf-studio">
          {/* palette */}
          <div className="wf-pal">
            <h3>{ar ? "اللوحة" : "Palette"}</h3>
            <div className="pal-node">
              <span className="pi trigger">⚡</span>
              {ar ? "محفّز" : "Trigger"}
            </div>
            <div className="pal-node">
              <span className="pi cond">◆</span>
              {ar ? "شرط" : "Condition"}
            </div>
            <div className="pal-node">
              <span className="pi action">▶</span>
              {ar ? "إجراء" : "Action"}
            </div>
            <div style={{ fontSize: 11, color: "var(--mist)", opacity: 0.5, marginTop: 10, lineHeight: 1.5 }}>
              {ar
                ? "افتح الاستوديو لإضافة العقد وترتيبها."
                : "Open the studio to add and arrange nodes."}
            </div>
          </div>

          {/* canvas — real workflows as nodes */}
          <div className="wf-canvas" id="canvas">
            <svg id="wires" />
            {workflows.length === 0 ? (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--mist)", opacity: 0.55, fontSize: 13, padding: 20, textAlign: "center" }}>
                {ar
                  ? "لا مسارات بعد — ابدأ من الصفر أو من قالب أعلاه."
                  : "No workflows yet — start from scratch or a template above."}
              </div>
            ) : (
              workflows.map((w, i) => {
                const counts = w.nodes.reduce<Record<string, number>>((acc, n) => {
                  acc[n.kind] = (acc[n.kind] ?? 0) + 1;
                  return acc;
                }, {});
                const summary = (["trigger", "condition", "action"] as const)
                  .filter((k) => counts[k])
                  .map((k) => `${counts[k]} ${k}`)
                  .join(" · ");
                const col = i % 3;
                const rowIdx = Math.floor(i / 3);
                return (
                  <Link
                    key={w.id}
                    href={`/workflows/studio/${w.id}`}
                    className={`wnode${w.enabled ? " sel" : ""}`}
                    style={{
                      left: 30 + col * 150,
                      top: 30 + rowIdx * 90,
                      textDecoration: "none",
                    }}
                  >
                    <div className="wt">{w.name}</div>
                    <div className="wk">
                      {(w.enabled ? (ar ? "نشط" : "active") : (ar ? "مسوّدة" : "draft"))}
                      {summary ? ` · ${summary}` : ""}
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* inspector — studio summary */}
          <div className="wf-insp">
            <h3>{ar ? "الخصائص" : "Properties"}</h3>
            <div className="insp-field">
              <label>{ar ? "كل المسارات" : "Total workflows"}</label>
              <input value={String(total)} readOnly />
            </div>
            <div className="insp-field">
              <label>{ar ? "نشطة" : "Active"}</label>
              <input value={String(active)} readOnly />
            </div>
            <div className="insp-field">
              <label>{ar ? "تشغيلات" : "Runs logged"}</label>
              <input value={String(totalRuns)} readOnly />
            </div>
          </div>
        </div>

        {/* ── run-strip ── */}
        <div className="wf-runstrip" id="runstrip">
          <span style={{ fontWeight: 700, color: "var(--gold-soft)" }}>
            {ar ? "التشغيل:" : "Run:"}
          </span>
          <span className="step on">⚡ {ar ? "محفّز" : "Trigger"}</span>
          →
          <span className="step on">◆ {ar ? "شرط" : "Condition"}</span>
          →
          <span className="step on">▶ {ar ? "إجراء" : "Action"}</span>
        </div>
      </div>
    </div>
  );
}
