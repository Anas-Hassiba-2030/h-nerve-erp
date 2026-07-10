# Phase 17 — Realtime depth

> Scope-only proposal. Grounded in `docs/governance/PHASES-INTELLIGENCE.md` § Phase 17 ("Real-Time Collaboration") and the code that already ships. No code changes proposed here.

## Current state (what already exists in the repo, with file paths)

The presence layer is **already partially built** — the phase doc's "WebSocket + Liveblocks/Yjs" plan was superseded by an SSE implementation (marked "W8" in the code).

- **`lib/realtime.ts`** — the substrate. An in-memory `SCOPES = Map<scopeId, {sessions, comments}>` store with a 90s TTL, plus an SSE pub/sub (`subscribe`/`notify`). Public API: `beat()`, `postComment()`, `dismissComment()`, `readScope()`, `normalizeScope()`. Phantom demo users (`phantomState()`) are **disabled** (`return { sessions: [], comments: [] }` at line 187; dead code below it).
- **`app/api/realtime/route.ts`** — `POST` (heartbeat / post comment), `GET ?scopeId&userId` (legacy read), `DELETE` (dismiss). Auth-gated via `getCurrentUser()`, `runtime = "nodejs"`, `force-dynamic`.
- **`app/api/realtime/stream/route.ts`** — the live READ path as SSE: immediate snapshot on connect, re-push on any `notify()`, 20s keepalive, teardown on `req.signal` abort.
- **`components/realtime/RealtimePresence.tsx`** — client root, mounted via `components/DeferredOverlays.tsx`. SSE inbound with 25s GET-poll fallback; 20s/60s POST heartbeat; 60fps RAF cursor interpolation (14–18% per frame ≈ the spec's 80ms ease); typing-focus detection.
- **`components/realtime/{Pip,Cursor,CommentBubble,TypingUnderline}.tsx`** — the four render primitives. CSS in `app/globals.css` (`rt-pip-stack`, `rt-comment`, `rt-cursor` — 23 occurrences).

**What the spec asked for vs. what exists:** presence pips ✅, interpolated cursors ✅, typing underline ✅, comment *rendering + dismiss* ✅. **Gaps:** (1) no UI for a real user to **author/place** a comment — `postComment` is only reachable by raw API; the in-app composers (`messages`, `council`) are unrelated features. (2) Comments are **ephemeral** — they live only in the in-memory map, are lost on restart, and don't survive multiple Railway replicas. (3) **No Prisma model** for comments (grep for `model Comment/Presence/Annotation` → none). (4) `scopeId` is a bare URL path with **no tenant scoping** — two tenants on the same path collide (violates `docs/architecture/ISOLATION.md`). (5) Highlight/passage-selection sharing from the wow moment doesn't exist.

## Scope (what "shipping this phase" concretely means)

1. **Persist comments** in Postgres (survive restart + replicas) while keeping the in-memory map as the hot presence cache. The store comment "doc says Redis in prod" — DB-backed comments are the durable equivalent.
2. **Comment authoring UX** — let a real user click anywhere on a collaborative surface, drop an anchored comment, and reply inline (the spec's "type a comment; you see them typing; you reply inline").
3. **Tenant-scope the realtime keys** — prefix `scopeId` with the active tenant slug so presence/comments never leak across tenants.
4. **Multi-replica correctness** — replace the single-process pub/sub so a `notify()` on replica A reaches an SSE client pinned to replica B (Postgres LISTEN/NOTIFY or a polling fallback). Required before this is trustworthy on Railway with `numReplicas > 1`.
5. **reduced-motion + a11y pass** on cursors/typing/comments (cross-cutting principle #4).

Explicitly **out of scope:** live co-editing of form fields / CRDT (Yjs), and re-enabling phantom demo users (a sales-demo toggle, not a feature).

## Files to touch

- **New** `prisma/schema.prisma` → `RealtimeComment` model (`tenantId`, `scopeId`, `authorId`, `body`, `anchorX/Y`, `createdAt`, `resolvedAt`); add to `TENANT_SCOPED_MODELS` in `lib/workspaceScope.ts`.
- **New** `components/realtime/CommentComposer.tsx` — click-to-anchor + textarea; posts to the existing `POST /api/realtime`.
- **New** `components/realtime/CommentThread.tsx` — replies under an anchored comment (or extend `CommentBubble.tsx`).
- **Modify** `lib/realtime.ts` — `postComment`/`dismissComment` write through to Prisma; `readScope` hydrates from DB; tenant-prefix in `normalizeScope` (or a new `scopeKey(tenant, url)`); replace the in-process `SUBSCRIBERS` fan-out with a cross-replica signal.
- **Modify** `app/api/realtime/route.ts` + `stream/route.ts` — pass tenant context, validate comment body with `zod`.
- **Modify** `components/realtime/RealtimePresence.tsx` — mount the composer, render reply threads, add `prefers-reduced-motion` guard on the RAF loop.
- **Modify** `app/globals.css` — composer/thread styles (Heritage Modern, ochre accent per spec).

## Risks (technical + product, ranked)

1. **Multi-replica fan-out (HIGH, technical).** SSE pub/sub is in-process only. On Railway with >1 replica, a comment posted on one replica won't push to peers on another. This is the load-bearing correctness risk for "realtime."
2. **Tenant leakage (HIGH, product/security).** Bare-path `scopeId` collides across tenants — a `prismaUnscoped`-class isolation bug. Must be fixed in the same PR that persists comments, not after.
3. **SSE connection cost (MED, technical).** Each viewer holds an open `nodejs` connection; many concurrent execs on one hot scope = many long-lived functions. Acceptable at pilot scale; revisit before high concurrency.
4. **Persistence churn (MED).** Cursor `beat()` fires every 20s/user — keep heartbeats in-memory only; persist comments only, never presence.
5. **Scope creep into co-editing (LOW-MED, product).** The wow moment ("they highlight a passage; you see the highlight") tempts CRDT work. Anchored comments deliver 80% of the demo value without Yjs — hold the line.

## Recommended slice size (2–4 landable PRs)

- **PR 1 — Tenant-scope the keys (behaviour-preserving).** Prefix `scopeId` with tenant slug across `lib/realtime.ts` + both API routes; no UX change. Closes the isolation gap first, on its own, so it can ship even if the rest slips.
- **PR 2 — Persist comments (behaviour-preserving for presence).** Add `RealtimeComment` model + `TENANT_SCOPED_MODELS` entry; make `postComment`/`dismissComment`/`readScope` write/read through Prisma with the in-memory map as cache. Comments now survive restart. Cursors/pips untouched.
- **PR 3 — Comment authoring UX (additive).** `CommentComposer` + reply thread + `RealtimePresence` mount + CSS. This is the user-visible half of the wow moment.
- **PR 4 — Multi-replica fan-out + a11y.** Postgres LISTEN/NOTIFY (or DB-poll) so `notify()` crosses replicas; add `prefers-reduced-motion` guard. Makes realtime correct under Railway's `numReplicas`.

PRs 1–2 are behaviour-preserving; 3 is purely additive; 4 hardens for production.
