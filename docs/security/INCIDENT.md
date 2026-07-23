# Incident playbook — if something goes wrong

Stay calm. Work top-down. Every step is copy-paste ready.

## 1. Suspected account/session compromise

Rotating the session secret instantly signs out EVERYONE (all cookies become
unreadable). This is the big red button and it is safe to press:

```bash
npx wrangler secret put SESSION_PASSWORD
```

Enter a fresh 32+ character random string. Then redeploy (or the change takes
effect on the next isolate). All users just sign in again — no data is lost.

Also: reset the affected user's password from `/admin` (Users console), and
check `/audit-360` for what the account touched.

## 2. Leaked API key (OpenRouter / Anthropic / Gemini)

```bash
npx wrangler secret put OPENROUTER_API_KEY   # or the affected key name
```

Revoke the old key in the provider's dashboard FIRST, then set the new one.
The Brain falls back to stub mode if no key works — the app stays up.

## 3. Leaked CRON_SECRET

```bash
npx wrangler secret put CRON_SECRET
```

Then update the same value in GitHub repo secrets (Actions use it too).

## 4. Suspicious scripts / XSS attempt on a page

The strict CSP already blocks unauthorized scripts. If the CSP itself causes
a production outage, the kill switch is a plain env var (no code change):
set `H_NERVE_CSP_STRICT=false` in `wrangler.jsonc` vars and redeploy.
Re-enable as soon as the page issue is fixed.

## 5. A role is seeing pages it should not

Immediate mitigation — turn route enforcement into lockdown-by-default is
already the state; to take a broken map offline instead, flip
`H_NERVE_PERMS_ENFORCED` to `"false"` in `wrangler.jsonc` and redeploy (the
per-page auth gates in each layout still apply). Fix the map in
`src/lib/auth/permissions.ts`, then flip back to `"true"`.

## 6. Bad deploy / site broken

Redeploy the previous good commit:

```bash
git checkout <last-good-sha>
gh workflow run cloudflare-deploy.yml --ref main
```

(or from the GitHub Actions tab: re-run the previous green deploy run).

## 7. Database emergency (D1)

Cloudflare D1 has Time Travel — point-in-time restore for the last 30 days:

```bash
npx wrangler d1 time-travel info h-nerve-erp
npx wrangler d1 time-travel restore h-nerve-erp --timestamp=<unix-ts>
```

Restore is destructive-forward (current state replaced) — take a bookmark
first with `info`, and only restore after confirming the damage window.

## Contacts / ownership

- Owner: Anas Hasiba — anashasiba91@gmail.com
- Hosting: Cloudflare Workers (account `anashasiba91`), DB: D1
- Repo: github.com/Anas-Hassiba-2030/h-nerve-erp
