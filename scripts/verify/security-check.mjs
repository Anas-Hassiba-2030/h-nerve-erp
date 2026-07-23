#!/usr/bin/env node
// Automated security probe — one command, ~10 seconds, zero dependencies.
//
//   node scripts/verify/security-check.mjs [base-url]
//
// Probes the LIVE deployment (default: production Worker) and exits 1 if any
// shield is missing. Read-only: only GET requests, never mutates anything.
// The manual companion is docs/security/CHECKLIST.md.

const BASE = (process.argv[2] || "https://h-nerve-erp.anashasiba91.workers.dev").replace(/\/$/, "");

let failures = 0;
const ok = (name) => console.log(`  ✅ ${name}`);
const bad = (name, detail) => {
  failures++;
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
};

async function probe(path, { redirect = "manual" } = {}) {
  const res = await fetch(BASE + path, { redirect, headers: { "user-agent": "hnerve-security-check" } });
  return res;
}

console.log(`Security check against ${BASE}\n`);

// ── 1. Strict CSP on app pages ─────────────────────────────────────────────
try {
  const res = await probe("/login");
  const csp = res.headers.get("content-security-policy") || "";
  const script = csp.split(";").find((d) => d.trim().startsWith("script-src")) || "";
  if (!csp) bad("CSP present on /login", "no content-security-policy header");
  else {
    csp.includes("nonce-") ? ok("CSP uses per-request nonce") : bad("CSP uses per-request nonce", csp.slice(0, 80));
    !script.includes("unsafe-inline") ? ok("script-src has NO unsafe-inline") : bad("script-src has NO unsafe-inline");
    !csp.includes("unsafe-eval") ? ok("CSP has NO unsafe-eval") : bad("CSP has NO unsafe-eval");
    csp.includes("frame-ancestors 'none'") ? ok("clickjacking blocked (frame-ancestors 'none')") : bad("frame-ancestors 'none'");
    csp.includes("object-src 'none'") ? ok("object-src 'none'") : bad("object-src 'none'");
  }
  res.status === 200 ? ok("/login reachable (200)") : bad("/login reachable", `status ${res.status}`);
} catch (e) {
  bad("probe /login", String(e));
}

// ── 2. Hub keeps its own static CSP + same-origin framing ──────────────────
try {
  const res = await probe("/hub/index.html");
  const csp = res.headers.get("content-security-policy") || "";
  csp.includes("frame-ancestors 'self'") ? ok("hub frame-ancestors 'self'") : bad("hub frame-ancestors 'self'", csp.slice(0, 80));
  /sameorigin/i.test(res.headers.get("x-frame-options") || "") ? ok("hub X-Frame-Options SAMEORIGIN") : bad("hub X-Frame-Options SAMEORIGIN");
} catch (e) {
  bad("probe /hub/index.html", String(e));
}

// ── 3. Auth gate: protected page must not render for anonymous ─────────────
try {
  const res = await probe("/dashboard");
  // Anonymous hit → redirect to /login (any 3xx to login is a pass).
  const loc = res.headers.get("location") || "";
  res.status >= 300 && res.status < 400 && loc.includes("/login")
    ? ok("anonymous /dashboard redirects to /login")
    : bad("anonymous /dashboard redirects to /login", `status ${res.status} → ${loc || "(none)"}`);
} catch (e) {
  bad("probe /dashboard", String(e));
}

// ── 4. Signup closed in production ─────────────────────────────────────────
try {
  const res = await probe("/signup", { redirect: "manual" });
  // Closed = redirect away or an explicit disabled page; a plain 200 signup
  // form would be a regression. We accept 3xx, 404, 410.
  res.status !== 200
    ? ok(`prod signup not openly served (status ${res.status})`)
    : bad("prod signup closed", "GET /signup returned 200");
} catch (e) {
  bad("probe /signup", String(e));
}

// ── 5. Health + readiness endpoints ────────────────────────────────────────
try {
  const res = await probe("/api/health");
  res.status === 200 ? ok("/api/health 200") : bad("/api/health 200", `status ${res.status}`);
} catch (e) {
  bad("probe /api/health", String(e));
}

// ── 6. Cron endpoint refuses calls without CRON_SECRET ─────────────────────
try {
  const res = await probe("/api/cron/brain");
  res.status === 401 || res.status === 403 || res.status === 404
    ? ok(`cron endpoint locked without secret (status ${res.status})`)
    : bad("cron endpoint locked", `status ${res.status}`);
} catch (e) {
  bad("probe cron endpoint", String(e));
}

console.log(failures === 0 ? "\nAll shields up. ✅" : `\n${failures} check(s) FAILED. ❌`);
process.exit(failures === 0 ? 0 : 1);
