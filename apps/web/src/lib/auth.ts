import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Current user for the request. cache() dedupes the Supabase call across the
 * layout and page that render in the same request.
 *
 * getUser() verifies the JWT with Supabase Auth; it is the only trustworthy
 * way to read identity on the server.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
