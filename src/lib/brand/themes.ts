// brand/themes.ts — six theme presets a tenant can pick from at provisioning.
//
// Each preset overrides the Heritage CSS variables so the rest of the app
// follows automatically. The preset key is stored on TenantTheme.preset
// (Phase 11 of docs/governance/PHASES-INTELLIGENCE.md).

export type ThemeKey =
  | "heritage"
  | "ocean"
  | "ember"
  | "forest"
  | "monolith"
  | "pearl"
  | "midnight-nerve"
  | "desert-gold"
  | "obsidian";

export type ThemePreset = {
  key: ThemeKey;
  nameEn: string;
  nameAr: string;
  description: string;
  emblem: string; // glyph used as default tenant logo mark
  // CSS variable overrides applied to <html data-tenant-theme="…">
  vars: Record<string, string>;
  // Sample chips for the picker (from cool→warm→accent).
  swatches: string[];
};

export const THEME_PRESETS: Record<ThemeKey, ThemePreset> = {
  heritage: {
    key: "heritage",
    nameEn: "Heritage Modern",
    nameAr: "تراث حديث",
    description:
      "Cream + ochre + terracotta. Earth-toned, regional, premium without nostalgia. The default for MENA holdings.",
    emblem: "◆",
    vars: {
      "--heri-cream": "#f5efe6",
      "--heri-cream-2": "#ede5d6",
      "--heri-ink": "#1a1612",
      "--heri-ink-2": "#2c2620",
      "--heri-ink-3": "#4a4138",
      "--heri-terracotta": "#b85c38",
      "--heri-ochre": "#c69345",
      "--heri-rose": "#c98b8b",
      "--heri-teal": "#1f4e4a",
      "--heri-copper": "#7d5a3a",
      "--heri-rule": "#d8cdb9",
      "--heri-rule-strong": "#b8a98c",
    },
    swatches: ["#f5efe6", "#1a1612", "#c69345", "#b85c38", "#1f4e4a"],
  },
  ocean: {
    key: "ocean",
    nameEn: "Ocean",
    nameAr: "محيط",
    description:
      "Slate + cyan + ivory. Sleek operator energy — fintech, logistics, modern services. The Mercury / Linear lookalike.",
    emblem: "◉",
    vars: {
      "--heri-cream": "#f4f6f8",
      "--heri-cream-2": "#e8edf2",
      "--heri-ink": "#0f1d2c",
      "--heri-ink-2": "#1f3047",
      "--heri-ink-3": "#465c75",
      "--heri-terracotta": "#0a8acb",
      "--heri-ochre": "#0aa9d4",
      "--heri-rose": "#7b9fb8",
      "--heri-teal": "#0a4d6b",
      "--heri-copper": "#3a6e8a",
      "--heri-rule": "#cdd7e1",
      "--heri-rule-strong": "#9cabbc",
    },
    swatches: ["#f4f6f8", "#0f1d2c", "#0aa9d4", "#0a8acb", "#0a4d6b"],
  },
  ember: {
    key: "ember",
    nameEn: "Ember",
    nameAr: "جمر",
    description:
      "Ink + amber + paper. Newsroom voice, bold conviction — media, consumer brands, contrarian B2B.",
    emblem: "▲",
    vars: {
      "--heri-cream": "#fbf6ec",
      "--heri-cream-2": "#f1e8d4",
      "--heri-ink": "#0a0a0a",
      "--heri-ink-2": "#1c1814",
      "--heri-ink-3": "#3d342a",
      "--heri-terracotta": "#d44218",
      "--heri-ochre": "#e89530",
      "--heri-rose": "#d18b6e",
      "--heri-teal": "#3a2814",
      "--heri-copper": "#8a4f1f",
      "--heri-rule": "#e2d5b9",
      "--heri-rule-strong": "#b59b71",
    },
    swatches: ["#fbf6ec", "#0a0a0a", "#e89530", "#d44218", "#3a2814"],
  },
  forest: {
    key: "forest",
    nameEn: "Forest",
    nameAr: "غابة",
    description:
      "Deep green + ivory + bronze. Calm authority — agriculture, sustainability, healthcare.",
    emblem: "✱",
    vars: {
      "--heri-cream": "#f3efe4",
      "--heri-cream-2": "#e6dfca",
      "--heri-ink": "#0e1f17",
      "--heri-ink-2": "#1d3527",
      "--heri-ink-3": "#3f5a48",
      "--heri-terracotta": "#7a3d23",
      "--heri-ochre": "#a37328",
      "--heri-rose": "#94a98c",
      "--heri-teal": "#2d5a3d",
      "--heri-copper": "#5b3920",
      "--heri-rule": "#cfd9c6",
      "--heri-rule-strong": "#92a48a",
    },
    swatches: ["#f3efe4", "#0e1f17", "#a37328", "#2d5a3d", "#7a3d23"],
  },
  monolith: {
    key: "monolith",
    nameEn: "Monolith",
    nameAr: "نصب",
    description:
      "Pure ink + cream + a single screaming yellow. Brutalist confidence — agencies, fashion, art-tech.",
    emblem: "■",
    vars: {
      "--heri-cream": "#f7f3eb",
      "--heri-cream-2": "#ebe4d4",
      "--heri-ink": "#0a0a0a",
      "--heri-ink-2": "#171717",
      "--heri-ink-3": "#3a3a3a",
      "--heri-terracotta": "#0a0a0a",
      "--heri-ochre": "#f4d04a",
      "--heri-rose": "#cccccc",
      "--heri-teal": "#171717",
      "--heri-copper": "#3a3a3a",
      "--heri-rule": "#d6d2c7",
      "--heri-rule-strong": "#9a9a9a",
    },
    swatches: ["#f7f3eb", "#0a0a0a", "#f4d04a", "#3a3a3a", "#171717"],
  },
  pearl: {
    key: "pearl",
    nameEn: "Pearl",
    nameAr: "لؤلؤ",
    description:
      "Ivory + dusty rose + rose gold. Luxury hospitality, beauty, premium consumer.",
    emblem: "❀",
    vars: {
      "--heri-cream": "#faf3eb",
      "--heri-cream-2": "#f1e4d6",
      "--heri-ink": "#241a1a",
      "--heri-ink-2": "#3a2828",
      "--heri-ink-3": "#5e4848",
      "--heri-terracotta": "#b25e6e",
      "--heri-ochre": "#c98a5a",
      "--heri-rose": "#d6a48a",
      "--heri-teal": "#5b3939",
      "--heri-copper": "#9c6249",
      "--heri-rule": "#e6d4c4",
      "--heri-rule-strong": "#bd9985",
    },
    swatches: ["#faf3eb", "#241a1a", "#c98a5a", "#b25e6e", "#5b3939"],
  },
  "midnight-nerve": {
    key: "midnight-nerve",
    nameEn: "Midnight Nerve",
    nameAr: "نيرف الليلي",
    description:
      "Near-black navy + electric cyan. The intelligence layer made visible — dark, focused, alive. For data-heavy operators and command centers.",
    emblem: "◈",
    vars: {
      "--heri-cream": "#070b16",
      "--heri-cream-2": "#0e1428",
      "--heri-ink": "#e8edfb",
      "--heri-ink-2": "#c2cbe8",
      "--heri-ink-3": "#8a97c2",
      "--heri-terracotta": "#1a1f4e",
      "--heri-ochre": "#00d4ff",
      "--heri-rose": "#5b6bd6",
      "--heri-teal": "#0f1234",
      "--heri-copper": "#6b78a8",
      "--heri-rule": "#1b2447",
      "--heri-rule-strong": "#2c3a6b",
    },
    swatches: ["#070b16", "#e8edfb", "#00d4ff", "#1a1f4e", "#0f1234"],
  },
  "desert-gold": {
    key: "desert-gold",
    nameEn: "Desert Gold",
    nameAr: "ذهب الصحراء",
    description:
      "Warm sand + deep terracotta + rich gold. Regional warmth with conviction — hospitality, heritage brands, premium consumer.",
    emblem: "❖",
    vars: {
      "--heri-cream": "#f5ede0",
      "--heri-cream-2": "#ece0cd",
      "--heri-ink": "#2a1a10",
      "--heri-ink-2": "#4a3320",
      "--heri-ink-3": "#7a6149",
      "--heri-terracotta": "#8b3a1c",
      "--heri-ochre": "#d4962a",
      "--heri-rose": "#c98b6e",
      "--heri-teal": "#6e3a1c",
      "--heri-copper": "#9c6a3a",
      "--heri-rule": "#e6d8c2",
      "--heri-rule-strong": "#c9b393",
    },
    swatches: ["#f5ede0", "#2a1a10", "#d4962a", "#8b3a1c", "#6e3a1c"],
  },
  obsidian: {
    key: "obsidian",
    nameEn: "Obsidian",
    nameAr: "السبج",
    description:
      "Pure black + electric emerald + muted gold. Absolute focus, neon-on-void — art-tech, security, late-night ops.",
    emblem: "◆",
    vars: {
      "--heri-cream": "#0d0d0d",
      "--heri-cream-2": "#161616",
      "--heri-ink": "#ffffff",
      "--heri-ink-2": "#d4d4d4",
      "--heri-ink-3": "#9a9a9a",
      "--heri-terracotta": "#00ff88",
      "--heri-ochre": "#b8962e",
      "--heri-rose": "#5ad6a0",
      "--heri-teal": "#00b35f",
      "--heri-copper": "#7a7a7a",
      "--heri-rule": "#262626",
      "--heri-rule-strong": "#3a3a3a",
    },
    swatches: ["#0d0d0d", "#ffffff", "#00ff88", "#b8962e", "#00b35f"],
  },
};

export const PACK_CATALOG = [
  { key: "hospitality", nameEn: "Hospitality",   nameAr: "ضيافة",   icon: "Hotel"   },
  { key: "dairy",       nameEn: "Dairy",         nameAr: "ألبان",   icon: "Milk"    },
  { key: "agri",        nameEn: "Agriculture",   nameAr: "زراعة",   icon: "Sprout"  },
  { key: "education",   nameEn: "Education",     nameAr: "تعليم",   icon: "GraduationCap" },
  { key: "finance",     nameEn: "Finance",       nameAr: "مالية",   icon: "Wallet"  },
] as const;

export type PackKey = (typeof PACK_CATALOG)[number]["key"];

/** Build the inline CSS that overrides Heritage variables for a given preset. */
export function themeCssVars(preset: ThemeKey): string {
  const t = THEME_PRESETS[preset];
  return Object.entries(t.vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}
