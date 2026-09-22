import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripLedger 旅伴帳本",
  description: "記錄旅程支出、分攤與還款，將每段旅程的帳目好好保存。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
