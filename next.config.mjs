// Production-grade HTTP security headers. We deliberately omit a strict
// Content-Security-Policy here — Next 14's inline scripts plus the project's
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
  // Phase 12 — CSP shipped in REPORT-ONLY: the policy is evaluated and
  // violations are reported by the browser, but nothing is blocked, so
  // Next 14's inline/eval runtime + recharts can't break. Review the
  // live browser console, then flip the key to
  // "Content-Security-Policy" (drop -Report-Only) to enforce.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
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
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        // Apply to every route — including API and static assets.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Don't expose Next's runtime fingerprint via the X-Powered-By header.
  poweredByHeader: false,
};

export default nextConfig;
