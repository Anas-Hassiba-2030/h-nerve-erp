import Link from "next/link";
import {
  Users, Activity, Trophy, Crown, Award, ChevronLeft, Mail, Search,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { CompanyCover } from "@/components/CompanyCover";
import { RankBadge } from "@/components/RankBadge";
import { prisma } from "@/lib/db";
import { formatNumber, formatRelative, ROLES_AR, ROLES_EN, loc } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { rankById } from "@/lib/gamification";
import { OrgTree } from "@/components/OrgTree";

export default async function EmployeesPage() {
  const ar = getLocale() === "ar";

  const [users, totalTasks, doneTasks] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ xp: "desc" }, { name: "asc" }],
      include: {
        company: true,
        _count: { select: { tasks: true, achievements: true } },
        tasks: { where: { status: "DONE" }, select: { id: true } },
      },
    }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "DONE" } }),
  ]);

  // Phase V3-P13 — org tree built from User.reportsToId self-relation.
  const orgNodes = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title ?? null,
    companyCode: u.company?.code ?? null,
    reportsToId: u.reportsToId ?? null,
  }));

  const totalXp = users.reduce((a, u) => a + u.xp, 0);
  const totalLogins = users.reduce((a, u) => a + u.loginCount, 0);
  const kingsAndQueens = users.filter((u) => u.rank === "KING" || u.rank === "QUEEN").length;

  // Group employees by their company for the directory
  const byCompany = new Map<string, typeof users>();
  for (const u of users) {
    const key = u.company?.name ?? (ar ? "بدون شركة" : "Unaffiliated");
    if (!byCompany.has(key)) byCompany.set(key, [] as any);
    byCompany.get(key)!.push(u);
  }

  return (
    <>
      <Topbar
        eyebrow={ar ? "الفريق" : "People"}
        title={ar ? "الموظفون والقيادات" : "Employees & Leadership"}
        subtitle={ar
          ? "كل عضو في النظام، رتبته، نشاطه، وحجم مساهمته."
          : "Every member of the system — rank, activity, and contribution."}
      />

      <div className="space-y-6 p-6">
        <CompanyCover
          code="HH"
          eyebrow={ar ? "بصمة بشرية" : "Human capital"}
          title={ar ? "الفريق هو النظام" : "The team is the system"}
          subtitle={ar
            ? "كل تسجيل دخول، كل مهمة، كل إشارة تنطلق من شخص. هنا تظهر مساهمتهم."
            : "Every login, task, and insight starts with a person. This is where their contribution shows."}
          metrics={[
            { label: ar ? "إجمالي" : "Total", value: formatNumber(users.length) },
            { label: ar ? "ملوك ووزراء" : "Kings & Queens", value: formatNumber(kingsAndQueens) },
            { label: ar ? "إجمالي XP" : "Total XP", value: formatNumber(totalXp) },
          ]}
        />

        <section className="grid gap-4 stagger sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={ar ? "أعضاء الفريق" : "Team members"}
            value={formatNumber(users.length)}
            numericValue={users.length}
            icon={Users}
            tone="emerald"
          />
          <KpiCard
            label={ar ? "إجمالي تسجيلات الدخول" : "Total logins"}
            value={formatNumber(totalLogins)}
            numericValue={totalLogins}
            icon={Activity}
            tone="violet"
          />
          <KpiCard
            label={ar ? "مهام منجزة" : "Tasks completed"}
            value={`${doneTasks} / ${totalTasks}`}
            icon={Trophy}
            tone="amber"
          />
          <KpiCard
            label={ar ? "ملوك ♚" : "Kings ♚"}
            value={formatNumber(kingsAndQueens)}
            numericValue={kingsAndQueens}
            icon={Crown}
            tone="amber"
            hint={ar ? "وزراء وملوك" : "Queens & kings"}
          />
        </section>

        {/* Phase V3-P13 — Org tree (collapsible reportsTo chain) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
              {ar ? "الهيكل التنظيمي" : "Org chart"}
            </h3>
            <span className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
              · {ar
                ? "اضغط لتوسيع أو طي أي فرع"
                : "Click to expand or collapse a branch"}
            </span>
            <span className="ms-auto h-px flex-1" style={{ background: "var(--heri-rule)" }} />
          </div>
          <div
            className="p-4"
            style={{
              background: "var(--heri-cream)",
              border: "1px solid var(--heri-rule)",
            }}
          >
            <OrgTree users={orgNodes} ar={ar} />
          </div>
        </section>

        {/* Directory grouped by company */}
        <section className="space-y-5">
          {[...byCompany.entries()].map(([companyName, members]) => (
            <div key={companyName}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {companyName}
                </h3>
                <span className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                  · {members.length} {ar ? "عضو" : "members"}
                </span>
                <span className="ms-auto h-px flex-1" style={{ background: "var(--heri-rule)" }} />
              </div>
              <div className="grid gap-3 stagger md:grid-cols-2 xl:grid-cols-3">
                {members.map((u) => {
                  const r = rankById(u.rank);
                  return (
                    <Link
                      key={u.id}
                      href={`/employees/${u.id}`}
                      className="card card-hover card-pad block"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="rank-piece rank-piece-lg"
                            style={{ color: r.color }}
                            title={r.ar}
                          >
                            {r.symbol}
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-semibold" style={{ color: "var(--heri-ink)" }}>
                              {u.name}
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                              {u.title ?? loc(ROLES_AR, ROLES_EN, ar ? "ar" : "en", u.role)}
                            </div>
                            <span
                              className="mt-1 inline-flex items-center gap-1 font-mono text-[10px]"
                              style={{ color: "var(--heri-ochre)" }}
                              dir="ltr"
                            >
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </span>
                          </div>
                        </div>
                        <ChevronLeft className="h-4 w-4 rtl:rotate-180" style={{ color: "var(--heri-ink-3)" }} />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <Mini label="XP" value={formatNumber(u.xp)} />
                        <Mini label={ar ? "بونص" : "Bonus"} value={`+${u.bonusPercent}%`} />
                        <Mini label={ar ? "إنجازات" : "Badges"} value={String(u._count.achievements)} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-[11px]"
                           style={{ borderColor: "var(--heri-rule)" }}>
                        <span className="badge-violet">
                          {ar ? r.ar : r.en}
                        </span>
                        <span className="badge-slate">
                          {formatNumber(u.loginCount)} {ar ? "دخول" : "logins"}
                        </span>
                        <span className="ms-auto" style={{ color: "var(--heri-ink-3)" }}>
                          {ar ? "آخر دخول" : "last login"}: {formatRelative(u.lastLoginAt, ar ? "ar" : "en")}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-center"
      style={{ background: "var(--heri-cream-2)" }}
    >
      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--brand-deep)" }}>
        {value}
      </div>
    </div>
  );
}
