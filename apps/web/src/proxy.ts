import { NextResponse, type NextRequest } from "next/server";

import { isWaitlistOnly } from "@/lib/site";
import { updateSession } from "@/lib/supabase/proxy";

const WAITLIST_PATHS = new Set(["/", "/privacy", "/terms", "/unsubscribe"]);
const WAITLIST_ASSET_PATHS = new Set([
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
]);
const WAITLIST_API_PREFIXES = ["/api/waitlist", "/api/unsubscribe"];

function isWaitlistRoute(pathname: string): boolean {
  if (WAITLIST_PATHS.has(pathname) || WAITLIST_ASSET_PATHS.has(pathname)) return true;
  if (pathname === "/waitlist" || pathname.startsWith("/waitlist/")) return true;
  return WAITLIST_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Next.js 16 request boundary (formerly middleware.ts).
 *
 * In waitlist-only mode, app routes are not part of the public surface at all;
 * they redirect to the landing page before any session refresh can run. In the
 * normal app, every page route refreshes the Supabase session.
 */
export async function proxy(request: NextRequest) {
  if (isWaitlistOnly()) {
    if (isWaitlistRoute(request.nextUrl.pathname)) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};
