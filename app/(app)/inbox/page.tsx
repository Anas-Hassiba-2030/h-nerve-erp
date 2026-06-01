import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { getInboxItems, type InboxItem } from "@/lib/inbox";
import { formatNumber, formatRelative } from "@/lib/utils";
import { InboxFeed, type FeedItem } from "./InboxFeed";
import "../daylight.css";
import "./inbox.css";

export const dynamic = "force-dynamic";

// Reference Inbox (docs/design/system/sections/inbox.html). The 4 visual
// item types come from the reference (.tic.brain/.alert/.task/.msg); real
// inbox kinds are mapped onto them.
const KIND_TYPE: Record<InboxItem["kind"], FeedItem["type"]> = {
  brain: "brain", insight: "alert", task: "task", message: "msg",
};
const KIND_ICON: Record<FeedItem["type"], string> = {
  brain: "🧠", alert: "⚠", task: "✅", msg: "💬",
};
const KIND_CHIP_AR: Record<InboxItem["kind"], string> = {
  brain: "العقل", insight: "إشارة", task: "مهمة", message: "رسالة",
};
const KIND_CHIP_EN: Record<InboxItem["kind"], string> = {
  brain: "Brain", insight: "Insight", task: "Task", message: "Message",
};

export default async function InboxPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await getInboxItems(user.id);
  const by = (k: InboxItem["kind"]) => items.filter((i) => i.kind === k).length;

  const needAttn = by("brain") + by("insight") + by("task");
  const solvedToday = by("task"); // tasks pending your action
  const oldest = items.length ? items[items.length - 1].at : null;

  const feedItems: FeedItem[] = items.map((it) => {
    const type = KIND_TYPE[it.kind];
    return {
      id: it.id,
      type,
      icon: KIND_ICON[type],
      title: it.title,
      preview: it.body,
      chip: ar ? KIND_CHIP_AR[it.kind] : KIND_CHIP_EN[it.kind],
      time: formatRelative(it.at, lc),
      href: it.href,
    };
  });

  const pills: { f: "all" | FeedItem["type"]; label: string }[] = [
    { f: "all", label: ar ? "الكل" : "All" },
    { f: "brain", label: ar ? "العقل" : "Brain" },
    { f: "alert", label: ar ? "التنبيهات" : "Alerts" },
    { f: "task", label: ar ? "المهام" : "Tasks" },
    { f: "msg", label: ar ? "الرسائل" : "Messages" },
  ];

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="ib-wrap">
        <div className="ib-top">
          <div className="ib-title-box">
            <span className="eb"><span className="tick" />{ar ? "الأفراد" : "People"}</span>
            <h1>{ar ? "صندوق الوارد" : "Inbox"}</h1>
          </div>
          <div className="ib-kpis">
            <div className="ib-kpi">
              <div className="v">{formatNumber(needAttn)}</div>
              <div className="k">{ar ? "تحتاج الانتباه" : "Need attention"}</div>
            </div>
            <div className="ib-kpi">
              <div className="v">{formatNumber(solvedToday)}</div>
              <div className="k">{ar ? "مهامي" : "My tasks"}</div>
            </div>
            <div className="ib-kpi">
              <div className="v">{oldest ? formatRelative(oldest, lc) : "—"}</div>
              <div className="k">{ar ? "أقدم بند" : "Oldest item"}</div>
            </div>
          </div>
        </div>

        <InboxFeed
          items={feedItems}
          pills={pills}
          searchPlaceholder={ar ? "بحث في الوارد…" : "Search inbox…"}
          emptyTitle={ar ? "كل شيء تحت السيطرة" : "Everything is under control"}
          emptyDesc={ar ? "لا بنود تحتاج انتباهك الآن. سنُنبّهك عند الحاجة." : "Nothing needs your attention now. We'll alert you when it does."}
        />
      </div>
    </div>
  );
}
