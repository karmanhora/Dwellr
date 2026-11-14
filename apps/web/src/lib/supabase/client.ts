import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Browser client for client components. One instance per tab is enough;
 * @supabase/ssr already persists and refreshes the session through cookies.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
