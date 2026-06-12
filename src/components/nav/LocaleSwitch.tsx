import { Globe } from "lucide-react";
import { setLocale } from "@/app/actions/preferences";
import { type Locale } from "@/lib/i18n/i18n";

export function LocaleSwitch({ current }: { current: Locale }) {
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={current === "ar" ? "en" : "ar"} />
      <button
        type="submit"
        className="btn-ghost btn-sm gap-1.5"
        title={current === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-mono">{current === "ar" ? "EN" : "AR"}</span>
      </button>
    </form>
  );
}
