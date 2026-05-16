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
              ? "حذف كل دفعات الاستيراد التجريبية (المصدر يبدأ بـ legacy- أو يحتوي على test)؟ هذا يشمل دفعات n8n الواردة من legacy-warehouse-db. لا يمكن التراجع."
              : "Delete all test import batches (source starts with 'legacy-' or contains 'test')? This includes the n8n 'legacy-warehouse-db' payloads. This cannot be undone.",
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
