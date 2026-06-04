import Link from "next/link";
import { Users2, Plus, Mail, Shield, Crown, Star, Building2 } from "lucide-react";
import { ExportMenu } from "@/components/ui/ExportMenu";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
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
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const [users, companies] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { company: true } }),
    prisma.company.findMany(),
  ]);

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
            <Link href="/admin/users" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "عضو جديد" : "New member"}</Link>
            <ExportMenu type="employees" locale={lc} />
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
            <div className="prop-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {companyUsers.map((u) => {
                const meta = ROLE_META[u.role] ?? ROLE_META.STAFF;
                const RoleIcon = meta.icon;
                return (
                  <div key={u.id} className="prop-card" style={{ padding: 16 }}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: brand.gradient }}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{u.name}</h3>
                        <div className="truncate" style={{ fontSize: 11, color: "var(--ink-muted)" }}>{u.title ?? meta[lc]}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="tag gold"><RoleIcon className="h-3 w-3" />{meta[lc]}</span>
                      <a href={`mailto:${u.email}`} style={{ fontSize: 11, color: "var(--gold-soft, #8a6a1f)" }} title={u.email}><Mail className="inline h-3.5 w-3.5" style={{ color: "var(--emerald)" }} /></a>
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
