# Security — الحماية

This folder is the single home for everything security. Plain language first,
technical detail second. If you only read one file, read this one.

| File | What it is |
|------|------------|
| `README.md` | The map — what protects the system, and where each shield lives. |
| `CHECKLIST.md` | The audit — every check we run, how to run it, current status. |
| `INCIDENT.md` | The emergency playbook — exactly what to do if something is breached. |

Automated probe: `node scripts/verify/security-check.mjs` — hits the live site
and fails loudly if any shield is missing. Run it after every deploy.

## The shields (plain language)

1. **One locked front door.** Sign-in uses an encrypted cookie
   (`iron-session`); passwords are stored hashed (`bcryptjs`), never as text.
   If the server's session secret is missing in production the app refuses to
   start instead of running unlocked (fail-closed, PR #351). Public signup is
   closed in production (PR #351).

2. **Rooms only your role can enter.** Every route has a role rule
   (`src/lib/auth/permissions.ts`), enforced for every request in
   `src/middleware.ts` (`H_NERVE_PERMS_ENFORCED="true"`, PR #353). A CI test
   walks the real route folders — a new page without a rule fails the build.

3. **A guard that slows down burglars.** The login door accepts at most
   8 attempts per minute per IP (middleware rate limit). Too many tries →
   "wait a minute" — brute-force guessing becomes useless.

4. **Scripts need a stamped ticket.** Strict Content-Security-Policy: every
   page load mints a one-time nonce, and only scripts carrying it may run
   (PR #355). No `unsafe-inline`, no `unsafe-eval` — the classic XSS
   injection path is dead. Kill switch: `H_NERVE_CSP_STRICT=false`.

5. **Tenants cannot see each other.** All queries go through a scoped Prisma
   client that filters by workspace/tenant. Cross-tenant access requires the
   raw client plus a written `// CROSS-TENANT INTENT:` justification
   (`docs/ISOLATION.md`).

6. **The Brain proposes, never mutates.** The AI layer is read-mostly; every
   change goes through the same server actions humans use, so it is
   auditable and cannot be tricked into silent writes. Retrieved documents
   pass `ragGuard.ts`, which redacts prompt-injection text before the model
   reads it.

7. **Secrets never live in the repo.** Runtime secrets sit on the Cloudflare
   Worker (`wrangler secret put`); `.env` is gitignored; a `gitleaks` scan
   runs in CI on every push (PR #292).

8. **Dependencies are watched.** `npm audit` is kept at 0 high-severity
   findings (PRs #291, #347). Scheduled endpoints (crons) require
   `CRON_SECRET`.

9. **A robot re-tests the doors.** The Playwright e2e suite (PR #354) logs
   in, logs out, walks the navigation, and tries forbidden pages with the
   wrong role on every CI run — regressions are caught before deploy.

10. **Nothing is truly deleted by accident.** Destructive deletes go through
    the soft-delete Trash first (`src/lib/db/softDelete.ts`).
