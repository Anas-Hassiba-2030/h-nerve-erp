// Plain shared module (NOT "use server" — exporting non-async values
// from a server-action file turns them into action proxies; the
// WAREHOUSE_TYPES lesson). Imported by both the server actions and the
// client forms.

export const ROLES = ["ADMIN", "EXECUTIVE", "MANAGER", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

// Bilingual labels — the (admin) console follows the Phase 3 ar-ternary
// convention; callers pass `ar`.
const LABELS: Record<Role, { ar: string; en: string }> = {
  ADMIN: { ar: "مدير النظام", en: "Admin" },
  EXECUTIVE: { ar: "تنفيذي", en: "Executive" },
  MANAGER: { ar: "مدير وحدة", en: "Manager" },
  STAFF: { ar: "موظف", en: "Staff" },
};

export function roleLabel(role: string, ar: boolean): string {
  const r = isRole(role) ? role : null;
  if (!r) return role;
  return ar ? LABELS[r].ar : LABELS[r].en;
}
