// Pure data — no server-only imports. Safe to import in client components.

export type ThemeId =
  | "harmony"
  | "midnight"
  | "royal"
  | "amber"
  | "ocean"
  | "carbon"
  | "rose"
  | "midnight-nerve"
  | "desert-gold"
  | "obsidian";

export const THEME_COOKIE = "h_nerve_theme";

export type ThemeDef = {
  id: ThemeId;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  brand: string;
  brandDeep: string;
  brandSoft: string;
  accent: string;
  isDark: boolean;
};

export const THEMES: Record<ThemeId, ThemeDef> = {
  harmony: {
    id: "harmony",
    name: "هارموني",
    nameEn: "Harmony",
    description: "زمرّدي ناعم + ذهبي دافئ — مريح للعين، السمة الافتراضية.",
    descriptionEn: "Soft sage + warm gold — eye-comfortable default.",
    surface: "#f8f6ef",
    surfaceElevated: "#ffffff",
    text: "#0f2e2a",
    textMuted: "#5b6f6a",
    border: "#e6e2d3",
    brand: "#0f7a5a",
    brandDeep: "#0a4d3a",
    brandSoft: "#e6f5ee",
    accent: "#c69345",
    isDark: false,
  },
  midnight: {
    id: "midnight",
    name: "منتصف الليل",
    nameEn: "Midnight",
    description: "كحلي عميق + ذهبي — أناقة المساء.",
    descriptionEn: "Deep navy + amber — evening elegance.",
    surface: "#0b1220",
    surfaceElevated: "#11192c",
    text: "#e6ecf5",
    textMuted: "#8ea0bd",
    border: "#1b2541",
    brand: "#3d7dff",
    brandDeep: "#1f4cc4",
    brandSoft: "rgba(61,125,255,0.12)",
    accent: "#f5b35a",
    isDark: true,
  },
  royal: {
    id: "royal",
    name: "ملكي",
    nameEn: "Royal",
    description: "بنفسجي ملكي + ذهبي — للقرار التنفيذي.",
    descriptionEn: "Royal purple + gold — executive presence.",
    surface: "#faf7fb",
    surfaceElevated: "#ffffff",
    text: "#1a0e2e",
    textMuted: "#5e4a7a",
    border: "#ebe2f3",
    brand: "#6b2bb3",
    brandDeep: "#3d1370",
    brandSoft: "#f1e7fa",
    accent: "#d4a341",
    isDark: false,
  },
  amber: {
    id: "amber",
    name: "صحراء عمّان",
    nameEn: "Amman Desert",
    description: "كهرماني الأردن + برونزي — تراث المكان.",
    descriptionEn: "Jordanian amber + bronze — heritage warmth.",
    surface: "#fdf8ef",
    surfaceElevated: "#ffffff",
    text: "#2a1a0a",
    textMuted: "#6b563f",
    border: "#f0e4d1",
    brand: "#b06a1a",
    brandDeep: "#7a4612",
    brandSoft: "#fbeed7",
    accent: "#3a5d4f",
    isDark: false,
  },
  ocean: {
    id: "ocean",
    name: "البحر الميت",
    nameEn: "Dead Sea",
    description: "تركواز + مرجاني — حيوية متوازنة.",
    descriptionEn: "Teal + coral — balanced vibrancy.",
    surface: "#f3f9f9",
    surfaceElevated: "#ffffff",
    text: "#0c2a32",
    textMuted: "#4a6b73",
    border: "#dceaed",
    brand: "#0d8094",
    brandDeep: "#06515f",
    brandSoft: "#dff1f5",
    accent: "#e7745c",
    isDark: false,
  },
  carbon: {
    id: "carbon",
    name: "كربون",
    nameEn: "Carbon",
    description: "أسود كربوني + زمرّدي — تركيز عالي ليلاً.",
    descriptionEn: "Carbon black + emerald — high-focus night mode.",
    surface: "#0d0f10",
    surfaceElevated: "#161a1d",
    text: "#e6efe9",
    textMuted: "#8aa297",
    border: "#222a2d",
    brand: "#10c879",
    brandDeep: "#0a8e54",
    brandSoft: "rgba(16,200,121,0.12)",
    accent: "#f5b341",
    isDark: true,
  },
  rose: {
    id: "rose",
    name: "وردي ذهبي",
    nameEn: "Rose Gold",
    description: "وردي + ذهبي — فخامة لينة.",
    descriptionEn: "Rose + gold — soft luxury.",
    surface: "#fdf6f5",
    surfaceElevated: "#ffffff",
    text: "#2c1517",
    textMuted: "#7a4a52",
    border: "#f3e3e0",
    brand: "#b03960",
    brandDeep: "#7a1f3f",
    brandSoft: "#f9e3eb",
    accent: "#c89b6a",
    isDark: false,
  },
  "midnight-nerve": {
    id: "midnight-nerve",
    name: "نيرف الليلي",
    nameEn: "Midnight Nerve",
    description: "كحلي عميق + سماوي كهربائي — نبض الذكاء ليلاً.",
    descriptionEn: "Deep navy + electric cyan — the intelligence layer at night.",
    surface: "#070b16",
    surfaceElevated: "#0e1428",
    text: "#e8edfb",
    textMuted: "#8a97c2",
    border: "#1b2447",
    brand: "#1a1f4e",
    brandDeep: "#0f1234",
    brandSoft: "rgba(0,212,255,0.13)",
    accent: "#00d4ff",
    isDark: true,
  },
  "desert-gold": {
    id: "desert-gold",
    name: "ذهب الصحراء",
    nameEn: "Desert Gold",
    description: "رمل دافئ + طين أحمر + ذهب غني — تراث المكان بثقة.",
    descriptionEn: "Warm sand + deep terracotta + rich gold — heritage with conviction.",
    surface: "#f5ede0",
    surfaceElevated: "#fffaf2",
    text: "#2a1a10",
    textMuted: "#7a6149",
    border: "#e6d8c2",
    brand: "#8b3a1c",
    brandDeep: "#5e2510",
    brandSoft: "#f3e2d0",
    accent: "#d4962a",
    isDark: false,
  },
  obsidian: {
    id: "obsidian",
    name: "السبج",
    nameEn: "Obsidian",
    description: "أسود نقي + زمرّدي كهربائي + ذهب خافت — تركيز مطلق.",
    descriptionEn: "Pure black + electric emerald + muted gold — absolute focus.",
    surface: "#0d0d0d",
    surfaceElevated: "#161616",
    text: "#ffffff",
    textMuted: "#9a9a9a",
    border: "#262626",
    brand: "#00ff88",
    brandDeep: "#00b35f",
    brandSoft: "rgba(0,255,136,0.14)",
    accent: "#b8962e",
    isDark: true,
  },
};

export function themeCssVars(theme: ThemeDef): string {
  return [
    `--surface: ${theme.surface}`,
    `--surface-elevated: ${theme.surfaceElevated}`,
    `--text: ${theme.text}`,
    `--text-muted: ${theme.textMuted}`,
    `--border: ${theme.border}`,
    `--brand: ${theme.brand}`,
    `--brand-deep: ${theme.brandDeep}`,
    `--brand-soft: ${theme.brandSoft}`,
    `--accent: ${theme.accent}`,
    `color-scheme: ${theme.isDark ? "dark" : "light"}`,
  ].join("; ");
}

export const THEME_LIST: ThemeDef[] = Object.values(THEMES);

export function themeById(id: string | null | undefined): ThemeDef {
  if (!id) return THEMES.harmony;
  return THEMES[id as ThemeId] ?? THEMES.harmony;
}
