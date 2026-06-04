import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { getTheme } from "@/lib/theme.server";
import { LoginCosmos } from "./LoginCosmos";

// The login is a full-screen cinematic takeover (its own sky, aurora, neural
// canvas, chrome, and "dive into the cosmos" sign-in transition). It paints
// over the shared (auth) backdrop. Ported from the Heritage cosmos design.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; email?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/orrery");

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
    />
  );
}
