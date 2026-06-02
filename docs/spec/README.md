# H-Nerve — Spec Set (`docs/spec/`)

The build-from-scratch specification stack: the documents an engineer needs to
build (or rebuild) H-Nerve **without coming back to ask**. Generated for the
re-infrastructure effort — see `docs/RE-INFRASTRUCTURE-PLAN.md` for the strategy
and the full 13-document gap analysis this folder draws from.

Each doc is **derived from the codebase** (accurate, not aspirational) and points
to source files for detail so it won't drift.

## Documents

| Doc | Tier | Answers | Status |
|---|---|---|---|
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Domain & Data | The 72-model shape, invariants, the two isolation mechanisms | ✅ |
| [`API-CONTRACTS.md`](./API-CONTRACTS.md) | Architecture | ~150 server actions + 26 API routes, the action contract | ✅ |
| [`GLOSSARY.md`](./GLOSSARY.md) | Domain & Data | Locked Arabic/English for every domain term | ✅ |
| [`ADRS.md`](./ADRS.md) | Architecture | 9 immutable "why" decisions (auth, enums, read-mostly brain, …) | ✅ |
| [`TEST-STRATEGY.md`](./TEST-STRATEGY.md) | Quality | What's tested, the coverage gaps, the Definition of Done | ✅ |
| [`THREAT-MODEL.md`](./THREAT-MODEL.md) | Security | Assets, trust boundaries, threats + controls, pre-launch checklist | ✅ |
| **PRD** (per capability) | Product | User stories, **acceptance criteria**, non-goals, success metrics | ⏳ needs product intent (do with Anas) |

## Already-strong docs elsewhere (not duplicated here)
- Roadmap → `docs/PHASES-INTELLIGENCE.md`
- Design language → `docs/DESIGN-SKILL.md`
- Brain architecture → `docs/BLUEPRINT.md`, `lib/brain/README.md`
- Tenancy checklist → `docs/ISOLATION.md`
- Ops/deploy → `docs/RUNBOOK.md`, `docs/DEPLOYMENT.md`, `docs/READINESS.md`
- Git workflow → `docs/GITHUB-WORKFLOW.md`
- Conventions → `CLAUDE.md`

## How to use this set
Read `DATA-MODEL` + `API-CONTRACTS` + `GLOSSARY` to understand the system;
`ADRS` for why it's shaped this way; `TEST-STRATEGY` + `THREAT-MODEL` for the
quality and security bars. Then, per feature, write the **PRD** (the one doc that
needs human product intent) and build against the whole set — generating
per-module execution prompts as `docs/RE-INFRASTRUCTURE-PLAN.md` §1 describes.
