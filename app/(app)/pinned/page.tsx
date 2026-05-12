// Pinned items page — surfaces the user's bookmarked entities across
// every module in one fast-access grid. Grouped by entity type with
// counts, plus an unpin button on each card.

import Link from "next/link";
import {
  Pin, Building2, Hotel, Milk, Sprout, GraduationCap, Brain,
  Sparkles, ListChecks, FlaskConical, Wallet, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { PinButton } from "@/components/PinButton";
import { listPins } from "@/lib/pins";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber, formatDate } from "@/lib/utils";

const ENTITY_META: Record<
  string,
  { icon: any; tone: string; ar: string; en: string }
> = {
  COMPANY: { icon: Building2, tone: "emerald", ar: "شركات", en: "Companies" },
  HOTEL: { icon: Hotel, tone: "amber", ar: "فنادق", en: "Hotels" },
  BOOKING: { icon: Hotel, tone: "amber", ar: "حجوزات", en: "Bookings" },
  DAIRY: { icon: Milk, tone: "sky", ar: "ألبان", en: "Dairy" },
  FARM: { icon: Sprout, tone: "emerald", ar: "مزارع", en: "Farms" },
  PROGRAM: { icon: GraduationCap, tone: "indigo", ar: "برامج", en: "Programs" },
  FORECAST: { icon: Brain, tone: "violet", ar: "تنبؤات", en: "Forecasts" },
  INSIGHT: { icon: Sparkles, tone: "amber", ar: "إشارات", en: "Insights" },
  TASK: { icon: ListChecks, tone: "blue", ar: "مهام", en: "Tasks" },
  PROJECT: { icon: FlaskConical, tone: "violet", ar: "مشاريع", en: "Projects" },
  TRANSACTION: { icon: Wallet, tone: "emerald", ar: "معاملات", en: "Transactions" },
};

const TONE: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export default async function PinnedPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const user = await getCurrentUser();
  const pins = user ? await listPins(user.id) : [];

  const grouped = new Map<string, typeof pins>();
  for (const p of pins) {
    if (!grouped.has(p.entityType)) grouped.set(p.entityType, []);
    grouped.get(p.entityType)!.push(p);
  }

  return (
    <>
      <PageHeader
        eyebrow={ar ? "المفضلة" : "Favorites"}
        title={ar ? "العناصر المثبتة" : "Pinned items"}
        subtitle={
          ar
            ? `${formatNumber(pins.length)} عنصر مثبت عبر ${formatNumber(grouped.size)} وحدة`
            : `${formatNumber(pins.length)} pinned items across ${formatNumber(grouped.size)} modules`
        }
        metrics={[
          { label: ar ? "إجمالي" : "Total", value: formatNumber(pins.length), tone: "emerald" },
          { label: ar ? "وحدات" : "Modules", value: formatNumber(grouped.size), tone: "blue" },
        ]}
      />

      <PageContainer>
        {pins.length === 0 ? (
          <div className="card card-pad py-16 text-center">
            <Pin
              className="mx-auto mb-3 h-12 w-12"
              style={{ color: "var(--text-muted)" }}
            />
            <h3
              className="text-base font-extrabold"
              style={{ color: "var(--text)" }}
            >
              {ar ? "لا عناصر مثبتة بعد" : "Nothing pinned yet"}
            </h3>
            <p
              className="mx-auto mt-1 max-w-md text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {ar
                ? "اضغط على أيقونة الدبوس في صفحة أي شركة، فندق، مشروع، أو مهمة لتثبيتها هنا للوصول السريع."
                : "Tap the pin icon on any company, hotel, project, or task page to bookmark it here for quick access."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/companies" className="btn-secondary">
                <Building2 className="h-4 w-4" />
                {ar ? "تصفح الشركات" : "Browse companies"}
              </Link>
              <Link href="/projects" className="btn-secondary">
                <FlaskConical className="h-4 w-4" />
                {ar ? "المشاريع" : "Projects"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(grouped.entries()).map(([entityType, items]) => {
              const meta = ENTITY_META[entityType];
              const Icon = meta?.icon ?? Pin;
              return (
                <section key={entityType} className="card card-pad">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${TONE[meta?.tone ?? "emerald"]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3
                        className="text-[13px] font-extrabold"
                        style={{ color: "var(--text)" }}
                      >
                        {ar ? meta?.ar ?? entityType : meta?.en ?? entityType}
                      </h3>
                      <p
                        className="text-[10.5px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {ar
                          ? `${formatNumber(items.length)} عنصر`
                          : `${formatNumber(items.length)} item${items.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((p) => (
                      <li key={p.id}>
                        <div
                          className="card card-hover group flex items-center gap-2 p-3"
                        >
                          <Link
                            href={p.href}
                            className="flex min-w-0 flex-1 items-center gap-2"
                          >
                            <div className="min-w-0">
                              <div
                                className="line-clamp-1 text-[12.5px] font-extrabold"
                                style={{ color: "var(--text)" }}
                              >
                                {ar ? p.label : p.labelEn ?? p.label}
                              </div>
                              <div
                                className="text-[10px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {formatDate(p.createdAt, ar ? "ar" : "en")}
                              </div>
                            </div>
                            <ArrowRight
                              className="ms-auto h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                              style={{ color: "var(--text-muted)" }}
                            />
                          </Link>
                          <PinButton
                            entityType={p.entityType}
                            entityId={p.entityId}
                            label={p.label}
                            labelEn={p.labelEn ?? undefined}
                            href={p.href}
                            icon={p.icon ?? undefined}
                            initial={true}
                            tone="icon-only"
                            locale={ar ? "ar" : "en"}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <p
          className="text-center text-[10.5px]"
          style={{ color: "var(--text-muted)" }}
        >
          {ar
            ? "💡 لتثبيت عنصر — افتح صفحته واضغط أيقونة الدبوس"
            : "💡 To pin an item — open its page and tap the pin icon"}
        </p>
      </PageContainer>
    </>
  );
}
