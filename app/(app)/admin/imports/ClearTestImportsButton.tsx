"use client";

// Confirm-then-clear button. Mirrors the destructive-action pattern in
// app/(app)/trash/TrashClient.tsx: a <form action={serverAction}> whose
// onSubmit gates on window.confirm().

import { Trash2 } from "lucide-react";
import { clearTestImports } from "./actions";

export function ClearTestImportsButton({ ar }: { ar: boolean }) {
  return (
    <form
      action={clearTestImports}
      onSubmit={(e) => {
        if (
          !confirm(
            ar
              ? "حذف كل الاستيرادات التجريبية بما في ذلك دفعات flood-tenant والدفعات بدون مصدر (المصدر يبدأ بـ legacy- أو يحتوي على test أو فارغ، أو المستأجر = flood-tenant)؟ لا يمكن التراجع."
              : "Delete all test imports including flood-tenant and source-less batches (source starts with 'legacy-', contains 'test', is empty, or tenant = flood-tenant)? This cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn-danger btn-sm">
        <Trash2 className="h-3.5 w-3.5" />
        {ar ? "مسح الاستيرادات التجريبية" : "Clear test imports"}
      </button>
    </form>
  );
}
