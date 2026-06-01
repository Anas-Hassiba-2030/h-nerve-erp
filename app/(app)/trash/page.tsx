import { Trash2 } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { requireUser } from "@/lib/session";
import { hasRole } from "@/lib/authz";
import type { SoftEntity } from "@/lib/softDelete";
import { TrashClient, type TrashItem } from "./TrashClient";
import { purgeAllExpired } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

// Items past this age are recoverable but flagged as "pending purge". Mirrors
// SOFT_DELETE_GRACE_MS in lib/cleanupSoftDeletes.ts.
const GRACE_MS = 24 * 60 * 60 * 1000;

export default async function TrashPage() {
  const ar = getLocale() === "ar";
  const user = await requireUser();
  const isManager = hasRole(user, "MANAGER");

  // Scope per role: STAFF see only their own deleted tasks; MANAGER+ see all
  // deleted records across the group. Project / Insight / Forecast are
  // group-level entities — never scoped to a single user — so STAFF only see
  // them in trash if they're managers.
  const taskWhere = isManager
    ? { deletedAt: { not: null } }
    : { deletedAt: { not: null }, assigneeId: user.id };

  // Pull every soft-deleted record (in scope). Capped at 200 per type so a
  // runaway purge job can't OOM the page render.
  const [tasks, projects, insights, forecasts] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      orderBy: { deletedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        module: true,
        deletedAt: true,
      },
    }),
    isManager
      ? prisma.futureProject.findMany({
          where: { deletedAt: { not: null } },
          orderBy: { deletedAt: "desc" },
          take: 200,
          select: {
            id: true,
            title: true,
            deletedAt: true,
            company: { select: { name: true } },
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          title: string;
          deletedAt: Date | null;
          company: { name: string };
        }>),
    isManager
      ? prisma.aIInsight.findMany({
          where: { deletedAt: { not: null } },
          orderBy: { deletedAt: "desc" },
          take: 200,
          select: {
            id: true,
            title: true,
            module: true,
            severity: true,
            deletedAt: true,
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          title: string;
          module: string;
          severity: string;
          deletedAt: Date | null;
        }>),
    isManager
      ? prisma.supplyForecast.findMany({
          where: { deletedAt: { not: null } },
          orderBy: { deletedAt: "desc" },
          take: 200,
          select: {
            id: true,
            productLabel: true,
            deletedAt: true,
            source: { select: { name: true } },
            target: { select: { name: true } },
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          productLabel: string;
          deletedAt: Date | null;
          source: { name: string };
          target: { name: string };
        }>),
  ]);

  // Project to a single uniform shape the client renders.
  const items: TrashItem[] = [
    ...tasks.map<TrashItem>((t) => ({
      entity: "task",
      id: t.id,
      label: t.title,
      sub: t.module,
      deletedAt: (t.deletedAt as Date).toISOString(),
    })),
    ...projects.map<TrashItem>((p) => ({
      entity: "project",
      id: p.id,
      label: p.title,
      sub: p.company.name,
      deletedAt: (p.deletedAt as Date).toISOString(),
    })),
    ...insights.map<TrashItem>((i) => ({
      entity: "insight",
      id: i.id,
      label: i.title,
      sub: `${i.module} · ${i.severity}`,
      deletedAt: (i.deletedAt as Date).toISOString(),
    })),
    ...forecasts.map<TrashItem>((f) => ({
      entity: "forecast",
      id: f.id,
      label: f.productLabel,
      sub: `${f.source.name} → ${f.target.name}`,
      deletedAt: (f.deletedAt as Date).toISOString(),
    })),
  ].sort(
    (a, b) =>
      new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
  );

  const expiredCount = items.filter(
    (i) => Date.now() - new Date(i.deletedAt).getTime() > GRACE_MS,
  ).length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "النظام" : "System"}
        title={ar ? "سلة المحذوفات" : "Trash"}
        subtitle={
          ar
            ? "كل عنصر محذوف ناعماً يبقى قابلاً للاسترجاع لمدة 24 ساعة قبل الحذف الدائم."
            : "Soft-deleted items stay recoverable for 24 hours before permanent purge."
        }
        actions={
          expiredCount > 0 ? (
            <form action={purgeAllExpired}>
              <button type="submit" className="dl-btn dl-btn-secondary">
                <Trash2 className="h-3.5 w-3.5" />
                <span>
                  {ar ? `تفريغ ${expiredCount} منتهي الصلاحية` : `Purge ${expiredCount} expired`}
                </span>
              </button>
            </form>
          ) : null
        }
      />
        {items.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title={ar ? "السلة فارغة" : "Trash is empty"}
            description={
              ar
                ? "لا توجد عناصر محذوفة في الوقت الحالي. أي حذف ناعم سيظهر هنا قبل تفريغ نهائي بعد 24 ساعة."
                : "No deleted items right now. Any soft-delete will land here before its 24-hour permanent purge."
            }
          />
        ) : (
          <TrashClient items={items} graceMs={GRACE_MS} ar={ar} />
        )}
    </DaylightShell>
  );
}

// Re-export for type inference at the import site.
export type { TrashItem } from "./TrashClient";
export type TrashEntity = SoftEntity;
