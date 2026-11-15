import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";

import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { WaitlistFooter } from "@/components/waitlist/waitlist-footer";
import { WaitlistHeader } from "@/components/waitlist/waitlist-header";
import { getCurrentUser } from "@/lib/auth";
import { getProfileById } from "@/lib/properties";
import { getSiteUrl, isWaitlistOnly, SITE_NAME } from "@/lib/site";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: "dwellr — find a home, together",
    template: "%s · dwellr",
  },
  description:
    "A social network for home hunting. Post homes, keep the details that matter, and decide together.",
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F2422",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const waitlistOnly = isWaitlistOnly();
  const user = waitlistOnly ? null : await getCurrentUser();
  const profile = user ? await getProfileById(user.id) : null;

  const shell = (
    <>
      {waitlistOnly ? <WaitlistHeader /> : <SiteHeader />}
      <main className={waitlistOnly ? "flex-1" : "flex-1 pb-16 md:pb-0"}>{children}</main>
      {waitlistOnly ? <WaitlistFooter /> : <SiteFooter />}
      {waitlistOnly ? null : <MobileNav username={profile?.username ?? null} />}
    </>
  );

  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        {waitlistOnly ? shell : <ToastProvider>{shell}</ToastProvider>}
      </body>
    </html>
  );
}
