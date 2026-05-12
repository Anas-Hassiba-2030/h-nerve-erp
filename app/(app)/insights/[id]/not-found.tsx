import Link from "next/link";
import { ArrowLeft, Sparkles, FileSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 anim-fade-up">
      <div className="card card-pad max-w-md text-center anim-pop">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #1c5fbe 22%, transparent) 0%, color-mix(in srgb, var(--accent) 22%, transparent) 100%)",
            color: "#1c5fbe",
          }}
        >
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>
          الإشارة غير موجودة
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          هذه الإشارة ربما تمّ حلها أو أرشفتها. تصفّح أحدث إشارات الذكاء التشغيلي.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/insights" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            الإشارات
          </Link>
          <Link href="/insights/new" className="btn-ghost">
            <FileSearch className="h-4 w-4" />
            إشارة جديدة
          </Link>
        </div>
      </div>
    </div>
  );
}
