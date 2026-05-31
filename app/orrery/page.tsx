import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { brainIqAt } from "@/lib/timemachine";
import { OrreryFrame, type OrreryIdentity } from "@/components/orrery/OrreryFrame";

export const metadata: Metadata = {
  title: "H-Nerve · المدار",
};

// EXECUTIVE/ADMIN/MANAGER/STAFF -> bilingual chip label. The Orrery's role
// adaptivity (which stars surface) is refined in a later pass; v1 shows the
// real person + their real standing in the group.
const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  ADMIN: { ar: "مدير النظام", en: "System Admin" },
  EXECUTIVE: { ar: "الرئيس التنفيذي", en: "Chief Executive" },
  MANAGER: { ar: "مدير", en: "Manager" },
  STAFF: { ar: "عضو الفريق", en: "Team Member" },
};

export default async function OrreryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = getLocale();

  // Real Brain IQ (most recent snapshot). Defensive — never let a data hiccup
  // blank the hub; the engine animates its own value if this is omitted.
  let iq: string | undefined;
  try {
    const { iq: n } = await brainIqAt(new Date());
    iq = locale === "ar" ? toArabicDigits(String(n)) : String(n);
  } catch {
    iq = undefined;
  }

  const rl = ROLE_LABEL[user.role] ?? ROLE_LABEL.EXECUTIVE;
  const group = locale === "ar" ? "مجموعة الحوراني" : "Hourani Group";
  const roleLabel = `${locale === "ar" ? rl.ar : rl.en} · ${group}`;

  const identity: OrreryIdentity = {
    lang: locale,
    userName: user.name,
    roleLabel,
    iq,
  };

  return <OrreryFrame identity={identity} />;
}

function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
