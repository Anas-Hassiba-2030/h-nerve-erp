import Link from "next/link";
import {
  Newspaper,
  Sparkles,
  ArrowUpRight,
  Calendar,
  Brain,
  Plus,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { PageContainer } from "@/components/PageContainer";
import { EmptyState } from "@/components/EmptyState";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/authz";
import { listDigests } from "@/lib/digest";
import { formatNumber } from "@/lib/utils";
import { generateNewDigest } from "./actions";

export default async function DigestListPage() {
  const ar = getLocale() === "ar";
  const session = await getCurrentUser();
  const canGenerate = hasRole(session, "MANAGER");

  const digests = await listDigests(50);

  // Date format — en-US digits per house style
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const relativeFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <Topbar
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={ar ? "الموجز التنفيذي" : "Executive digest"}
        subtitle={
          ar
            ? "ملخّصات أسبوعية مولّدة آلياً تجمع نبض المجموعة في مكان واحد."
            : "Auto-generated weekly snapshots that compress the group's pulse into one read."
        }
        actions={
          canGenerate ? (
            <form action={generateNewDigest}>
              <button type="submit" className="btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "توليد موجز جديد" : "Generate new digest"}
              </button>
            </form>
          ) : null
        }
      />

      <PageContainer>
        {digests.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={ar ? "لا توجد موجزات بعد" : "No digests yet"}
            description={
              ar
                ? "انقر «توليد موجز جديد» لإطلاق المحرك التنبؤي وحفظ أول لقطة أسبوعية."
                : "Hit \"Generate new digest\" to run the predictive engine and store the first weekly snapshot."
            }
            action={
              canGenerate ? (
                <form action={generateNewDigest}>
                  <button type="submit" className="btn-primary">
                    <Sparkles className="h-4 w-4" />
                    {ar ? "توليد الآن" : "Generate now"}
                  </button>
                </form>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {digests.map((d, i) => (
              <li
                key={d.id}
                className="anim-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <Link
                  href={`/digest/${d.id}`}
                  className="card card-hover card-pad block"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                          style={{
                            background: "var(--brand-soft)",
                            color: "var(--brand-deep)",
                          }}
                        >
                          <Calendar className="h-3 w-3" />
                          {relativeFmt.format(d.weekStart)} →{" "}
                          {relativeFmt.format(d.weekEnd)}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                          style={{
                            background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                            color: "var(--accent)",
                          }}
                        >
                          <Brain className="h-3 w-3" />
                          {formatNumber(d.insightCount)}{" "}
                          {ar ? "إشارة" : "signals"}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {ar ? "صدر" : "Issued"} {dateFmt.format(d.createdAt)}
                        </span>
                      </div>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: "var(--text)" }}
                      >
                        {d.summary}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 rtl:-scale-x-100"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  );
}
