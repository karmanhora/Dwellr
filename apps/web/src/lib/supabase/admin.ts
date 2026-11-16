import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Server-only client for the narrow set of waitlist RPCs that must return a
 * bearer status code or confirm an email. It is never imported by a client
 * component and never reads request cookies.
 *
 * If the service-role key is absent, callers fall back to the public signup
 * path and the UI deliberately hides position/referral features.
 */
export function createWaitlistAdminClient(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;

  try {
    const { supabaseUrl } = getPublicEnv();
    return createClient<Database>(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}
