import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

import type { Database } from "./database.types";

export type WaitlistAuthUserResult =
  | { status: "created" | "exists"; userId: string }
  | { status: "failed" };

/**
 * Server-only client for the waitlist RPCs that must return a bearer status
 * code or confirm an email, plus the Auth admin operation that mirrors a
 * signup into Authentication → Users. It is never imported by a client
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

/**
 * Mirrors a successful waitlist signup into Supabase Authentication so the
 * address appears under Authentication → Users. The Auth account starts
 * unconfirmed and is confirmed only after the waitlist email link (or account
 * recovery) proves ownership; this is not a login by itself.
 *
 * The username is generated from the waitlist signup id instead of the email
 * local part so the automatic public profile does not expose the address.
 * Duplicate addresses are resolved idempotently; if the existing user cannot
 * be found, the caller gets a visible failure instead of a success without a
 * link.
 */
export async function ensureWaitlistAuthUser(
  admin: SupabaseClient<Database>,
  {
    email,
    signupId,
  }: {
    email: string;
    signupId: string;
  },
): Promise<WaitlistAuthUserResult> {
  const username = `waitlist_${signupId.replace(/-/g, "").slice(0, 12)}`;

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { username, signup_source: "waitlist" },
      app_metadata: { waitlist: true },
    });

    if (!error) {
      const userId = data.user?.id;
      if (!userId) {
        console.error("[waitlist] auth user creation returned no user id.");
        return { status: "failed" };
      }
      return { status: "created", userId };
    }

    if (
      error.code === "email_exists" ||
      error.code === "user_already_exists" ||
      /already (?:been )?registered|already exists/i.test(error.message)
    ) {
      const userId = await findAuthUserByEmail(admin, email);
      if (!userId) {
        // A duplicate Auth error means a user exists, so an unresolved lookup is
        // a real consistency failure. Return failed so the route cannot report
        // success while silently skipping the auth_user_id link.
        console.error(
          "[waitlist] existing auth user could not be found by email; failing the request for retry.",
        );
        return { status: "failed" };
      }
      return { status: "exists", userId };
    }

    console.error(
      "[waitlist] auth user creation failed:",
      error.code ?? error.status ?? "unknown",
    );
    return { status: "failed" };
  } catch {
    console.error("[waitlist] auth user creation failed: request error");
    return { status: "failed" };
  }
}

/** Finds an Auth user by email for idempotent linking. */
export async function findAuthUserByEmail(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[waitlist] auth user lookup failed:", error.code ?? error.status ?? "unknown");
      return null;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }

  return null;
}
