import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Brain,
  Lightbulb,
  Clock,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/ui/StatusBadge";
import "../../daylight.css";
import { PinButton } from "@/components/ui/PinButton";
import { prisma } from "@/lib/db/db";
import { isPinned } from "@/lib/utils/pins";
import {
  formatRelative,
  formatDateTime,
  severityAr,
} from "@/lib/utils/utils";
import { rankById } from "@/lib/utils/gamification";

const SEVERITY_ICON: Record<string, typeof Sparkles> = {
  CRITICAL: AlertTriangle,
  WARN: AlertTriangle,
  OPPORTUNITY: Lightbulb,
  INFO: Sparkles,
};

// Daylight palette — single inline-start rail per severity.
const SEVERITY_RAIL: Record<string, string> = {
  CRITICAL:    "var(--brick)",
  WARN:        "var(--gold)",
  OPPORTUNITY: "var(--emerald)",
  INFO:        "var(--gold)",
};
const SEVERITY_PILL: Record<string, "critical" | "warn" | "success" | "info"> = {
  CRITICAL: "critical",
  WARN: "warn",
  OPPORTUNITY: "success",
  INFO: "info",
};

// Keys MUST match the module codes actually stored on AIInsight (the
// createInsight zod enum + aiEngine output): HOTELS / DAIRY / FARMS / SUPPLY /
// FINANCE / EDUCATION. The previous map keyed on HOSPITALITY/AGRICULTURE/…
// which never matched, so Hotels and Farms insights rendered their raw code.
// Mirrors MODULE_AR in app/(app)/insights/page.tsx.
const MODULE_AR: Record<string, string> = {
  HOTELS: "الفنادق",
  DAIRY: "الألبان",
  FARMS: "المزارع",
  SUPPLY: "سلسلة التوريد",
  FINANCE: "المالية",
  EDUCATION: "التعليم",
};

