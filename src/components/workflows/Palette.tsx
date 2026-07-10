// Palette — left panel of the studio. Click a template to drop it onto
// the canvas (auto-placed in its column). No drag, no fuss.
//
// Phase 12 of docs/governance/PHASES-INTELLIGENCE.md.

import { addNode } from "@/app/(app)/workflows/actions";
import type { Template } from "@/lib/workflows/templates";
import { Plus, Zap, GitBranch, Plug } from "lucide-react";

const KIND_ACCENT: Record<string, string> = {
  trigger:   "#f5b647",
  condition: "#5bd5e0",
  action:    "#9bd6c4",
};

export function Palette({
  workflowId,
  triggers,
  conditions,
  actions,
}: {
  workflowId: string;
  triggers: Template[];
  conditions: Template[];
  actions: Template[];
}) {
  return (
    <div className="palette">
      <div className="palette-head">
        <span className="palette-eyebrow">PALETTE</span>
        <span className="palette-hint">Click to add to canvas</span>
      </div>

      <Section title="TRIGGERS" icon={<Zap className="h-3 w-3" strokeWidth={1.5} />} accent={KIND_ACCENT.trigger}>
        {triggers.map((t) => (
          <PaletteItem key={t.key} workflowId={workflowId} template={t} accent={KIND_ACCENT.trigger} />
        ))}
      </Section>

      <Section title="CONDITIONS" icon={<GitBranch className="h-3 w-3" strokeWidth={1.5} />} accent={KIND_ACCENT.condition}>
        {conditions.map((t) => (
          <PaletteItem key={t.key} workflowId={workflowId} template={t} accent={KIND_ACCENT.condition} />
        ))}
      </Section>

      <Section title="ACTIONS" icon={<Plug className="h-3 w-3" strokeWidth={1.5} />} accent={KIND_ACCENT.action}>
        {actions.map((t) => (
          <PaletteItem key={t.key} workflowId={workflowId} template={t} accent={KIND_ACCENT.action} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="palette-section">
      <header className="palette-section-head" style={{ color: accent }}>
        {icon}
        <span>{title}</span>
      </header>
      <div className="palette-section-body">{children}</div>
    </section>
  );
}

function PaletteItem({
  workflowId,
  template,
  accent,
}: {
  workflowId: string;
  template: Template;
  accent: string;
}) {
  return (
    <form action={addNode} className="palette-item-form">
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="templateKey" value={template.key} />
      <button type="submit" className="palette-item" style={{ ["--accent" as any]: accent }}>
        <span className="palette-item-meta">
          <span className="palette-item-module">{template.module}</span>
        </span>
        <span className="palette-item-label">{template.labelEn}</span>
        <span className="palette-item-add" aria-hidden>
          <Plus className="h-3 w-3" strokeWidth={2} />
        </span>
      </button>
    </form>
  );
}
