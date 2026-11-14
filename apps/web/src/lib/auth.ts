import { cache } from "react";

import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Current user for the request. cache() dedupes the Supabase call across the
 * layout and page that render in the same request.
 *
 * getUser() verifies the JWT with Supabase Auth; it is the only trustworthy
 * way to read identity on the server. Missing configuration still throws
 * loudly, but a transient auth outage only means "signed out" so the public
 * site keeps rendering.
 */
export const getCurrentUser = cache(async () => {
  // Fail loudly on misconfiguration; this must never be swallowed below.
  getPublicEnv();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch (error) {
    console.error(
      "[auth] could not read the current user:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
});
