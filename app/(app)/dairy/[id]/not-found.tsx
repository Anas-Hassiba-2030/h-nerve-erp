import Link from "next/link";
import { ArrowLeft, Milk, FileSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 anim-fade-up">
      <div className="card card-pad max-w-md text-center anim-pop">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #0d7eaf 22%, transparent) 0%, color-mix(in srgb, var(--gold) 22%, transparent) 100%)",
            color: "#0d7eaf",
          }}
        >
          <Milk className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
          الدفعة غير موجودة
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          هذه الدفعة قد تكون منتهية الصلاحية أو محذوفة من النظام. تصفّح أحدث دفعات المها للألبان.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/dairy" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            مركز الإنتاج
          </Link>
          <Link href="/dairy/new" className="btn-ghost">
            <FileSearch className="h-4 w-4" />
            دفعة جديدة
          </Link>
        </div>
      </div>
    </div>
  );
}
