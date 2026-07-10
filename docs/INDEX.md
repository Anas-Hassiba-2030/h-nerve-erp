# docs/ — Table of Contents

owner: Anas Hasiba
last-updated: 2026-07-10

One screen, everything findable. Bold = start-here docs.

Docs that code or `CLAUDE.md` reference **by exact path** stay at `docs/` root —
moving them silently breaks a comment, a script, or an agent brief. Everything
else lives in `ops/`, `brain/`, or `phases/`.

## Orientation & state

| Doc | What it is |
|---|---|
| **[MAP.md](MAP.md)** | Navigation protocol — "if you want X, it lives at Y" |
| **[STATUS.md](STATUS.md)** | Living health snapshot + open items (supersedes AUDIT-2026-06) |
| **[BUILD-PLAN.md](BUILD-PLAN.md)** | The single forward plan (supersedes PRODUCTION-ROADMAP for planning) |
| [SYSTEM-MAP.md](SYSTEM-MAP.md) | Every route/section, mirrors `src/lib/orrery/groups.ts` |

## Governing three (referenced by exact path — do not move)

| Doc | What it is |
|---|---|
| **[DESIGN-SKILL.md](DESIGN-SKILL.md)** | The design language — 8 vocabularies, Heritage Modern default |
| **[PHASES-INTELLIGENCE.md](PHASES-INTELLIGENCE.md)** | Master phase plan, Waves A–E + Phase 27 backlog |
| **[RE-INFRASTRUCTURE-PLAN.md](RE-INFRASTRUCTURE-PLAN.md)** | Docs-first rebuild philosophy + RAG re-architecture (shipped) |

## Architecture & blueprints

[SYSTEM-BLUEPRINT.md](SYSTEM-BLUEPRINT.md) (bootstrap-a-new-system playbook) · [BLUEPRINT.md](BLUEPRINT.md) (portable Brain pattern) · [ISOLATION.md](ISOLATION.md) (multi-tenancy rules) · [phases/READINESS.md](phases/READINESS.md) (prototype-vs-production honesty) · ERP-KNOWLEDGE-BASE.md (the 13 ERP modules — lands with the Phase 27 CRM PR #280)

## Ops & deploy

At root (code-referenced): [DEPLOYMENT.md](DEPLOYMENT.md) · [RUNBOOK.md](RUNBOOK.md) (incl. secret rotation §1) · [OPERATING-PROTOCOL.md](OPERATING-PROTOCOL.md) · [BRAIN-DB-LINK-RUNBOOK.md](BRAIN-DB-LINK-RUNBOOK.md) (virgin-DB rehearsal) · [IMPORT-PIPELINE.md](IMPORT-PIPELINE.md) · [INTEGRATIONS-N8N.md](INTEGRATIONS-N8N.md) (exports live in [integrations/n8n/](integrations/n8n/))

In [ops/](ops/): [GITHUB-WORKFLOW.md](ops/GITHUB-WORKFLOW.md) (branch/PR discipline) · [PERFORMANCE.md](ops/PERFORMANCE.md) · [PHASE-11-PERF.md](ops/PHASE-11-PERF.md) · [WORKFLOWS-SMOKE-TEST.md](ops/WORKFLOWS-SMOKE-TEST.md)

## Brain & agents

**[VAOC.md](VAOC.md)** (the agent company: org chart, orchestration catalog, harmony rules) · [SUBAGENTS-AND-MCP-CATALOG.md](SUBAGENTS-AND-MCP-CATALOG.md) (all agents + MCP servers) · `src/lib/brain/README.md` (the architecture itself)

In [brain/](brain/): [NOTEBOOKLM-BRAIN-SOURCE.md](brain/NOTEBOOKLM-BRAIN-SOURCE.md) (historical snapshot) · [BRAIN-INFRA-ASSESSMENT-2026-06.md](brain/BRAIN-INFRA-ASSESSMENT-2026-06.md) (dated)

## Historical / dated

[AUDIT-2026-06.md](AUDIT-2026-06.md) → superseded by STATUS.md.

In [phases/](phases/): [PRODUCTION-ROADMAP.md](phases/PRODUCTION-ROADMAP.md) → superseded by BUILD-PLAN.md · [READINESS.md](phases/READINESS.md) · [PITCH-WALKTHROUGH.md](phases/PITCH-WALKTHROUGH.md) · [WORKSPACE-ROADMAP.md](phases/WORKSPACE-ROADMAP.md) · [BUTTON-AUDIT-BACKLOG.md](phases/BUTTON-AUDIT-BACKLOG.md) · [CLAUDE-DESIGN-RESTORE-PHASES.md](phases/CLAUDE-DESIGN-RESTORE-PHASES.md)

## Folders

| Folder | Contents |
|---|---|
| [spec/](spec/) | Specs: data-model docs, IEEE-830 SRS (docx); PHASE-27-ERP-MODULES lands with PR #280 |
| [proposals/](proposals/) | Idea papers (VAOC-BLUEPRINT, phase proposals) |
| [prompts/](prompts/) | Reusable prompt briefs (LOGIN-REDESIGN, BRAIN-AUDIT) |
| [design/](design/) | Claude Design exports: `orrery/` (hub source + PORT-MAP), `system/` |
| [integrations/](integrations/) | n8n workflow exports (redacted) |
| [superpowers/](superpowers/) | Brain-MCP spec + plan (2026-06-08) |
| [pitch-screenshots/](pitch-screenshots/) | Pitch-deck image assets |
| [ops/](ops/) | Ops runbooks not referenced by code |
| [brain/](brain/) | Dated Brain snapshots + assessments |
| [phases/](phases/) | Historical roadmaps, readiness, pitch walkthrough, design backlogs |
