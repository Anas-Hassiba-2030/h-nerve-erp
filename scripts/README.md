# `scripts/` — operational & developer scripts

One-off and operational scripts, grouped by purpose. They are **not** part of
the app bundle; run them with `npx tsx scripts/<group>/<file>.ts` (TypeScript)
or `node scripts/<group>/<file>.mjs`.

TypeScript scripts import shared code via the `@/` path alias (e.g.
`@/lib/db`), so they are independent of folder depth.

| Folder | Purpose |
|--------|---------|
| `seed/` | Seed & bootstrap data. Includes the deploy-wired `seed-if-empty.ts` (idempotent prod bootstrap) and `ensure-admins.ts` (login safety net) — both referenced by `railway.toml`. |
| `test/` | Manual integration/smoke scripts (isolation, message persistence, NS-1 flow, workflow studio). |
| `verify/` | Read-only audits & parity checks (revenue parity, F4, brain counts, sanity sweep). |
| `ops/` | Operational one-offs & guards (`guard-not-prod.js` — blocks destructive db commands against prod; admin/password utilities; e2e link check). |
| `build/` | Build-time generators (`build-orrery.mjs` — compiles the Orrery hub into `public/`). |

## Wired into automation (update these refs if you move a file)

- **`railway.toml`** → `seed/seed-if-empty.ts`, `seed/ensure-admins.ts` (run on every deploy).
- **`package.json`** → `ops/guard-not-prod.js`, `seed/seed-demo-extras.ts`, `seed/seed-production.ts`.

> `prisma/seed.ts` intentionally stays under `prisma/` — that's the path Prisma's
> `db seed` convention expects.
