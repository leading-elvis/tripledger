import type { Metadata, Viewport } from "next";
import LedgerShell from "./ledger-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripLedger 旅伴帳本",
  description: "記錄旅程支出、分攤與還款，將每段旅程的帳目好好保存。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TripLedger", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f2f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased"><LedgerShell/>{children}</body>
    </html>
  );
}
