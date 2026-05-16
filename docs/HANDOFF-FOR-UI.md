# Handoff — UI / interface lane (read this first)

You are picking up **only the visual / interface layer** of H-Nerve ERP.
Anas will give you screenshots of things he wants changed visually.

## Read these first (in order), before touching anything
1. `CLAUDE.md` — project rules. **Mandatory.**
2. `docs/DESIGN-SKILL.md` — the design language (Heritage Modern is the
   default). **You must stay inside this — do not invent new styles or mix
   vocabularies.** This is the single most important file for UI work.
3. `docs/OPERATING-PROTOCOL.md` — how the system runs + what each screen is.
4. `docs/PRODUCTION-ROADMAP.md` — what's already done (Phases A–G); don't
   redo or undo it. Recent work: `git log --oneline -20`.

## Your lane (only these)
- `components/**`, `app/globals.css`, and the **visual JSX** of pages
  (layout, spacing, colors, typography, copy) under `app/`.
- Match the existing Heritage tokens/classes; Arabic-first + RTL.

## Hard rules (3 people work in this one repo in parallel)
- **Do NOT touch:** `lib/**`, `prisma/**`, any `actions.ts`, `.env*`,
  `.claude/**`, `docs/**`, `app/(app)/workspace/page.tsx` logic, `*.test.ts`.
  Visual/JSX/CSS only.
- **Do NOT run git** (someone else commits). **Do NOT run
  `npm run dev` / `build` / `start`** — a production server is already
  running on **http://localhost:3000** (login `admin@hourani.jo` /
  `admin123`); use it to see your changes. Restarting/another build
  collides.
- After edits, sanity-check: the page still renders at :3000 and the
  design still matches `docs/DESIGN-SKILL.md`.

## Current state (so you don't repeat work)
Pitch-ready build on Neon Postgres. Branding is already neutralized to
"Hourani Group · H-Nerve" (do not reintroduce personal names). The
per-company ERP lives at `/workspace` (Command Center). Modal wall is
disabled on this machine. Everything is committed on `main`.

When done with a change, tell Anas what you changed and which file — he
will relay it; another worker handles commits.
