import Link from "next/link";
import { Users2, Plus, Mail, Shield, Crown, Star, Building2 } from "lucide-react";
import { ExportMenu } from "@/components/ui/ExportMenu";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCompanyBrand } from "@/lib/utils/companyBrand";
import "../daylight.css";

export const dynamic = "force-dynamic";

const ROLE_META: Record<string, { ar: string; en: string; icon: any }> = {
  ADMIN: { ar: "مدير النظام", en: "Admin", icon: Shield },
  EXECUTIVE: { ar: "تنفيذي", en: "Executive", icon: Crown },
  MANAGER: { ar: "مدير", en: "Manager", icon: Star },
  STAFF: { ar: "موظف", en: "Staff", icon: Users2 },
};

export default async function EmployeesPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const [me, users, companies] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { company: true }, take: 200 }),
    prisma.company.findMany({ take: 100 }),
  ]);
  // "New member" routes to /admin/users, which is hard-gated to ADMIN — only
  // show it to admins so non-admins aren't bounced to /dashboard on click.
  const isAdmin = me?.role === "ADMIN";

  const byCompany = new Map<string, typeof users>();
  for (const u of users) {
    const key = u.companyId ?? "none";
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key)!.push(u);
  }

  const totalUsers = users.length;
  const admins = users.filter((u) => u.role === "ADMIN").length;
  const execs = users.filter((u) => u.role === "EXECUTIVE").length;
  const managers = users.filter((u) => u.role === "MANAGER").length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق" : "Team"}
        title={ar ? "أعضاء الفريق" : "Team Members"}
        subtitle={ar ? "كل من لديه وصول إلى نظام H-Nerve عبر شركات المجموعة." : "Everyone with access to H-Nerve across the group."}
        status={`${formatNumber(totalUsers)} ${ar ? "عضو" : "members"}`}
        actions={
          <>
            {isAdmin ? (
              <Link href="/admin/users" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "عضو جديد" : "New member"}</Link>
            ) : null}
            <ExportMenu type="employees" locale={lc} variant="heritage" />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الأعضاء" : "Total members"} value={formatNumber(totalUsers)} hint={ar ? "عبر المجموعة" : "group-wide"} />
        <DaylightKpi label={ar ? "تنفيذيون" : "Executives"} value={formatNumber(execs)} hint={ar ? "قيادة" : "leadership"} />
        <DaylightKpi label={ar ? "مدراء" : "Managers"} value={formatNumber(managers)} hint={ar ? "إدارة" : "management"} />
        <DaylightKpi label={ar ? "مدراء نظام" : "Admins"} value={formatNumber(admins)} hint={ar ? "وصول كامل" : "full access"} />
      </DaylightKpiGrid>

      {companies.map((company) => {
        const companyUsers = byCompany.get(company.id) ?? [];
        if (companyUsers.length === 0) return null;
        const brand = getCompanyBrand(company.code);
        return (
          <DaylightPanel
            key={company.id}
            title={ar ? company.name : company.nameEn}
            aside={`${formatNumber(companyUsers.length)} ${ar ? "عضو" : "members"}`}
          >
            <div className="prop-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}>
              {companyUsers.map((u) => {
                const meta = ROLE_META[u.role] ?? ROLE_META.STAFF;
                const RoleIcon = meta.icon;
                return (
                  <div key={u.id} className="prop-card" style={{ padding: 16 }}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-base font-bold text-white" style={{ background: brand.gradient }}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{u.name}</h3>
                        <div style={{ fontSize: 12.5, color: "#574f43", lineHeight: 1.4, marginTop: 2 }}>{u.title ?? meta[lc]}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="tag gold"><RoleIcon className="h-3 w-3" />{meta[lc]}</span>
                      <a href={`mailto:${u.email}`} className="inline-flex min-w-0 items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: "var(--emerald)" }} title={u.email}>
                        <Mail className="h-3.5 w-3.5 flex-none" />
                        <span className="truncate">{u.email}</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </DaylightPanel>
        );
      })}
    </DaylightShell>
  );
}
