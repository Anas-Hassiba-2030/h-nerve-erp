import type { Metadata } from "next";
import "./globals.css";
import { getLocale, isRtl } from "@/lib/i18n.server";
import { getTheme, themeCssVars } from "@/lib/theme.server";

export const metadata: Metadata = {
  title: "H-Nerve ERP — مجموعة الحوراني",
  description:
    "نظام H-Nerve ERP — العقل المركزي الرقمي لمجموعة الحوراني. ضيافة، ألبان، زراعة ذكية، تعليم، ذكاء تنبؤي لسلسلة التوريد، أسواق عالمية، واستدامة.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const dir = isRtl(locale) ? "rtl" : "ltr";
  const theme = getTheme();
  const styleString = themeCssVars(theme);

  return (
    <html lang={locale} dir={dir} data-theme={theme.id} style={{ cssText: styleString } as any}>
      <head>
        {/* Inline css-vars on html so theme is applied before paint */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html[data-theme="${theme.id}"] { ${styleString} }`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
