# Phase 15 — Voice / Web Speech

Phase definition: `docs/PHASES-INTELLIGENCE.md` §"Phase 15 — The Voice & Conversational Layer" (lines 367-382). Pitch: press a key, ask, the brain answers in voice + text with drill-through citations; follow-ups remember context.

## Current state (what already exists in the repo, with file paths)

This phase is ~80% built — the spec's three named files all exist and are wired into the app.

- `components/Conversational.tsx` — the full overlay. `"use client"`. Opened by `⌘J`/`Ctrl+J` (note: spec says `⌘K`, but `⌘K` is reserved for `components/CommandPalette.tsx`). ESC closes and cancels in-flight TTS + recognition. Implements: voice-in via `SpeechRecognition`/`webkitSpeechRecognition` (`toggleListen`, interim results, auto-submit on final), voice-out via `speechSynthesis` (`speakAnswer`, warm-female voice picker `pickWarmFemaleVoice`), the real-time spoken-word underline via the `onboundary` event (`cv-word.is-live`), line-by-line typewriter reveal, and first-class citation chips (`renderBrainText` parses `[c1]` tokens; chips are `tabIndex={0}`, Enter/click navigate via `window.location.assign(href)`).
- `lib/brain/converse.ts` — multi-turn context manager. `ask()` keeps an in-memory `SESSIONS` map (`MAX_TURNS_PER_SESSION = 24`), pulls a `FactPack` from Prisma (`pullFacts`), runs deterministic `stubAnswer` per detected topic, and calls `callLlm` (LIVE when `ANTHROPIC_API_KEY` set, else STUB). Already integrates RAG: `retrieveDocuments`, `evaluateRetrieval` (CRAG), `sanitizeForPrompt` (ragGuard). Returns `{ brainTurn, session }` with citations + confidence + `ms`.
- `app/api/converse/route.ts` — `POST /api/converse`, `runtime = "nodejs"`. Auth-gated (`getCurrentUser` → 401), validates `sessionId`/`question`, caps question at 800 chars, returns `{ brainTurn, sessionTurns }`.
- Mount + triggers: `app/(app)/layout.tsx:133` renders `<Conversational locale={locale} />`. `components/CommandPalette.tsx:150` and `components/orrery/FabRail.tsx:29` fire the `h-nerve:converse:open` custom event.
- Styling: `app/globals.css` from ~line 5134 — `.cv-*` classes (24 matches for the core selectors). Aesthetic note: implemented as the night-emerald "مستشار الدماغ" advisor look, NOT the "Brutalist Confidence / accent-yellow on ink" the spec calls for.
- Dependencies confirmed present: `lib/brain/llm.ts`, `documents.retrieve.ts`, `crag.ts`, `ragGuard.ts`.

## Scope (what "shipping this phase" concretely means)

Close the gap between "works in a demo" and "shippable": (1) reconcile the aesthetic and trigger with the spec (or amend the spec), (2) make session memory survive a server restart / multi-instance deploy (currently a per-process `Map`, which silently loses context on Postgres-backed prod), (3) harden Web Speech for cross-browser reality (Safari/Firefox lack `SpeechRecognition`; voices load async), and (4) add the missing test coverage (`lib/brain/converse.test.ts` does not exist).

## Files to touch

- MODIFY `lib/brain/converse.ts` — persist sessions (decision: keep in-memory for demo vs. add a `ConverseSession` Prisma model); the file's own comment (lines 63-68) already flags this as the intended prod path.
- MODIFY `prisma/schema.prisma` — add `ConverseSession`/`ConverseTurn` models (string columns for role, per CLAUDE.md no-enum rule) if persistence is chosen; register in `TENANT_SCOPED_MODELS` (`lib/workspaceScope.ts`).
- NEW `lib/brain/converse.test.ts` — unit-test `detectTopic`, `stubAnswer` shape/citation ids, CRAG confidence haircut. Pure-unit, fits `npm test`.
- MODIFY `components/Conversational.tsx` — graceful "voice unsupported" banner (today it overwrites the draft with a string), confirm RTL underline tracking for Arabic, decide `⌘J` vs `⌘K`.
- MODIFY `app/globals.css` (`.cv-*` block) — only if the Brutalist aesthetic reconciliation is accepted.
- MODIFY `docs/PHASES-INTELLIGENCE.md` §Phase 15 — amend `⌘K`→`⌘J` and the aesthetic if the team keeps current implementation.

## Risks (technical + product, ranked)

1. **Session memory is per-process in-memory** (`SESSIONS` Map). On Vercel/serverless prod (Neon Postgres, per `project_phase11_prod_cutover`), follow-up "why is the variance widening?" loses context across cold starts/instances — directly breaks the spec's headline "it remembers the context."
2. **Web Speech browser support.** `SpeechRecognition` is Chrome/Edge-only; Safari and Firefox have no voice-in. Arabic STT/TTS quality varies wildly by OS. Product risk: the pitch's "talk to it" moment may simply not fire on the demo machine's browser.
3. **Aesthetic + trigger drift from spec** (`⌘J` not `⌘K`; advisor look not Brutalist). Low technical risk, but it's a documented-vs-built divergence to resolve.
4. **No test coverage** for the converse brain — `npm test` (CLAUDE.md gate for `lib/` changes) currently exercises none of it.
5. **TTS reads citation markers** — `speakAnswer` strips `[`/`]` for word-edge mapping, but verify the spoken stream doesn't vocalize "c1".

## Recommended slice size (2-4 landable PRs, each behaviour-preserving where possible)

- **PR 1 — Tests + small hardening (behaviour-preserving).** Add `lib/brain/converse.test.ts`; fix the "voice unsupported" UX to a banner instead of clobbering the draft; confirm async voice-load. No API/contract change.
- **PR 2 — Session persistence.** Add `ConverseSession`/`ConverseTurn` models + `db:push`, swap the in-memory `Map` for a Prisma-backed store behind the same `getOrCreate`/`getSession` signature so `ask()` and the route are untouched. Tenant-scope per `docs/ISOLATION.md`.
- **PR 3 — Spec reconciliation (docs + optional aesthetic).** Amend `PHASES-INTELLIGENCE.md` to match reality (`⌘J`, advisor look), OR re-skin `.cv-*` to Brutalist — pick one, isolated to CSS + the doc.
