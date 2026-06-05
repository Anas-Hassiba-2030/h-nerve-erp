import type { Metadata } from "next";
import "./globals.css";
import { getLocale, isRtl } from "@/lib/i18n/i18n.server";
import { getTheme, themeCssVars } from "@/lib/theme/theme.server";

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
        {/* Preconnect + parallel-load the font CSS instead of @importing it
            from globals.css — @import is render-blocking, preconnect lets the
            browser open the connection while the rest of the head parses. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router loads fonts here, not pages/_document */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;900&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800;9..144,900&family=Inter+Tight:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
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
