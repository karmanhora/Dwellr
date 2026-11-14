import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";

import type { Database } from "./database.types";

const SIGN_IN_PATH = "/sign-in";

/**
 * Refreshes the Supabase session on matched requests and gates /me.
 *
 * Next.js 16 renamed middleware.ts to proxy.ts (exported function `proxy`),
 * which is why this lives behind src/proxy.ts. The proxy is a fast first line
 * of defence only — every protected page and Server Action re-checks the user
 * server-side.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() validates the token with Supabase; do not trust getSession() here.
  // If auth cannot be reached we fail closed for protected routes.
  let user: User | null = null;
  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;
  } catch (error) {
    console.error(
      "[auth] proxy could not verify the session:",
      error instanceof Error ? error.message : error,
    );
  }

  if (!user && request.nextUrl.pathname.startsWith("/me")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = SIGN_IN_PATH;
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  return response;
}
