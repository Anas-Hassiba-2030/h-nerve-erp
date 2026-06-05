import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getTheme } from "@/lib/theme/theme.server";
import { LoginCosmos } from "./LoginCosmos";

// The login is a full-screen cinematic takeover (its own sky, aurora, neural
// canvas, chrome, and "dive into the cosmos" sign-in transition). It paints
// over the shared (auth) backdrop. Ported from the Heritage cosmos design.
// Only allow a same-origin app path as the post-login destination — reject
// absolute URLs, protocol-relative "//evil.com", and anything not starting
// with a single "/" — so ?to= can't become an open redirect.
function safeDest(to: string | undefined): string {
  if (!to || !to.startsWith("/") || to.startsWith("//")) return "/orrery";
  if (to.includes(":")) return "/orrery";
  return to;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; email?: string; to?: string };
}) {
  const dest = safeDest(searchParams.to);
  const user = await getCurrentUser();
  if (user) redirect(dest);

  const locale = getLocale();
  const ar = locale === "ar";
  const theme = getTheme();
  // The theme toggle is a self-contained dawn/night sky swap (see LoginCosmos);
  // it does not mutate the app-wide theme. We seed the initial sky from a calm
  // default so the very first frame is on-brand deep-emerald night.
  const skyDawn = theme.id === "amber" || theme.id === "rose";

  return (
    <LoginCosmos
      ar={ar}
      skyDawn={skyDawn}
      initialEmail={searchParams.email ?? ""}
      initialError={searchParams.error ?? ""}
      dest={dest}
    />
  );
}
