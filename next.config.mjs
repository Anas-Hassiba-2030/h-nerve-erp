// Production-grade HTTP security headers. We deliberately omit a strict
// Content-Security-Policy here — Next.js's inline scripts plus the project's
// recharts/lucide bundles need careful nonce wiring to ship CSP without
// breakage. Add CSP in a follow-up after testing every page.
const securityHeaders = [
  // Tell browsers and intermediaries to use HTTPS for the next two years.
  // includeSubDomains + preload makes us eligible for the HSTS preload list.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block clickjacking via iframe embedding from any origin.
  { key: "X-Frame-Options", value: "DENY" },
  // Disable MIME-sniffing — every response is taken at its declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs to third-party origins on link clicks.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful browser APIs we don't use anywhere in the ERP.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
  // Cross-origin isolation — keeps our window separate from any embed.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Phase 12 — CSP ENFORCED. The policy was validated in Report-Only
  // across every page; it intentionally keeps script-src/style-src
  // 'unsafe-inline' 'unsafe-eval' because Next.js's runtime + recharts
  // require them without nonce wiring, so enforcing this exact policy
  // changes no page behavior — it only blocks unlisted origins
  // (foreign script/connect/object/frame). Tighten by removing the
  // unsafe-* tokens once a nonce pipeline lands (post-pitch).
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // BUG-C — globals.css @imports the Heritage type stack from Google
      // Fonts. Without these two origins the CSP blocks the stylesheet +
      // woff2 files and the whole app silently falls back to system fonts
      // (off-brand: no Reem Kufi / Cairo / Inter). See app/globals.css:3.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma 6 Rust-free client (engineType="client"): pure TypeScript, no WASM
  // library engine, no eval. It is generated into src/generated/prisma and
  // aliased back to "@prisma/client" (tsconfig paths), so it must be BUNDLED
  // like any local module — the old `serverExternalPackages: ["@prisma/client"]`
  // (needed when the WASM engine had to be externalized) now mis-resolves the
  // aliased local client and yields a runtime ChunkLoadError on the Worker.
  serverExternalPackages: [".prisma/client"],
  // libsql is the LOCAL-ONLY database driver (file: SQLite for dev/seeds);
  // production uses the D1 binding. Its native .node binaries can never run
  // on workerd, but Next's output file tracing follows the createRequire in
  // db.ts/_prisma.ts and copies the whole package into the server bundle,
  // where wrangler's bundler then dies on optional deps
  // ("Could not resolve @libsql/isomorphic-ws"). Exclude it from tracing —
  // the Worker never executes that code path.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@prisma/adapter-libsql/**",
      "node_modules/@libsql/**",
      "node_modules/libsql/**",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // The Prisma 6 cloudflare-runtime client imports its query-compiler as
  // `query_compiler_bg.wasm?module`. Under the webpack builder (forced in
  // open-next.config.ts, since Turbopack emits an absolute wasm import path
  // that wrangler's module-collector can't resolve), webpack needs the
  // async-WebAssembly experiment enabled to parse that import instead of
  // failing with "Module parse failed: Unexpected character".
  webpack(config) {
    config.experiments = { ...(config.experiments ?? {}), asyncWebAssembly: true };
    return config;
  },
  // Next 16 defaults `next dev` to Turbopack and hard-errors when a
  // `webpack()` hook exists with no matching `turbopack` key (it can't tell
  // the hook above is production-build-only, applied by open-next.config.ts).
  // Empty object = local dev keeps using Turbopack as normal; the webpack()
  // hook still fires for the Cloudflare/OpenNext production build untouched.
  turbopack: {},
  async headers() {
    // The /orrery page renders the cinematic hub in a SAME-ORIGIN <iframe>
    // pointing at /hub/index.html (static asset — deliberately NOT under
    // /orrery, which is a Next route; on Cloudflare Workers the assets layer
    // would shadow the route). The global X-Frame-Options: DENY + CSP
    // frame-ancestors 'none' would block that frame, so relax ONLY this
    // one document to same-origin framing. Everything else stays DENY.
    const orreryFrameHeaders = securityHeaders.map((h) => {
      if (h.key === "X-Frame-Options") return { key: h.key, value: "SAMEORIGIN" };
      if (h.key === "Content-Security-Policy")
        return {
          key: h.key,
          value: h.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
        };
      return h;
    });
    return [
      {
        // The embedded Orrery hub doc — allow same-origin framing.
        source: "/hub/index.html",
        headers: orreryFrameHeaders,
      },
      {
        // Every other route — including API and static assets — stays strict.
        // Negative lookahead excludes the hub doc so its relaxed rule above
        // isn't shadowed by a duplicate X-Frame-Options / CSP header.
        source: "/((?!hub/index\\.html).*)",
        headers: securityHeaders,
      },
    ];
  },
  // Don't expose Next's runtime fingerprint via the X-Powered-By header.
  poweredByHeader: false,
};

export default nextConfig;
