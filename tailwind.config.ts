import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-driven (CSS vars). Brand utilities still work for legacy code.
        brand: {
          50:  "color-mix(in srgb, var(--brand) 6%, white)",
          100: "color-mix(in srgb, var(--brand) 12%, white)",
          200: "color-mix(in srgb, var(--brand) 22%, white)",
          300: "color-mix(in srgb, var(--brand) 38%, white)",
          400: "color-mix(in srgb, var(--brand) 60%, white)",
          500: "var(--brand)",
          600: "color-mix(in srgb, var(--brand) 90%, black)",
          700: "color-mix(in srgb, var(--brand-deep) 80%, var(--brand))",
          800: "var(--brand-deep)",
          900: "color-mix(in srgb, var(--brand-deep) 80%, black)",
          950: "color-mix(in srgb, var(--brand-deep) 60%, black)",
          DEFAULT: "var(--brand)",
          soft: "var(--brand-soft)",
          deep: "var(--brand-deep)",
        },
        gold: {
          50:  "color-mix(in srgb, var(--accent) 8%, white)",
          100: "color-mix(in srgb, var(--accent) 16%, white)",
          500: "var(--accent)",
          600: "color-mix(in srgb, var(--accent) 90%, black)",
          700: "color-mix(in srgb, var(--accent) 70%, black)",
          DEFAULT: "var(--accent)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          50:  "color-mix(in srgb, var(--surface) 60%, white)",
          100: "var(--surface)",
          200: "color-mix(in srgb, var(--text-muted) 14%, transparent)",
          900: "var(--surface-elevated)",
        },
        ink: {
          DEFAULT: "var(--text)",
          muted:   "var(--text-muted)",
          border:  "var(--border)",
        },
      },
      fontFamily: {
        sans: ["Cairo", "Tajawal", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Cairo", "Tajawal", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 50%, var(--accent) 110%)",
        "gold-gradient": "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, black) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
