import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 request boundary (formerly middleware.ts).
 *
 * Every page route runs through the proxy so the Supabase session is refreshed
 * on each navigation, not only when someone visits a protected page. Static
 * assets and images are excluded because they never carry a session.
 *
 * Refreshing is the proxy's only job for public routes; `/me` is the sole route
 * where a missing user triggers a redirect (see lib/supabase/proxy.ts).
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};
