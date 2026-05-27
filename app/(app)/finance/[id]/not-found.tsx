import Link from "next/link";
import { ArrowLeft, Wallet, FileSearch } from "lucide-react";

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
          <Wallet className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--heri-ink)" }}>
          الحركة المالية غير موجودة
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--heri-ink-3)" }}>
          ربما تمّ حذف هذه الحركة من السجل أو أن المرجع غير صحيح. تصفّح كل الحركات في المركز المالي.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/finance" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            المركز المالي
          </Link>
          <Link href="/finance/new" className="btn-ghost">
            <FileSearch className="h-4 w-4" />
            تسجيل حركة
          </Link>
        </div>
      </div>
    </div>
  );
}
