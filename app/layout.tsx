import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "قطاع الأمن الدبلوماسي | البوابة الرسمية",
  description: "البوابة الرسمية لأنظمة قطاع الأمن الدبلوماسي",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
