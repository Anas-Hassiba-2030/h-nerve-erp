import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { Logo } from "@/components/Logo";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; email?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const locale = getLocale();
  const m = getMessages(locale);
  const ar = locale === "ar";

  return (
    <div className="space-y-6">
      <div className="text-center text-white">
        <div className="anim-fade-down mb-5 flex items-center justify-center">
          <Logo size={170} withSatellites />
        </div>
        <h1 className="anim-fade-up text-4xl font-black tracking-tight md:text-5xl" style={{ letterSpacing: "-0.02em" }}>
          {m["app.name"]}
        </h1>
        <p className="anim-fade-up mt-1 text-sm font-semibold text-white/85" style={{ animationDelay: ".1s" }}>
          {m["app.tagline"]}
        </p>
        <p className="anim-fade-up mt-1 text-[11px] uppercase tracking-[0.3em] text-white/65" style={{ animationDelay: ".2s" }}>
          {m["app.subtitle"]}
        </p>
      </div>

      <form action={loginAction} className="card card-pad space-y-4 shadow-glow anim-rise-glow" style={{ animationDelay: ".25s" }}>
        {searchParams.error ? (
          <div className="alert-danger anim-pop">{searchParams.error}</div>
        ) : null}

        <div>
          <label className="label" htmlFor="email">{m["auth.email"]}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            dir="ltr"
            className="input"
            defaultValue={searchParams.email ?? ""}
            placeholder="you@hourani.jo"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">{m["auth.password"]}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="btn-primary w-full sheen">
          <ShieldCheck className="h-4 w-4" />
          {m["common.signIn"]}
        </button>

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{m["auth.noAccount"]}</span>
          <Link href="/signup" className="font-bold" style={{ color: "var(--brand)" }}>
            {m["common.signUp"]}
          </Link>
        </div>
      </form>

      {process.env.NODE_ENV !== "production" ? (
        <div className="anim-fade-up rounded-xl border border-white/15 bg-white/10 p-3 text-center text-[11px] text-white/85 backdrop-blur" style={{ animationDelay: ".4s" }}>
          <Activity className="me-1 inline h-3.5 w-3.5" />
          {m["auth.demo"]}: <span className="font-mono" dir="ltr">admin@hourani.jo / admin123</span>
        </div>
      ) : null}

      <div className="anim-fade-in text-center text-[10px] uppercase tracking-[0.25em] text-white/55" style={{ animationDelay: ".5s" }}>
        {m["auth.poweredBy"]} · {ar ? "أنس م.ك. حصيبة · إتش-نيرف" : "Anas MK Hasiba · H-Nerve"}
      </div>
    </div>
  );
}
