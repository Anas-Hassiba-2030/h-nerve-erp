# H-Nerve — Operating Protocol (how to run & use the system)

Written for Anas, plain language. If you're lost, start here.
Last updated 2026-05-16.

---

## 1. How to run it

You have two ways. Use the right one for the moment.

### A) Demo / pitch (fast, recommended for showing people)
```
npm run build      # prepares an optimized version (one time, ~2 min)
npm run start      # runs the fast version
```
Open **http://localhost:3000**. This is **much faster** than dev mode —
use this for the pitch.

### B) While building/changing things (slower, auto-reloads)
```
npm run dev
```
Slower on purpose (it recompiles as code changes). The lag you felt was
mostly this + the remote database (see §6).

**Login:** `admin@hourani.jo`  /  `admin123`

---

## 2. The map — where everything is

| Doc | What it's for |
|---|---|
| `docs/OPERATING-PROTOCOL.md` | **This file** — how to run & use the system |
| `docs/READINESS.md` | Honest "is it production-ready" assessment |
| `docs/PRODUCTION-ROADMAP.md` | The phase plan + status (single source of truth) |
| `docs/PITCH-WALKTHROUGH.md` | Screen-by-screen pitch review + screenshots |
| `docs/SMOKE-2026-05-16.md` | Last full test (PASS) |
| `docs/PERFORMANCE.md` | Why it felt laggy + the fix order |

Everything is committed to git on the `main` branch. When you reopen the
session, your work is all there — nothing is lost.

---

## 3. The main areas (what each does)

- **Dashboard** (`/dashboard`) — the whole group's pulse: revenue, alerts,
  every unit at a glance.
- **Companies** (`/companies`) — the 5 Hourani units. **Click "دخول مساحة
  العمل" (Enter workspace)** on a company → you enter **that company's own
  detailed ERP Command Center** (this is the feature you wanted deeper —
  see Phase G1; now sector-specific and detailed). The top banner
  "الخروج إلى كل الشركات" takes you back out.
- **Verticals** — Hotels (Arena), Dairy (Maha), Farms (Loran), Education
  (AAU): each unit's operational detail.
- **Finance** — P&L, transactions, margins for the group or the active
  company.
- **Brain** (`/brain/*`) — the AI: Council (multi-expert debate),
  Scenarios (what-if), Memory, IQ. **These cost money now** (see §4).
- **Admin** (`/admin/*`) — superadmin (tenants, empire). ADMIN role only.

---

## 4. "Rebuild the brain" / the AI — what it is & the cost

There's an action that **regenerates the AI insights** (the "run AI
engine" / rebuild button on the Insights area, and the Brain/Council
pages). Here's the plain truth:

- The API key is now installed, so the Brain runs **for real** (genuine
  AI reasoning), **not** the old canned text.
- **This spends your $10 Anthropic credit** — a few cents per run.
- **When to use it:** to show the *real* intelligence in the pitch, or to
  refresh insights after data changes. Click it deliberately, not
  repeatedly.
- **To make it free again** (canned mode, e.g. practicing the demo): remove
  the `ANTHROPIC_API_KEY` line from `.env` and restart. Put it back to go
  live again.

You don't "rebuild the brain" to fix bugs — it just re-runs the AI over
the current data.

---

## 5. Common errors & what to do

| You see… | What it is | Fix |
|---|---|---|
| A wall of welcome pop-ups | Onboarding modals | Already disabled on the demo (`NEXT_PUBLIC_DISABLE_INTRO=1` in `.env`). |
| First click after starting does nothing | Dev mode is still compiling | Wait ~5s, reload once. Not a bug. Production build (§1A) avoids it. |
| AI text looks generic/canned | No API key loaded | Confirm `ANTHROPIC_API_KEY` is in `.env`, restart the server. |
| Garbled Arabic + English word | Old bug | Fixed. If seen, you're on an old build — rebuild (§1A). |
| Everything feels slow | Dev mode + remote DB | See `docs/PERFORMANCE.md`. Short answer: production build + (for local demo) optionally switch to local SQLite. |
| "Company shows JOD 0 / -100%" | Old seed | Fixed + reseeded. If seen: `npm run db:reset` (wipes demo data, reseeds — safe, it's all generated). |
| Login won't proceed | Server mid-compile or DB unreachable | Reload; check the server terminal for errors; ensure internet (Neon DB is online). |

**General rule when something breaks:** (1) note the exact message, (2)
reload, (3) if still broken, restart the server, (4) if still broken,
that's a real bug — write it down with the message and we fix it as a
task. You don't have to diagnose it yourself.

---

## 6. The database (why it felt heavy) — SQLite vs Postgres

- **Now:** the app uses **Neon Postgres** (cloud, real, multi-user ready).
  Good for a real pilot. But every screen now waits on a network trip to
  Europe → a bit slower locally.
- **For a fast local pitch demo** you can switch back to the local file
  database: in `.env` comment the Neon `DATABASE_URL`, uncomment the
  `file:./dev.db` line; in `prisma/schema.prisma` set `provider = "sqlite"`;
  run `npm run db:reset`. (The revert steps are written in those files.)
- Keep Postgres for the actual pilot/production. Use SQLite if the laptop
  demo needs to feel instant.

---

## 7. Pitch-day checklist

1. `npm run build` then `npm run start` (fast mode).
2. Confirm `.env` has `ANTHROPIC_API_KEY` (live Brain) and
   `NEXT_PUBLIC_DISABLE_INTRO=1` (no pop-ups).
3. Check the laptop has internet (Neon) — or switch to SQLite (§6) for
   zero network dependency.
4. Log in `admin@hourani.jo` / `admin123`.
5. Demo path: Dashboard → Companies → **Enter a company's workspace**
   (the Command Center) → a vertical → Finance → one Brain/Council moment
   (this spends a few cents — that's fine, it's the differentiator).
6. After the pitch: **rotate the API key and the Neon DB password** (both
   were shared in chat).

---

## 8. Resuming work / sessions

- All progress is committed to git (`git log` shows the history).
- Reopen the project in a new session; everything is on `main`.
- The phase plan & status is always in `docs/PRODUCTION-ROADMAP.md`.
- Memory of decisions persists across sessions (you don't need to
  re-explain the project each time).
