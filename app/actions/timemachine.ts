"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { TIME_MACHINE_COOKIE } from "@/lib/utils/timemachine";

const COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: false, // readable by client TimeScrubber
  // 7-day rolling — long enough to keep your position across a session,
  // short enough that an abandoned scrubber eventually clears.
  maxAge: 60 * 60 * 24 * 7,
};

export async function setAsOfTimestamp(ts: number): Promise<void> {
  if (!Number.isFinite(ts) || ts <= 0) return;
  // Hard floor / ceiling — refuse anything before 2025-09-01 or in the future.
  const min = new Date("2025-09-01T00:00:00.000Z").getTime();
  const max = Date.now();
  const safe = Math.max(min, Math.min(max, ts));
  cookies().set(TIME_MACHINE_COOKIE, String(safe), COOKIE_OPTS);
  // Refresh the layout so banners + queries pick up the new value.
  revalidatePath("/", "layout");
}

export async function clearAsOf(): Promise<void> {
  cookies().delete(TIME_MACHINE_COOKIE);
  revalidatePath("/", "layout");
}
