// /admin/system — superadmin MISSION CONTROL (Phase 11). The PLATFORM command
// deck: tenants, users, permissions, audit, and the raw data browser. Sleek
// Operator vocabulary (DESIGN-SKILL §1.F) to match the (admin) shell — cyan on
// near-black, no operator chrome. NOT Heritage: one vocabulary per surface.
//
// The business/ERP consoles (products, orders, journal, warehouses, …) used to
// be duplicated here too; they now live SOLELY under Operations (/admin, the
// (app) daylight hub) so every console has exactly one home. Mission Control is
// the superadmin's platform room — nothing an operator touches day-to-day.
// Federation totals header, then the platform routes clustered into command
// groups (Platform · Data · Access & Audit). Counts are best-effort badges.

import Link from "next/link";
import {
  UsersRound, ShieldCheck, ScrollText, Database, Crown, Building2,
} from "lucide-react";
import { prisma, prismaUnscoped } from "@/lib/db/db";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { listModels } from "@/lib/db/db.introspect";
import { SeedDemoButton } from "@/components/genesis/SeedDemoButton";

export const dynamic = "force-dynamic";

type GroupId = "platform" | "data" | "access";

type Card = {
  href: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: any;
  count: number | null;
  group: GroupId;
};

const GROUPS: { id: GroupId; ar: string; en: string }[] = [
  { id: "platform",  ar: "المنصّة",         en: "Platform" },
  { id: "data",      ar: "البيانات",        en: "Data" },
  { id: "access",    ar: "الوصول والتدقيق", en: "Access & Audit" },
];

async function n(p: Promise<number>): Promise<number | null> {
  return p.then((v) => v).catch(() => null);
}

export default async function AdminSystemPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const m = await getMessages(locale);

  const [tenants, brainPatterns, iqRows, memories] = await Promise.all([
    prisma.tenant.count().catch(() => 0),
    prisma.brainPattern.count().catch(() => 0),
    prisma.brainIQHistory.count().catch(() => 0),
    prisma.memory.count().catch(() => 0),
  ]);

  // Platform-only count badges (the ERP consoles moved to Operations). Plain
  // count() so a schema drift can never crash the hub.
  const [cUsers, cAudit] = await Promise.all([
    n(prismaUnscoped.user.count()),
    n(prismaUnscoped.activityLog.count()),
  ]);

  const dbModelCount = listModels().length;

  const cards: Card[] = [
    { href: "/admin/empire",          titleAr: "الإمبراطورية",      titleEn: "Empire",             descAr: "لوحة المجموعة متعددة المستأجرين",       descEn: "Multi-tenant group boardroom",             icon: Crown,        count: tenants, group: "platform" },
    { href: "/admin/tenants",         titleAr: "المستأجرون",        titleEn: "Tenants",            descAr: "إدارة المستأجرين والعلامات",            descEn: "Manage tenants and brands",                icon: Building2,    count: tenants, group: "platform" },
    { href: "/admin/db",              titleAr: "متصفّح البيانات",   titleEn: "Data Browser",       descAr: "كل جداول قاعدة البيانات — للقراءة",     descEn: "Every database table — read-only",         icon: Database,     count: dbModelCount, group: "data" },
    { href: "/admin/users",           titleAr: "المستخدمون",        titleEn: "Users",              descAr: "الحسابات والأدوار والصلاحيات",         descEn: "Accounts, roles, and access",              icon: UsersRound,   count: cUsers, group: "access" },
    { href: "/admin/permissions-preview", titleAr: "معاينة الصلاحيات", titleEn: "Permissions",     descAr: "ما يصل إليه كل دور (تدقيق)",            descEn: "What each role can reach (audit)",         icon: ShieldCheck,  count: null, group: "access" },
    { href: "/admin/audit",           titleAr: "سجل التدقيق",       titleEn: "Audit Log",          descAr: "من فعل ماذا ومتى",                     descEn: "Who did what, when",                       icon: ScrollText,   count: cAudit, group: "access" },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">{m["admin.eyebrow.missionControl"]}</span>
          <h1 className="admin-h1">{ar ? "غرفة العمليات" : "Mission Control"}</h1>
          <p className="admin-sub">
            {ar
              ? "غرفة قيادة المنصّة — المستأجرون، المستخدمون، الصلاحيات، التدقيق، ومتصفّح البيانات، مع إجماليات الاتحاد عبر كل مستأجر. أما وحدات العمل (الفواتير، المخزون، الطلبات، المحاسبة…) فتعيش في قسم «العمليات»."
              : "The platform command deck — tenants, users, permissions, audit, and the data browser, with federation totals across every tenant. The business consoles (invoicing, inventory, orders, accounting…) live under “Operations.”"}
          </p>
          <SeedDemoButton ar={ar} />
        </div>
      </header>

      <section className="admin-stats">
        <Stat label="TENANTS" value={tenants} />
        <Stat label="LEARNED PATTERNS" value={brainPatterns} accent="cyan" />
        <Stat label="IQ SNAPSHOTS" value={iqRows} accent="cyan" />
        <Stat label="MEMORIES" value={memories} accent="cyan" />
      </section>

      {GROUPS.map((g) => {
        const groupCards = cards.filter((c) => c.group === g.id);
        if (groupCards.length === 0) return null;
        return (
          <section key={g.id} className="admin-section">
            <div className="admin-section-head">
              <h2 className="admin-h2">{ar ? g.ar : g.en}</h2>
            </div>
            <div className="admin-grid">
              {groupCards.map((c) => {
                const Icon = c.icon;
                return (
                  <Link key={c.href} href={c.href} className="admin-tenant-card">
                    <div
                      className="admin-tenant-card-body"
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 48,
                          height: 48,
                          border: "1px solid var(--admin-rule)",
                          color: "var(--admin-cyan)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon className="h-6 w-6" strokeWidth={1.5} />
                      </span>
                      <span style={{ display: "grid", gap: 4, minWidth: 0, flex: 1 }}>
                        <span className="admin-tenant-name">{ar ? c.titleAr : c.titleEn}</span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--admin-text-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {ar ? c.descAr : c.descEn}
                        </span>
                      </span>
                      {c.count !== null ? (
                        <span
                          className="admin-stat-label"
                          style={{ color: "var(--admin-cyan)", flexShrink: 0 }}
                        >
                          {c.count.toLocaleString("en-US")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-h2">
            {ar ? "النسخ الاحتياطي والتعافي" : "Backup & disaster recovery"}
          </h2>
          <p className="admin-section-sub">
            {ar
              ? "تفريغ كامل لقاعدة البيانات (JSON) — لقطة تعافٍ تشمل صفوف المصادقة (تجزئات bcrypt). للمدير فقط. التصدير لكل مورد (CSV) متاح من صفحات الوحدات."
              : "Full database dump (JSON) — a recovery snapshot incl. auth rows (bcrypt hashes). ADMIN only. Per-resource CSV export lives on each module page."}
          </p>
        </div>
        <a
          href="/api/export/system-dump"
          className="admin-cta-primary"
          style={{ width: "fit-content" }}
        >
          {ar ? "تنزيل التفريغ الكامل" : "Download full system dump"}
        </a>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "cyan" }) {
  return (
    <div className="admin-stat-tile">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value" data-accent={accent ?? "neutral"}>
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}
