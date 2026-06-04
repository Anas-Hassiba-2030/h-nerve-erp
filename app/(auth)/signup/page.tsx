import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale, getMessages } from "@/lib/i18n/i18n.server";
import { Logo } from "@/components/layout/Logo";
import { signupAction } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const locale = getLocale();
  const m = getMessages(locale);

  return (
    <div className="space-y-6">
      <div className="text-center text-white">
        <div className="anim-fade-down mb-3 flex items-center justify-center">
          <Logo size={120} withSatellites />
        </div>
        <h1 className="anim-fade-up text-3xl font-black tracking-tight">
          {m["auth.createAccount"]}
        </h1>
        <p className="anim-fade-up mt-1 text-sm text-white/85" style={{ animationDelay: ".1s" }}>
          {m["app.tagline"]}
        </p>
      </div>

      <form action={signupAction} className="card card-pad space-y-4 shadow-glow anim-rise-glow">
        {searchParams.error ? (
          <div className="alert-danger anim-pop">{searchParams.error}</div>
        ) : null}

        <div>
          <label className="label" htmlFor="name">{m["auth.fullName"]}</label>
          <input id="name" name="name" required className="input" placeholder={locale === "ar" ? "مثل: أنس حسيبة" : "e.g. Anas Hasiba"} />
        </div>
        <div>
          <label className="label" htmlFor="email">{m["auth.email"]}</label>
          <input id="email" name="email" type="email" required dir="ltr" className="input" placeholder="you@hourani.jo" />
        </div>
        <div>
          <label className="label" htmlFor="password">{m["auth.password"]} (≥ 6)</label>
          <input id="password" name="password" type="password" minLength={6} required className="input" placeholder="••••••••" />
        </div>

        <button type="submit" className="btn-primary w-full sheen">
          <UserPlus className="h-4 w-4" />
          {m["common.signUp"]}
        </button>

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{m["auth.haveAccount"]}</span>
          <Link href="/login" className="font-bold" style={{ color: "var(--brand)" }}>
            {m["common.signIn"]}
          </Link>
        </div>
      </form>
    </div>
  );
}
