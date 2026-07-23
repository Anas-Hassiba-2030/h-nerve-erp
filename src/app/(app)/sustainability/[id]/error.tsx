"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sustainability/[id]] error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-12 anim-fade-up">
      <div className="card card-pad max-w-md text-center anim-pop">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #c0392b 22%, transparent) 0%, color-mix(in srgb, #f5b341 22%, transparent) 100%)",
            color: "#c0392b",
          }}
        >
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
          خطأ في تحميل تقرير ESG
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          تعذّر جلب بيانات الاستدامة لهذه الفترة. حاول مجدداً.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
            مرجع الخطأ: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-center gap-2">
          <button onClick={reset} className="btn-primary">
            <RotateCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
          <Link href="/sustainability" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            تقارير ESG
          </Link>
        </div>
      </div>
    </div>
  );
}
