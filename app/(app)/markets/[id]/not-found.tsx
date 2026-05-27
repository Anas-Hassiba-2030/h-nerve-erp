import Link from "next/link";
import { ArrowLeft, TrendingUp, FileSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 anim-fade-up">
      <div className="card card-pad max-w-md text-center anim-pop">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--heri-ochre) 22%, transparent) 0%, color-mix(in srgb, var(--heri-copper) 22%, transparent) 100%)",
            color: "var(--heri-ochre)",
          }}
        >
          <TrendingUp className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--heri-ink)" }}>
          السهم غير موجود
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--heri-ink-3)" }}>
          هذا الرمز إما تمّ شطبه من المتابعة أو غير متوفر في الأسواق المُتابَعة حالياً.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/markets" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            الأسواق
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            <FileSearch className="h-4 w-4" />
            اللوحة التنفيذية
          </Link>
        </div>
      </div>
    </div>
  );
}
