// Compact 4-week calendar strip showing upcoming events as colored dots.
// Events come from many sources: bookings (check-in dates), dairy expiry,
// crop harvests, project quarter milestones, task due dates.

import Link from "next/link";

export type CalendarEvent = {
  id: string;
  date: Date;
  kind: "BOOKING" | "DAIRY_EXPIRY" | "HARVEST" | "PROJECT" | "TASK";
  title: string;
  href: string;
};

const KIND_COLOR: Record<CalendarEvent["kind"], string> = {
  BOOKING: "#f59e0b",       // amber
  DAIRY_EXPIRY: "#0ea5e9",  // sky
  HARVEST: "#10b981",       // emerald
  PROJECT: "#8b5cf6",       // violet
  TASK: "#3b82f6",          // blue
};

const KIND_AR: Record<CalendarEvent["kind"], string> = {
  BOOKING: "حجز", DAIRY_EXPIRY: "صلاحية", HARVEST: "حصاد", PROJECT: "مشروع", TASK: "مهمة",
};
const KIND_EN: Record<CalendarEvent["kind"], string> = {
  BOOKING: "Booking", DAIRY_EXPIRY: "Expiry", HARVEST: "Harvest", PROJECT: "Project", TASK: "Task",
};

export function UpcomingCalendar({
  events,
  weeks = 4,
  locale = "en",
}: {
  events: CalendarEvent[];
  weeks?: number;
  locale?: "ar" | "en";
}) {
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";
  // Today, normalized to start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build day cells starting from this week's beginning
  const totalDays = weeks * 7;
  const days: { date: Date; events: CalendarEvent[] }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dayEvents = events.filter((e) => {
      const ed = new Date(e.date);
      return (
        ed.getFullYear() === d.getFullYear() &&
        ed.getMonth() === d.getMonth() &&
        ed.getDate() === d.getDate()
      );
    });
    days.push({ date: d, events: dayEvents });
  }

  const dayLabelsEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabelsAr = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
  const dayLabels = ar ? dayLabelsAr : dayLabelsEn;

  // Counts per kind for legend
  const kindCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Day-of-week header — start with current day's day-of-week */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-[12px] font-bold uppercase tracking-widest"
           style={{ color: "var(--text-muted)" }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const dow = (today.getDay() + i) % 7;
          return (
            <div key={i} className="text-center">
              {dayLabels[dow]}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const isToday = i === 0;
          const dayNum = d.date.getDate();
          const monthLabel = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { month: "short" })
            .format(d.date);
          const isFirstOfMonth = dayNum === 1 || i === 0;
          const dotKinds = [...new Set(d.events.map((e) => e.kind))];
          return (
            <div
              key={i}
              className="relative flex aspect-square flex-col items-center justify-center rounded-md text-[12px] transition"
              style={{
                background: isToday ? "var(--brand-soft)" : "transparent",
                border: `1px solid ${isToday ? "color-mix(in srgb, var(--brand) 45%, transparent)" : "var(--border)"}`,
                color: isToday ? "var(--brand-deep)" : "var(--text)",
                animation: "fade-up .35s cubic-bezier(.21,.92,.32,1) both",
                animationDelay: `${i * 0.012}s`,
              }}
              title={d.events.map((e) => e.title).join("\n")}
            >
              {isFirstOfMonth ? (
                <div className="text-[12px] font-bold opacity-60">{monthLabel}</div>
              ) : null}
              <div className={`font-extrabold tabular-nums ${isToday ? "text-[12px]" : "text-[13px]"}`}>
                {dayNum}
              </div>
              {/* Event dots */}
              {dotKinds.length > 0 ? (
                <div className="absolute bottom-0.5 flex items-center gap-0.5">
                  {dotKinds.slice(0, 3).map((kind) => (
                    <span
                      key={kind}
                      className="block h-1.5 w-1.5 rounded-full"
                      style={{ background: KIND_COLOR[kind] }}
                    />
                  ))}
                  {dotKinds.length > 3 ? (
                    <span className="text-[7px] font-bold" style={{ color: "var(--text-muted)" }}>+</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
        {Object.entries(kindCounts).map(([kind, count]) => (
          <span key={kind} className="inline-flex items-center gap-1">
            <span
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: KIND_COLOR[kind as CalendarEvent["kind"]] }}
            />
            <span className="font-bold">
              {ar ? KIND_AR[kind as CalendarEvent["kind"]] : KIND_EN[kind as CalendarEvent["kind"]]}
            </span>
            <span className="font-mono opacity-70">{count}</span>
          </span>
        ))}
      </div>

      {/* Top 3 upcoming list */}
      {events.length > 0 ? (
        <div className="mt-3 space-y-1">
          {events
            .filter((e) => new Date(e.date).getTime() >= today.getTime())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3)
            .map((e) => {
              const d = new Date(e.date);
              const days = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
              const when =
                days === 0 ? (ar ? "اليوم" : "Today") :
                days === 1 ? (ar ? "غداً" : "Tomorrow") :
                ar ? `بعد ${days} يوم` : `In ${days} days`;
              return (
                <Link
                  key={e.id}
                  href={e.href}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] transition hover:bg-[var(--brand-soft)]"
                >
                  <span
                    className="block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: KIND_COLOR[e.kind] }}
                  />
                  <span className="line-clamp-1 flex-1 font-bold" style={{ color: "var(--text)" }}>
                    {e.title}
                  </span>
                  <span className="shrink-0 font-mono text-[12px]" style={{ color: "var(--text-muted)" }}>
                    {when}
                  </span>
                </Link>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
