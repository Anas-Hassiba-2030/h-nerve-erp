export function Empty({ ar, ok }: { ar: boolean; ok?: boolean }) {
  return (
    <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
      {ok
        ? ar ? "لا دفعات قرب الانتهاء. كل شيء ضمن المهلة." : "Nothing near expiry. All within window."
        : ar ? "لا بيانات تشغيلية لهذه الوحدة." : "No operational data for this unit."}
    </p>
  );
}
