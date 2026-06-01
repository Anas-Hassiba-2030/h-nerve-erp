// /me — the operator's own profile (Phase 26.6).
//
// Previously the Orrery's "ملفي الشخصي / My Profile" menu item navigated to
// /settings, which conflated identity with configuration. This is the real
// profile surface: a read-only view of who the user is in the H-Nerve system
// — name, role, chess rank, XP progression, login count — with a clear link
// across to Settings for anything they want to change.
//
// Aesthetic: Heritage Modern. Reuses the animated ProfileHero already built
// for the settings status tab, plus a small facts grid.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, Trophy, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { ProfileHero } from "@/components/settings/ProfileHero";
import { ROLES_AR } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Heritage Modern brand gradient (deep emerald → gold accent).
const BRAND_GRADIENT =
  "linear-gradient(135deg, #1F4D3F 0%, #2E6B57 55%, #3a3017 100%)";
const BRAND_ACCENT = "#C2A35A";

export default async function MyProfilePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.id } });
  if (!me) redirect("/logout");

  const locale = getLocale();
  const ar = locale === "ar";

  const roleLabel = ar ? ROLES_AR[me.role] ?? me.role : me.role;
  const joined = new Intl.DateTimeFormat(ar ? "ar-JO" : "en-US", {
    dateStyle: "long",
  }).format(me.createdAt);

  const facts: { label: string; value: string }[] = [
    { label: ar ? "البريد الإلكتروني" : "Email", value: me.email },
    { label: ar ? "الدور" : "Role", value: roleLabel },
    { label: ar ? "المنصب" : "Title", value: me.title ?? (ar ? "—" : "—") },
    { label: ar ? "نقاط الخبرة" : "XP", value: `${me.xp.toLocaleString("en-US")}` },
    { label: ar ? "مرات الدخول" : "Logins", value: `${me.loginCount.toLocaleString("en-US")}` },
    { label: ar ? "انضمّ في" : "Joined", value: joined },
  ];

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"} style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 24px 80px" }}>
      {/* Back to orrery + settings link */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Link
          href="/orrery"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none" }}
        >
          <ArrowLeft size={14} className={ar ? "rotate-180" : ""} />
          {ar ? "العودة إلى المدار" : "Back to Orrery"}
        </Link>
        <Link
          href="/settings"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Settings size={14} />
          {ar ? "الإعدادات" : "Settings"}
        </Link>
      </div>

      {/* Animated profile hero */}
      <ProfileHero
        name={me.name}
        email={me.email}
        title={me.title}
        role={me.role}
        rank={me.rank}
        xp={me.xp}
        bonusPercent={me.bonusPercent}
        loginCount={me.loginCount}
        locale={ar ? "ar" : "en"}
        brandGradient={BRAND_GRADIENT}
        brandAccent={BRAND_ACCENT}
      />

      {/* Facts grid */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {facts.map((f) => (
          <div
            key={f.label}
            style={{
              background: "var(--surface-elevated, #fff)",
              border: "1px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius: 14,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
              {f.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }} dir={f.label.includes("Email") || f.label.includes("البريد") ? "ltr" : undefined}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {/* Achievements signpost */}
      <Link
        href="/achievements"
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--surface-elevated, #fff)",
          border: "1px solid var(--border, rgba(0,0,0,0.1))",
          borderRadius: 14,
          padding: "16px 18px",
          textDecoration: "none",
          color: "var(--text)",
        }}
      >
        <Trophy size={22} style={{ color: BRAND_ACCENT, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{ar ? "الإنجازات والرتب" : "Achievements & ranks"}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {ar ? "اطّلع على مساراتك ووسامك في مجموعة الحوراني." : "See your milestones and standing in the Hourani Group."}
          </div>
        </div>
        <ArrowLeft size={16} className={ar ? "" : "rotate-180"} style={{ color: "var(--text-muted)" }} />
      </Link>
    </div>
  );
}
