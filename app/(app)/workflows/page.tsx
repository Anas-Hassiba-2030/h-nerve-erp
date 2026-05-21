// /workflows — Heritage Modern list of all workflows.
//
// Phase 12 of docs/PHASES-INTELLIGENCE.md. (Replaces the prior alert-rule
// flow viewer — that surface lives at /alerts now.)

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { Plus, ChevronLeft, Workflow as WorkflowIcon, Database, Trash2 } from "lucide-react";
import {
  createWorkflow,
  toggleWorkflow,
  seedExampleWorkflows,
  deleteWorkflow,
  createWorkflowFromTemplate,
} from "./actions";
import { TEMPLATE_GALLERY } from "@/lib/workflows/templates.gallery";

const KIND_TONE: Record<string, "info" | "warn" | "critical" | "success" | "neutral"> = {
  trigger: "warn",
  condition: "info",
  action: "success",
};

export default async function WorkflowsPage() {
  const locale = getLocale();
  const ar = locale === "ar";

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
    <>
      <PageHeader
        eyebrow={ar ? "أتمتة · سير العمل" : "Automation · Workflows"}
        title={ar ? "خرائط الأتمتة" : "Workflow studio"}
        subtitle={
          ar
            ? "اربط أحداث الأعمال بإجراءات تلقائية. مُشغّل، شرط، فعل — وكل سير عمل يُحدِّث ذاته."
            : "Wire business events to automatic actions. Triggers, conditions, actions — every flow ticks on its own."
        }
      />

      <PageContainer>
        {/* Header CTA */}
        <section className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label={ar ? "كل سير العمل" : "Total workflows"} value={total} />
            <Stat label={ar ? "نشطة" : "Active"} value={active} accent="teal" />
            <Stat label={ar ? "تشغيلات" : "Runs logged"} value={totalRuns} accent="copper" />
          </div>
          <form action={createWorkflow}>
            <input type="hidden" name="name" value="New workflow" />
            <button type="submit" className="heri-btn heri-btn-primary">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "سير عمل جديد" : "New workflow"}
            </button>
          </form>
        </section>

        {/* Phase NS-3 — template gallery. Shows always, not just on
            empty state; serves as a "starter pack" the manager can
            clone and customise. */}
        <HeritageSection
          eyebrow={ar ? "قوالب جاهزة" : "Starter templates"}
          title={ar ? "ابدأ من قالب" : "Start from a template"}
          aside={
            ar
              ? `${TEMPLATE_GALLERY.length} قالب — تخصيص بنقرة واحدة`
              : `${TEMPLATE_GALLERY.length} templates — one-click clone`
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {TEMPLATE_GALLERY.map((t) => (
              <article
                key={t.id}
                className="p-4 flex flex-col gap-2"
                style={{
                  background: "var(--heri-cream)",
                  border: "1px solid var(--heri-rule)",
                }}
              >
                <div className="heri-eyebrow" style={{ color: "var(--heri-ink-3)" }}>
                  {ar ? t.flowAr : t.flowEn}
                </div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--heri-ink)",
                    margin: 0,
                  }}
                >
                  {ar ? t.nameAr : t.nameEn}
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "var(--heri-ink-2)",
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {ar ? t.descAr : t.descEn}
                </p>
                <form action={createWorkflowFromTemplate}>
                  <input type="hidden" name="templateId" value={t.id} />
                  <button
                    type="submit"
                    className="heri-btn heri-btn-secondary"
                    style={{ fontSize: 11.5, padding: "6px 12px" }}
                  >
                    <Plus className="h-3 w-3" strokeWidth={1.7} />
                    {ar ? "استخدم هذا القالب" : "Use this template"}
                  </button>
                </form>
              </article>
            ))}
          </div>
        </HeritageSection>

        {workflows.length === 0 ? (
          <HeritageSection
            eyebrow={ar ? "ابدأ" : "Start"}
            title={ar ? "لا سير عمل بعد" : "No workflows yet"}
            aside={
              ar
                ? "أو ابدأ من قالب أعلاه."
                : "Or pick a template from the gallery above."
            }
          >
            <div className="flex flex-wrap gap-3">
              <form action={createWorkflow}>
                <input type="hidden" name="name" value="New workflow" />
                <button type="submit" className="heri-btn heri-btn-secondary">
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "ابدأ من الصفر" : "Start from scratch"}
                </button>
              </form>
            </div>
          </HeritageSection>
        ) : (
          <div className="grid gap-3">
            {workflows.map((w) => {
              const counts = w.nodes.reduce<Record<string, number>>((acc, n) => {
                acc[n.kind] = (acc[n.kind] ?? 0) + 1;
                return acc;
              }, {});
              const tonePerKind = ["trigger", "condition", "action"] as const;
              return (
                <article
                  key={w.id}
                  className="relative grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                  style={{
                    background: "var(--heri-cream)",
                    border: "1px solid var(--heri-rule)",
                    padding: "16px 20px",
                    overflow: "hidden",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute top-0 bottom-0"
                    style={{
                      insetInlineStart: 0,
                      width: 3,
                      background: w.enabled ? "var(--heri-teal)" : "var(--heri-ochre)",
                    }}
                  />
                  <div className="ms-2 min-w-0">
                    <div className="heri-eyebrow heri-eyebrow-ink">
                      {w.enabled
                        ? (ar ? "نشط" : "ACTIVE")
                        : (ar ? "مسوّدة" : "DRAFT")}
                      {w._count.runs > 0 ? (
                        <>
                          <span style={{ color: "var(--heri-rule-strong)", margin: "0 8px" }}>·</span>
                          <span>{w._count.runs} {ar ? "تشغيل" : "runs"}</span>
                        </>
                      ) : null}
                    </div>
                    <h3
                      className={ar ? "mt-2" : "font-display-latin mt-2"}
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        letterSpacing: ar ? 0 : "-0.012em",
                        color: "var(--heri-ink)",
                        lineHeight: 1.3,
                        textWrap: "balance" as any,
                        maxWidth: "55ch",
                      }}
                    >
                      {w.name}
                    </h3>
                    {w.description ? (
                      <p
                        className="mt-1.5 line-clamp-2"
                        style={{
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: "var(--heri-ink-2)",
                          maxWidth: "65ch",
                        }}
                      >
                        {w.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {tonePerKind.map((k) =>
                        counts[k] ? (
                          <HeritagePill key={k} tone={KIND_TONE[k]}>
                            {counts[k]} {k === "trigger" ? (ar ? "مُشغّل" : "trigger") : k === "condition" ? (ar ? "شرط" : "cond") : (ar ? "فعل" : "action")}
                          </HeritagePill>
                        ) : null
                      )}
                      {w.nodes.length === 0 ? (
                        <span style={{ color: "var(--heri-ink-3)", fontStyle: "italic", fontSize: 12 }}>
                          {ar ? "فارغ — افتح الاستوديو لإضافة عقد" : "empty — open studio to add nodes"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={toggleWorkflow}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        className="heri-btn heri-btn-ghost"
                        style={{ padding: "6px 12px", fontSize: 11 }}
                      >
                        {w.enabled
                          ? (ar ? "إيقاف" : "Disable")
                          : (ar ? "تفعيل" : "Enable")}
                      </button>
                    </form>
                    <form action={deleteWorkflow}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        className="heri-btn heri-btn-ghost"
                        style={{
                          padding: "6px 12px",
                          fontSize: 11,
                          color: "var(--heri-terracotta)",
                        }}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </form>
                  </div>

                  <Link
                    href={`/workflows/studio/${w.id}`}
                    className="heri-btn heri-btn-primary"
                    style={{ padding: "8px 14px", fontSize: 12 }}
                  >
                    <WorkflowIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {ar ? "افتح الاستوديو" : "Open studio"}
                    <ChevronLeft
                      className="h-3 w-3"
                      style={{ transform: ar ? undefined : "scaleX(-1)" }}
                      strokeWidth={1.5}
                    />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "teal" | "copper" }) {
  const color =
    accent === "teal" ? "var(--heri-teal)"
    : accent === "copper" ? "var(--heri-copper)"
    : "var(--heri-ink)";
  return (
    <div
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "12px 16px",
      }}
    >
      <div className="heri-eyebrow heri-eyebrow-ink" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className="heri-number mt-1.5"
        style={{ fontSize: 26, fontWeight: 500, color, letterSpacing: "-0.018em" }}
      >
        {value}
      </div>
    </div>
  );
}
