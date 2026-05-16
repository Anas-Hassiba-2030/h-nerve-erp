"use client";

// Confirm-then-delete, mirroring ClearTestImportsButton.tsx: a
// <form action={serverAction}> whose onSubmit gates on window.confirm().

import { Trash2 } from "lucide-react";
import { deleteMapping } from "./actions";

export function MappingDeleteButton({
  id,
  label,
  ar,
}: {
  id: string;
  label: string;
  ar: boolean;
}) {
  return (
    <form
      action={deleteMapping}
      onSubmit={(e) => {
        if (
          !confirm(
            ar
              ? `حذف الخريطة "${label}" نهائياً؟ لا يمكن التراجع.`
              : `Permanently delete the mapping "${label}"? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-danger btn-sm">
        <Trash2 className="h-3.5 w-3.5" />
        {ar ? "حذف" : "Delete"}
      </button>
    </form>
  );
}