export default async function InsightDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const insight = await prisma.aIInsight.findUnique({
    where: { id: params.id },
    include: {
      author: {
        select: { id: true, name: true, role: true, rank: true, xp: true },
      },
    },
  });
  if (!insight) notFound();

  const related = await prisma.aIInsight.findMany({
    where: {
      module: insight.module,
      id: { not: insight.id },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const Icon = SEVERITY_ICON[insight.severity] ?? Sparkles;
  const rail = SEVERITY_RAIL[insight.severity] ?? SEVERITY_RAIL.INFO;
  const pillTone = SEVERITY_PILL[insight.severity] ?? "info";
  const pinned = await isPinned("INSIGHT", insight.id);

  return (
    <DaylightShell dir="rtl">
      <DaylightHeader
        eyebrow="إشارات الذكاء"
        title={insight.title}
        subtitle={`${MODULE_AR[insight.module] ?? insight.module} • ${severityAr(insight.severity)}`}
      />

      {/* Back + pin */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <Link
          href="/insights"
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--gold)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
          العودة إلى الإشارات
        </Link>
        <PinButton
          entityType="INSIGHT"
          entityId={insight.id}
          label={insight.title}
          href={`/insights/${insight.id}`}
          icon="Sparkles"
          initial={pinned}
          tone="default"
          locale="ar"
        />
      </div>

      {/* Hero panel */}
      <div className="panel reveal" style={{ position: "relative", padding: "28px 32px" }}>
        <span
          aria-hidden
          style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: 0, width: 3, background: rail }}
        />
        <div style={{ marginInlineStart: 8, display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              color: rail,
              border: "1px solid var(--line)",
              background: "var(--cream)",
            }}
          >
            <Icon className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span className={`tag ${pillTone === "success" ? "ok" : pillTone === "info" ? "ok" : "gold"}`} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>
                {severityAr(insight.severity)}
              </span>
              <span className="tag ok" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>
                {MODULE_AR[insight.module] ?? insight.module}
              </span>
              <StatusBadge status={insight.status} />
            </div>
            <h2
              style={{
                marginTop: 12,
                fontSize: "clamp(22px, 2.6vw, 34px)",
                lineHeight: 1.15,
                letterSpacing: "-0.005em",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {insight.title}
            </h2>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                fontFamily: "monospace",
                fontSize: 11,
                color: "var(--ink-muted)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Clock className="h-3 w-3" strokeWidth={1.5} />
                {formatRelative(insight.createdAt)}
              </span>
              {insight.author ? (
                <>
                  <span>·</span>
                  <Link
                    href={`/users/${insight.author.id}`}
                    style={{ color: "var(--gold)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <UserIcon className="h-3 w-3" strokeWidth={1.5} />
                    {insight.author.name}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 320px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Body */}
          <DaylightPanel title="التحليل الكامل">
            <div
              style={{ color: "var(--ink)", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-line" }}
            >
              {insight.body}
            </div>
          </DaylightPanel>

          {/* Related */}
          {related.length > 0 ? (
            <DaylightPanel
              title={`إشارات أخرى من ${MODULE_AR[insight.module] ?? insight.module}`}
              aside={<Link href="/insights" style={{ fontSize: 11, color: "var(--gold)", textDecoration: "none" }}>كل الإشارات ←</Link>}
            >
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {related.map((r) => {
                  const rRail = SEVERITY_RAIL[r.severity] ?? SEVERITY_RAIL.INFO;
                  const rPill = SEVERITY_PILL[r.severity] ?? "info";
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/insights/${r.id}`}
                        style={{
                          background: "var(--ivory)",
                          border: "1px solid var(--line)",
                          textDecoration: "none",
                          padding: "10px 14px 10px 16px",
                          display: "block",
                          position: "relative",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: 0, width: 2, background: rRail }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`tag ${rPill === "success" ? "ok" : rPill === "info" ? "ok" : "gold"}`} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>
                            {severityAr(r.severity)}
                          </span>
                          <span
                            style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}
                          >
                            {r.title}
                          </span>
                        </div>
                        <p
                          style={{ color: "var(--ink-muted)", fontSize: 12, lineHeight: 1.5, marginTop: 4 }}
                        >
                          {r.body.length > 100 ? r.body.slice(0, 100) + "…" : r.body}
                        </p>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 10,
                            color: "var(--ink-muted)",
                            marginTop: 4,
                          }}
                        >
                          {formatRelative(r.createdAt)}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </DaylightPanel>
          ) : null}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Author card */}
          {insight.author ? (
            <DaylightPanel title="ناشر الإشارة">
              <Link
                href={`/users/${insight.author.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, textDecoration: "none" }}
              >
                {(() => {
                  const r = rankById(insight.author.rank);
                  return (
                    <div
                      className="rank-piece"
                      style={{ color: r.color }}
                      title={r.ar}
                    >
                      {r.symbol}
                    </div>
                  );
                })()}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}
                  >
                    {insight.author.name}
                  </div>
                  <div
                    style={{
                      color: "var(--ink-muted)",
                      fontSize: 11,
                      fontFamily: "monospace",
                      marginTop: 2,
                    }}
                  >
                    {insight.author.role} · {insight.author.xp} XP
                  </div>
                </div>
              </Link>
            </DaylightPanel>
          ) : null}

          {/* Meta */}
          <DaylightPanel title="البطاقة">
            <dl style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <Fact
                label="الوحدة"
                value={MODULE_AR[insight.module] ?? insight.module}
              />
              <Fact label="الخطورة" value={severityAr(insight.severity)} />
              <Fact label="الحالة" value={insight.status} />
              <Fact label="نُشرت" value={formatDateTime(insight.createdAt)} />
              <Fact
                label="آخر تحديث"
                value={formatRelative(insight.updatedAt)}
              />
            </dl>
          </DaylightPanel>
        </aside>
      </div>
    </DaylightShell>
  );
}

function Fact({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div
      className="flex items-center justify-between pb-1.5 last:border-b-0"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd
        className="text-end"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--gold)" }}
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
