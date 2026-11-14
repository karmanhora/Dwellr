import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";

import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/auth";
import { getProfileById } from "@/lib/properties";

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
    "A social network for home hunting. Post homes, keep the details that matter, and decide together.",
};

export const viewport: Viewport = {
  themeColor: "#1F2422",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const profile = user ? await getProfileById(user.id) : null;

  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        <ToastProvider>
          <SiteHeader />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <SiteFooter />
          <MobileNav username={profile?.username ?? null} />
        </ToastProvider>
      </body>
    </html>
  );
}
