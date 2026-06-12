// Per-company brand identity registry — used everywhere a company is rendered
// (covers, hero strips, exports, sidebar accents, etc.)

export type CompanyBrand = {
  code: string;
  name: string;
  nameEn: string;
  emblem: string; // single-character emblem rendered in the mark
  emblemSymbol?: string; // optional unicode symbol (chess, flora, etc.)
  gradient: string; // CSS gradient
  accent: string; // hex color
  accentSoft: string; // soft tint
  pattern: "topo" | "waves" | "leaves" | "grid" | "dots" | "rings";
  motto: string;
  mottoEn: string;
};

export const COMPANY_BRANDS: Record<string, CompanyBrand> = {
  HH: {
    code: "HH",
    name: "الحوراني القابضة",
    nameEn: "Hourani Holding",
    emblem: "ح",
    emblemSymbol: "♛",
    gradient: "linear-gradient(135deg, #1a2940 0%, #2c4869 50%, #c69345 110%)",
    accent: "#c69345",
    accentSoft: "#f3e9d3",
    pattern: "rings",
    motto: "منذ 1979 — إرث استثماري يصنع المستقبل",
    mottoEn: "Since 1979 — A legacy that builds the future",
  },
  ARENA: {
    code: "ARENA",
    name: "أرينا سبيس للضيافة",
    nameEn: "Arena Space Hospitality",
    emblem: "أ",
    emblemSymbol: "★",
    gradient: "linear-gradient(135deg, #5a3a1f 0%, #b06a1a 45%, #f5b341 110%)",
    accent: "#b06a1a",
    accentSoft: "#fbeed7",
    pattern: "topo",
    motto: "ضيافة بمعايير عالمية، روح أردنية",
    mottoEn: "World-class hospitality, Jordanian spirit",
  },
  MAHA: {
    code: "MAHA",
    name: "المها للألبان",
    nameEn: "Maha Dairy",
    emblem: "م",
    emblemSymbol: "❅",
    gradient: "linear-gradient(135deg, #084d6e 0%, #0d7eaf 50%, #b3e5f7 110%)",
    accent: "#0d7eaf",
    accentSoft: "#dff1f9",
    pattern: "waves",
    motto: "طازج كل يوم، من المزرعة إلى مائدتك",
    mottoEn: "Fresh every day, from farm to table",
  },
  LORAN: {
    code: "LORAN",
    name: "لوران للاستثمار الزراعي",
    nameEn: "Loran Agricultural Investment",
    emblem: "ل",
    emblemSymbol: "❦",
    gradient: "linear-gradient(135deg, #0a4d3a 0%, #15846a 50%, #a3d9b1 110%)",
    accent: "#15846a",
    accentSoft: "#e0f2e7",
    pattern: "leaves",
    motto: "أرض تنبت ثقة. زراعة تستحق الانتظار",
    mottoEn: "Land of trust. Crops worth the wait",
  },
  AAU: {
    code: "AAU",
    name: "جامعة عمّان الأهلية",
    nameEn: "Al-Ahliyya Amman University",
    emblem: "ج",
    emblemSymbol: "✦",
    gradient: "linear-gradient(135deg, #1d2680 0%, #4f5dd1 50%, #c8cdf5 110%)",
    accent: "#4f5dd1",
    accentSoft: "#e8eafd",
    pattern: "grid",
    motto: "أول جامعة خاصة في الأردن — منذ 1990",
    mottoEn: "Jordan's first private university — since 1990",
  },
};

// Platform identity marks — used in the combined hero logo on the login page
// and as co-branding in exports. Object keys are kept stable (other files
// import them); only the human-readable display strings are neutral.
export const PERSONAL_BRANDS = {
  ANAS_AI: {
    code: "ANAS_AI",
    name: "إتش-نيرف · الدماغ",
    nameEn: "H-Nerve Brain",
    emblem: "HN",
    accent: "#0a0a0a",
    gradient: "linear-gradient(135deg, #000 0%, #2a2a2a 100%)",
    motto: "ذكاء الأعمال بالعربية",
    mottoEn: "Business intelligence in Arabic",
  },
  HASIBA_G: {
    code: "HASIBA_G",
    name: "إتش-نيرف · المنصة",
    nameEn: "H-Nerve Platform",
    emblem: "HN",
    accent: "#1a1a1a",
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #c69345 110%)",
    motto: "منصة ذكاء المؤسسات",
    mottoEn: "Enterprise intelligence platform",
  },
} as const;

export function getCompanyBrand(code: string | null | undefined): CompanyBrand {
  if (!code) return COMPANY_BRANDS.HH;
  return COMPANY_BRANDS[code] ?? COMPANY_BRANDS.HH;
}

export function brandTextColor(brand: CompanyBrand): string {
  return "#ffffff";
}
