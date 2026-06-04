# Why the app feels heavy — and how to make it fast

Short version: the app is not slow because of bad code. It is slow for
**three known reasons**. Fix them in the order below. The first two are
the big ones.

---

## The 3 reasons it feels laggy

### 1. You are running the DEV server (the slow one)

`npm run dev` is built for editing code, not for speed. It rebuilds
pages on every click and ships un-minified files. This is **normal** —
every Next.js app is slow in dev mode.

The fix is to run the **production build** instead. It is dramatically
faster (often 5–10x on page loads). Use this for the pitch.

### 2. The database is now far away (Neon, in Europe)

The data used to live in a file **on your laptop** (SQLite). It was
moved to Neon Postgres in the cloud (region: eu-west-2, London).

Every screen runs ~20 database queries. With the file on your laptop,
each query was almost instant. With Neon, each query now travels to
London and back — roughly **50–150 milliseconds extra, every query**.
The dashboard alone can add 1–3 seconds just from this network trip.

For a **local laptop pitch demo**, the fast option is to point the app
back at the local file. (Keep Neon for the real multi-user pilot — Neon
is correct for many people using it at once; it is just slow for a
single laptop demo because of the distance.)

### 3. The "live presence" feature was polling far too often

The floating cursors / live-avatars feature was contacting the server
**every 0.28 seconds** (about 3–4 times per second), forever, in the
background. That is a constant drain even when nothing is happening.

**This has been fixed in the code** (see "What was changed" below). You
do not need to do anything for #3 — it is already done.

---

## What to do — in order

### Step A — Run a production build (biggest win, do this for the pitch)

Stop the dev server, then run these two commands:

```bash
npm run build
npm run start
```

Then open the app at the address it prints (usually
`http://localhost:3000`). It will feel much faster than `npm run dev`.

> Note: `npm run build` also touches the database (it runs
> `prisma generate` and `db push`). That is expected and fine.
> If port 3000 is busy, stop the other server first.

### Step B — Use the local database for the laptop demo (biggest win against slowness #2)

The revert path is **already prepared** in two files:

1. In **`.env`** — comment the Neon line, uncomment the local-file line:

   ```bash
   # DATABASE_URL="postgresql://...neon.tech/neondb?..."   <- comment this
   DATABASE_URL="file:./dev.db"                            <- uncomment this
   ```

2. In **`prisma/schema/schema.prisma`** (the `datasource db` block near the
   top) — change the provider back to SQLite:

   ```prisma
   provider = "sqlite"
   ```

3. Re-sync and reseed the local database:

   ```bash
   npm run db:push
   npm run db:seed
   ```

After this, every query is instant again because the data is back on
your laptop. **Do this only for the local pitch demo.** For a real
multi-user pilot, keep Neon (it is the right choice when many people
use the app at the same time).

### Step C — The live-presence fix (already done, no action needed)

The polling frequency was reduced in the code. Background load dropped
by roughly **90×**. Nothing for you to do here.

---

## What was changed in the code (reason #3)

| File | Before | After |
|---|---|---|
| `components/realtime/RealtimePresence.tsx` | poll every **280 ms** visible, **1500 ms** hidden | poll every **25 s** visible, **60 s** hidden |
| `lib/realtime.ts` | session timeout **10 s** | session timeout **60 s** |

The session timeout was raised at the same time **on purpose**: if the
app only checks in every 25 seconds but the server forgets a user after
10 seconds, two real people would keep vanishing from each other's
screens. 60 seconds keeps everyone visible between the slower polls.

Trade-off (cosmetic only): the demo "CFO" ghost cursor runs an
18-second scripted loop. Because the screen now refreshes every 25
seconds instead of 4 times a second, that ghost cursor will slowly
drift across the screen between updates instead of stepping neatly
through its scripted path. This is a fair price for the much lighter
app, and it does not affect any real data or feature.

---

## What was checked but deliberately NOT changed

- **`next.config.mjs`** — left as-is on purpose. Next.js 14 already
  minifies production output by default (`swcMinify`). There is no safe,
  standard speed flag to add here; experimental flags were avoided to
  not risk breaking the build before the pitch.

- **The dashboard page (`app/(app)/dashboard/page.tsx`)** — inspected
  and left as-is. It is **already well optimized**: its ~21 database
  queries already run in parallel in two batches (`Promise.all`), not
  one-after-another. The only remaining small sequential call
  (`listPins`) is a single extra round-trip and not worth the risk of
  changing right before a pitch. The real speed wins for this page come
  from Step A (production build) and Step B (local database), not from
  changing the page code.

---

## TL;DR for the pitch laptop

```bash
# 1. point at the local DB (edit .env + prisma/schema/schema.prisma as in Step B)
npm run db:push
npm run db:seed

# 2. build and run the fast (production) server
npm run build
npm run start
```

That alone will make the app feel like a different product. Keep Neon
for the real pilot, not the laptop demo.
