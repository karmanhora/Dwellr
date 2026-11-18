#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const PAGE_SIZE = 200;
const USER_PAGE_SIZE = 1000;
const DEFAULT_DELAY_MS = 120;

function loadLocalEnv() {
  const file = process.env.WAITLIST_BACKFILL_ENV_FILE ?? "apps/web/.env.local";
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] ??= value;
  }
}

function argumentValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usernameFor(signupId) {
  return `waitlist_${signupId.replace(/-/g, "").slice(0, 12)}`;
}

function isDuplicateAuthError(error) {
  return (
    error?.code === "email_exists" ||
    error?.code === "user_already_exists" ||
    /already (?:been )?registered|already exists/i.test(error?.message ?? "")
  );
}

async function findAuthUser(admin, email) {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USER_PAGE_SIZE,
    });
    if (error) throw new Error(`Auth user lookup failed: ${error.code ?? "unknown"}`);

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < USER_PAGE_SIZE) return null;
  }
  return null;
}

async function main() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const apply = process.argv.includes("--apply");
  const includeUnsubscribed = process.argv.includes("--include-unsubscribed");
  const project = argumentValue("--project");
  const delayMs = Number(argumentValue("--delay-ms") ?? DEFAULT_DELAY_MS);

  if (!url || !key) {
    fail(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (apps/web/.env.local is read when present).",
    );
  }

  let projectRef;
  try {
    projectRef = new URL(url).hostname.split(".")[0];
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }

  if (apply && project !== projectRef) {
    fail(
      `Refusing to write. Re-run with --apply --project=${projectRef} after verifying this is the intended Supabase project.`,
    );
  }

  if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 5000) {
    fail("--delay-ms must be a number between 0 and 5000.");
  }

  console.log(`Supabase project: ${projectRef}`);
  console.log(`Mode: ${apply ? "APPLY (writes)" : "DRY RUN (no writes)"}`);
  console.log(`Waitlist rows: ${includeUnsubscribed ? "all" : "subscribed only"}`);

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let from = 0;
  let scanned = 0;
  let alreadyLinked = 0;
  let linkedExisting = 0;
  let created = 0;
  let confirmed = 0;
  let failed = 0;

  const authUsers = new Map();
  if (apply) {
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: USER_PAGE_SIZE,
      });
      if (error) fail(`Auth user list failed: ${error.code ?? "unknown"}`);
      for (const user of data.users) {
        if (user.email) authUsers.set(user.email.toLowerCase(), user);
      }
      if (data.users.length < USER_PAGE_SIZE) break;
    }
    console.log(`Existing Auth users loaded: ${authUsers.size}`);
  }

  while (true) {
    let query = admin
      .from("waitlist_signups")
      .select("id,email,email_confirmed_at,auth_user_id")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (!includeUnsubscribed) query = query.is("unsubscribed_at", null);

    const { data, error } = await query;
    if (error) {
      fail(
        `Could not read waitlist_signups. Apply the auth_user_id migration first (${error.code ?? "unknown"}).`,
      );
    }
    if (!data?.length) break;

    for (const row of data) {
      scanned += 1;

      if (!apply) continue;

      try {
        let authUser = row.auth_user_id
          ? null
          : (authUsers.get(row.email.toLowerCase()) ??
            (await findAuthUser(admin, row.email)));

        if (row.auth_user_id) {
          alreadyLinked += 1;
        } else if (authUser) {
          linkedExisting += 1;
          authUsers.set(row.email.toLowerCase(), authUser);
        } else {
          const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
            email: row.email,
            email_confirm: false,
            user_metadata: {
              username: usernameFor(row.id),
              signup_source: "waitlist",
            },
            app_metadata: { waitlist: true },
          });

          if (createError) {
            if (!isDuplicateAuthError(createError)) {
              throw new Error(`Auth create failed: ${createError.code ?? "unknown"}`);
            }
            authUser = await findAuthUser(admin, row.email);
            if (!authUser) throw new Error("Existing Auth user could not be found by email.");
            linkedExisting += 1;
          } else {
            authUser = createdUser.user;
            if (!authUser) throw new Error("Auth create returned no user.");
            created += 1;
          }
          authUsers.set(row.email.toLowerCase(), authUser);
        }

        const authUserId = row.auth_user_id ?? authUser?.id;
        if (!authUserId) throw new Error("No Auth user id available for this row.");

        if (!row.auth_user_id) {
          const { error: linkError } = await admin
            .from("waitlist_signups")
            .update({ auth_user_id: authUserId })
            .eq("id", row.id);
          if (linkError) throw new Error(`Auth link failed: ${linkError.code ?? "unknown"}`);
        }

        // Only a waitlist row that already proved email ownership may confirm
        // the Auth email. Unconfirmed waitlist rows stay unconfirmed.
        if (row.email_confirmed_at) {
          const { error: confirmError } = await admin.auth.admin.updateUserById(authUserId, {
            email_confirm: true,
          });
          if (confirmError) throw new Error(`Auth confirm failed: ${confirmError.code ?? "unknown"}`);
          confirmed += 1;
        }

        if (delayMs > 0) await sleep(delayMs);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "unknown error";
        console.error(`Row ${row.id} failed: ${message}`);
      }
    }

    from += data.length;
    if (data.length < PAGE_SIZE) break;
  }

  console.log("\nSummary");
  console.log(`  scanned:        ${scanned}`);
  console.log(`  created:        ${created}`);
  console.log(`  linked existing:${linkedExisting}`);
  console.log(`  already linked: ${alreadyLinked}`);
  console.log(`  auth confirmed: ${confirmed}`);
  console.log(`  failed:         ${failed}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backfill failed.");
  process.exitCode = 1;
});
