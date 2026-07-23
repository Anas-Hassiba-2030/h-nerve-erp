# Security checklist — how to verify every shield

Run the fast version any time:

```bash
node scripts/verify/security-check.mjs
```

It probes the live deployment and exits non-zero on any failure. The table
below is the full manual list behind it. Status column = last verified
2026-07-23 (wave-3 hardening + #356).

| # | Check | How to verify | Status |
|---|-------|---------------|--------|
| 1 | Strict CSP on pages (nonce, no unsafe-inline/eval in script-src) | `security-check.mjs` header probe, or DevTools → Network → response headers on `/login` | ✅ |
| 2 | Hub keeps its own legacy CSP + `frame-ancestors 'self'` | probe `/hub/index.html` headers | ✅ |
| 3 | Clickjacking blocked (`frame-ancestors 'none'` on app pages) | header probe | ✅ |
| 4 | Perms enforced: STAFF blocked from `/admin`, `/integrations`, `/trash` | e2e `perms.spec.ts` in CI; manual: sign in as staff, expect bounce to `/dashboard` | ✅ |
| 5 | Every route classified in the permission map | `npm test` → `permissions.coverage.test.ts` fails on unclassified routes | ✅ |
| 6 | Login rate limit (8/min/IP on `/login` + `/portal/login` POST) | 9 rapid bad logins → "Too many login attempts" | ✅ |
| 7 | Session secret fail-closed in prod | code: `src/lib/auth/session.ts`; missing secret must throw, not fall back | ✅ |
| 8 | Prod signup closed | GET `/signup` on live → disabled/redirect | ✅ |
| 9 | No secrets in git history/pushes | `gitleaks` CI job green | ✅ |
| 10 | npm audit: 0 high/critical | `npm audit --omit=dev` | ✅ |
| 11 | Tenant scoping: no naked `prismaUnscoped` | grep `prismaUnscoped` — every call site carries `// CROSS-TENANT INTENT:` | ✅ |
| 12 | Cron endpoints require `CRON_SECRET` | call cron URL without header → 401 | ✅ |
| 13 | e2e suite green (auth, logout, nav, roles) | CI `e2e` job | ✅ |
| 14 | Brain read-mostly boundary intact | review: `src/lib/brain/` has no direct domain writes | ✅ |

## Accepted risk (won't-fix, documented)

- **`@hono/node-server` <2.0.5 — Windows path traversal in `serve-static`
  (GHSA-frvp-7c67-39w9, moderate)**. Pulled in transitively by
  `@modelcontextprotocol/sdk`, which pins `^1.19.9` — no patched 1.x release
  exists, and bumping to 2.x breaks the SDK's own dependency range. Real
  exposure: near zero. `serve-static` is never invoked — the Brain's MCP
  server (`scripts/ops/brain-mcp.ts`) is stdio-only, not an HTTP server, and
  nothing in this repo serves static files through Hono. Re-check on every
  `@modelcontextprotocol/sdk` bump (`npm view @modelcontextprotocol/sdk
  dependencies.@hono/node-server`) — once the SDK allows 2.x this clears
  itself via `npm install`.

## Cadence

- **After every deploy**: run `security-check.mjs` (one command, ~10s).
- **Weekly**: `npm audit --omit=dev`, glance at CI e2e history.
- **After any auth/middleware/header change**: full table above.
- **Before adding a route**: add its rule to `src/lib/auth/permissions.ts`
  (CI forces this anyway).
