// Flat config (ESLint 9 / Next 16). Replaces .eslintrc.json — Next 16 removed
// the `next lint` command, so we run ESLint directly against this config.
// eslint-config-next ships its rules as a flat-config array.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...nextCoreWebVitals,
  {
    // Flat config resolves a "react-hooks/…" rule only if the plugin is
    // registered in scope; eslint-config-next v16 stopped exporting it under
    // that key, which made every `npm run lint` die with "could not find
    // plugin react-hooks". Register it explicitly.
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      // Deliberate <a href="/api/export/..."> download links target API
      // routes, not pages — next/link is wrong for file downloads.
      "@next/next/no-html-link-for-pages": "off",
      // New React-Compiler advisory rules shipped with
      // eslint-plugin-react-hooks v6 (Next 16). Next 14 never enforced
      // these; adopting them is a separate refactor. Kept as warnings so
      // the tech-debt stays visible without blocking the security upgrade.
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      // Cloudflare/OpenNext BUILD OUTPUT — bundled multi-thousand-line
      // .mjs handlers. Linting it produced every "error" in the repo and
      // blew the V8 heap (the react-compiler rules against a 14k-line
      // bundle). Never lint build artifacts.
      ".open-next/**",
      "node_modules/**",
      "graphify-out/**",
      "prisma/generated/**",
      // Static design-kit mockups shipped as assets — not app source.
      // (The old `next lint` only scanned app/components/lib, never public/.)
      "public/**",
      "docs/**",
      // Claude session worktrees are throwaway checkouts, not app source.
      ".claude/worktrees/**",
    ],
  },
];
