"use client";

export function PrintButton({ ar }: { ar: boolean }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary w-full no-print">
      {ar ? "طباعة" : "Print"}
    </button>
  );
}
