import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 request boundary (formerly middleware.ts).
 * Only auth-relevant routes are matched so public pages and assets are untouched.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/me/:path*"],
};
