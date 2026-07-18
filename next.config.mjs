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
  // OpenNext/Cloudflare Workers: Prisma's generated client + engine must be
  // treated as external server packages so OpenNext can patch them for the
  // workerd runtime. WITHOUT this, the bundler inlines @prisma/client and the
  // client falls back to booting its native/WASM library engine, whose loader
  // uses eval — which Workers blocks (`EvalError: Code generation from strings
  // disallowed`, the live login 500). This is the officially documented fix
  // (opennext.js.org/cloudflare/howtos/db). No effect on Railway/local Node.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    // The /orrery page renders the cinematic hub in a SAME-ORIGIN <iframe>
    // pointing at /orrery/index.html. The global X-Frame-Options: DENY +
    // CSP frame-ancestors 'none' would block that frame, so relax ONLY this
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
        source: "/orrery/index.html",
        headers: orreryFrameHeaders,
      },
      {
        // Every other route — including API and static assets — stays strict.
        // Negative lookahead excludes the hub doc so its relaxed rule above
        // isn't shadowed by a duplicate X-Frame-Options / CSP header.
        source: "/((?!orrery/index\\.html).*)",
        headers: securityHeaders,
      },
    ];
  },
  // Don't expose Next's runtime fingerprint via the X-Powered-By header.
  poweredByHeader: false,
};

export default nextConfig;
