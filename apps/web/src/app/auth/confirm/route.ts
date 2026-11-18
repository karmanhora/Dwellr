import { safeRedirectPath } from "@hauscrawl/core";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from a Supabase recovery email. The link may arrive as
 * a PKCE code or as a token hash, depending on the project's auth flow.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeRedirectPath(url.searchParams.get("next"), "/auth/reset-password");

  if (!code && !(tokenHash && type === "recovery")) {
    return NextResponse.redirect(new URL("/forgot-password?error=link", request.url));
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: "recovery",
      });

  if (error) {
    console.error("[auth] recovery link verification failed:", error.code ?? "unknown");
    return NextResponse.redirect(new URL("/forgot-password?error=link", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
