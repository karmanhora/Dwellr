import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "dwellr",
  title: {
    default: "dwellr — find a home, together",
    template: "%s · dwellr",
  },
  description:
    "A social network for home hunting. Save homes, build shared collections, and decide together.",
};

export const viewport: Viewport = {
  themeColor: "#1F2422",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
