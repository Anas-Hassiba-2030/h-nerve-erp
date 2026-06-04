// Pinned items page — surfaces the user's bookmarked entities across
// every module in one fast-access grid. Grouped by entity type with
// counts, plus an unpin button on each card.
// Ported to the Heritage Luxury "daylight" register — markup mirrors
// docs/design/system/sections/pinned.html (.sec-head + .pinned-grid of
// .co-tile cards). Real data is fed by the Prisma-backed listPins below.

import {
  Building2, Hotel, Milk, Sprout, GraduationCap, Brain,
  Sparkles, ListChecks, FlaskConical, Wallet,
} from "lucide-react";
import Link from "next/link";
import { PinButton } from "@/components/PinButton";
import { listPins } from "@/lib/utils/pins";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatNumber } from "@/lib/utils/utils";
import "../daylight.css";
import "./pinned.css";

export const dynamic = "force-dynamic";

const ENTITY_META: Record<string, { ar: string; en: string }> = {
  COMPANY: { ar: "شركات", en: "Companies" },
  HOTEL: { ar: "فنادق", en: "Hotels" },
  BOOKING: { ar: "حجوزات", en: "Bookings" },
  DAIRY: { ar: "ألبان", en: "Dairy" },
  FARM: { ar: "مزارع", en: "Farms" },
  PROGRAM: { ar: "برامج", en: "Programs" },
  FORECAST: { ar: "تنبؤات", en: "Forecasts" },
  INSIGHT: { ar: "إشارات", en: "Insights" },
  TASK: { ar: "مهام", en: "Tasks" },
  PROJECT: { ar: "مشاريع", en: "Projects" },
  TRANSACTION: { ar: "معاملات", en: "Transactions" },
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
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow">
            <span className="tick" />
            {ar ? "المساحة · المثبّت" : "Workspace · Pinned"}
          </div>
          <h1 className="sec-title">{ar ? "المثبّت" : "Pinned items"}</h1>
          <p className="sec-sub">
            {pins.length
              ? ar
                ? `${formatNumber(pins.length)} عنصر مثبت عبر ${formatNumber(grouped.size)} نوع — وصول سريع.`
                : `${formatNumber(pins.length)} pinned items across ${formatNumber(grouped.size)} types — fast access.`
              : ar
              ? "العناصر التي ثبّتها عبر كل الأنواع — وصول سريع."
              : "The items you pinned across every type — fast access."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر" : "Live"}</span>
        </div>
      </div>

      {pins.length === 0 ? (
        <div className="pinned-grid reveal">
          <div className="pinned-empty">
            <div className="pe-ic">◆</div>
            <div className="pe-t">{ar ? "لا عناصر مثبّتة" : "Nothing pinned yet"}</div>
            <p className="sec-sub" style={{ margin: "8px auto 0" }}>
              {ar
                ? "اضغط على أيقونة الدبوس في صفحة أي شركة، فندق، مشروع، أو مهمة لتثبيتها هنا."
                : "Tap the pin icon on any company, hotel, project, or task page to bookmark it here."}
            </p>
            <div className="sec-actions" style={{ justifyContent: "center", marginTop: 16 }}>
              <Link href="/companies" className="dl-btn dl-btn-secondary">
                <Building2 className="h-4 w-4" />
                {ar ? "تصفح الشركات" : "Browse companies"}
              </Link>
              <Link href="/projects" className="dl-btn dl-btn-secondary">
                <FlaskConical className="h-4 w-4" />
                {ar ? "المشاريع" : "Projects"}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([entityType, items]) => {
          const meta = ENTITY_META[entityType];
          return (
            <div key={entityType} className="panel reveal">
              <div className="panel-head">
                <div className="panel-title">
                  {ar ? meta?.ar ?? entityType : meta?.en ?? entityType}
                </div>
                <div className="panel-aside">
                  {ar
                    ? `${formatNumber(items.length)} عنصر`
                    : `${formatNumber(items.length)} item${items.length === 1 ? "" : "s"}`}
                </div>
              </div>
              <div className="pinned-grid">
                {items.map((p) => (
                  <div key={p.id} className="co-tile">
                    <Link href={p.href} style={{ textDecoration: "none", display: "block" }}>
                      <span className="ops-tag info">
                        {ar ? meta?.ar ?? entityType : meta?.en ?? entityType}
                      </span>
                      <div className="co-nm" style={{ marginTop: 10 }}>
                        {ar ? p.label : p.labelEn ?? p.label}
                      </div>
                    </Link>
                    <div style={{ marginTop: 10 }}>
                      <PinButton
                        entityType={p.entityType}
                        entityId={p.entityId}
                        label={p.label}
                        labelEn={p.labelEn ?? undefined}
                        href={p.href}
                        icon={p.icon ?? undefined}
                        initial={true}
                        tone="compact"
                        locale={ar ? "ar" : "en"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <p style={{ textAlign: "center", fontSize: "10.5px", color: "var(--ink-muted)", marginTop: 12 }}>
        {ar
          ? "لتثبيت عنصر — افتح صفحته واضغط أيقونة الدبوس"
          : "To pin an item — open its page and tap the pin icon"}
      </p>
    </div>
  );
}
