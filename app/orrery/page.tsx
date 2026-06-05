import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { brainIqAt } from "@/lib/utils/timemachine";
import { OrreryFrame, type OrreryIdentity } from "@/components/orrery/OrreryFrame";
import { OrreryFabs } from "@/components/orrery/OrreryFabs";
// The FAB rail + panels live in the (app) layout; the Orrery hub is outside it,
// so we pull in living.css here for the .hn-fab* styles and overlay the rail.
import "../(app)/living.css";

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

  // The Orrery is the ONE authenticated surface rendered OUTSIDE the (app)
  // layout, so its children would otherwise be DIRECT children of <body>.
  //
  // The brain + time FAB panels kept rendering BEHIND the fullscreen iframe.
  // Root cause (verified across the whole chain): the FAB panels and the iframe
  // are both `position:fixed`. A single shared wrapper puts them in the SAME
  // stacking context — and in real browsers an <iframe>'s own compositing layer
  // can paint OVER same-context siblings even when their z-index is higher. So
  // raising `.cv-root{z-index:100}` above the iframe within one wrapper was not
  // enough (that was the earlier fix; it looked right on paper but still failed
  // live, because the iframe layer won).
  //
  // The robust fix: two SEPARATE body-level layers. The iframe lives in
  // `.orrery-host`; the FAB rail + all its panels live in `.orrery-fab-layer`,
  // which orrery-fabs.css pins to a very high z-index with !important (to beat
  // living.css's `body > *{z-index:1}`, specificity 2,0,1). The ENTIRE FAB layer
  // — and therefore every panel inside it — now sits above the ENTIRE iframe
  // layer, independent of any same-context iframe-compositing quirk.
  return (
    <>
      <div className="orrery-host">
        <OrreryFrame identity={identity} />
      </div>
      <div className="orrery-fab-layer">
        <OrreryFabs locale={locale} />
      </div>
    </>
  );
}

function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
