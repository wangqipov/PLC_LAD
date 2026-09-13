import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LocaleSync } from "@/app/common/i18n/LocaleSync";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IEC 61131-3 LAD",
  description: "Ladder diagram editor demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LocaleSync>{children}</LocaleSync>
      </body>
    </html>
  );
}
