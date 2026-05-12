// Pure data — no server-only imports. Safe to import in client components.

export type ThemeId =
  | "harmony"
  | "midnight"
  | "royal"
  | "amber"
  | "ocean"
  | "carbon"
  | "rose";

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
