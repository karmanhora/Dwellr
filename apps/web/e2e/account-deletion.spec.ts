import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

import { expect, test } from "@playwright/test";

type Counts = {
  auth_users: number;
  profiles: number;
  notifications: number;
  waitlist_rows: number;
  storage_objects: number;
  auth_sessions: number;
  refresh_tokens: number;
};

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_TEST_DB_URL;

if (!supabaseUrl || !anonKey || !serviceKey || !dbUrl) {
  throw new Error(
    "Run this suite through playwright.account-deletion.config.ts so the local Supabase credentials are available.",
  );
}

const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `hauscrawl.delete.${runId}@gmail.com`;
const password = "HausCrawlDelete42!";

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const userClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const db = new Client({ connectionString: dbUrl });
let userId = "";
let dbConnected = false;

const uploads = [
  {
    bucket: "avatars",
    name: "delete-test.png",
    type: "image/png",
    body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  },
  {
    bucket: "property-photos",
    name: "delete-test.png",
    type: "image/png",
    body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  },
  {
    bucket: "post-photos",
    name: "delete-test.png",
    type: "image/png",
    body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  },
  {
    bucket: "post-videos",
    name: "delete-test.mp4",
    type: "video/mp4",
    body: Buffer.from("account deletion storage fixture"),
  },
] as const;

async function readCounts(): Promise<Counts> {
  const result = await db.query<Counts>(
    `
      select
        (select count(*)::int from auth.users where id = $1::uuid) as auth_users,
        (select count(*)::int from public.profiles where id = $1::uuid) as profiles,
        (select count(*)::int from public.notifications
          where user_id = $1::uuid or actor_id = $1::uuid or $1::uuid = any(actor_ids)) as notifications,
        (select count(*)::int from public.waitlist_signups
          where lower(email) = lower($3)) as waitlist_rows,
        (select count(*)::int from storage.objects where name like $2) as storage_objects,
        (select count(*)::int from auth.sessions where user_id = $1::uuid) as auth_sessions,
        (select count(*)::int from auth.refresh_tokens
          where user_id::text = $1::text) as refresh_tokens
    `,
    [userId, `${userId}/%`, email],
  );

  return result.rows[0]!;
}

test.beforeAll(async () => {
  await db.connect();
  dbConnected = true;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: `delete${runId.replace(/[^a-z0-9]/g, "").slice(-12)}`,
      display_name: "Delete regression",
    },
  });

  if (error || !data.user) {
    throw new Error(`Could not create the disposable user: ${error?.message ?? "missing user"}`);
  }
  userId = data.user.id;

  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(
      `Could not sign in the disposable user for storage seeding: ${signInError.message}`,
    );
  }

  for (const upload of uploads) {
    const objectPath = `${userId}/${upload.name}`;
    const { error: uploadError } = await userClient.storage
      .from(upload.bucket)
      .upload(objectPath, new Blob([upload.body], { type: upload.type }), {
        contentType: upload.type,
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`Could not seed ${upload.bucket}/${objectPath}: ${uploadError.message}`);
    }
  }

  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: userId,
    actor_id: userId,
    type: "follow",
    actor_ids: [userId],
    actor_count: 1,
  });
  if (notificationError) {
    throw new Error(`Could not seed the notification: ${notificationError.message}`);
  }

  const { error: waitlistError } = await admin.from("waitlist_signups").insert({
    email,
    ip_hash: randomBytes(32).toString("hex"),
    referral_code: randomBytes(5).toString("hex"),
    status_code: randomBytes(12).toString("hex"),
  });
  if (waitlistError) {
    throw new Error(`Could not seed the waitlist row: ${waitlistError.message}`);
  }

  await expect(readCounts()).resolves.toMatchObject({
    auth_users: 1,
    profiles: 1,
    notifications: 1,
    waitlist_rows: 1,
    storage_objects: 4,
  });
});

test("deleting an account removes auth, profile, storage, notifications, waitlist, sessions and refresh tokens", async ({
  page,
}) => {
  await page.goto("/sign-in?next=/me");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Notifications, 1 unread/ })).toBeVisible();

  const signedIn = await readCounts();
  expect(signedIn.auth_sessions).toBeGreaterThan(0);
  expect(signedIn.refresh_tokens).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Delete account" }).click();
  await page.locator("#delete-account-confirmation").fill(email);
  await page.getByRole("button", { name: "Delete permanently" }).click();

  await expect(page).toHaveURL("http://127.0.0.1:3102/");

  await expect.poll(readCounts, { timeout: 10_000 }).toEqual({
    auth_users: 0,
    profiles: 0,
    notifications: 0,
    waitlist_rows: 0,
    storage_objects: 0,
    auth_sessions: 0,
    refresh_tokens: 0,
  });

  // The stale browser session must no longer authorize the account page.
  await page.goto("/me");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fme$/);
});

test.afterAll(async () => {
  if (userId) {
    for (const upload of uploads) {
      await admin.storage.from(upload.bucket).remove([`${userId}/${upload.name}`]);
    }
    await admin.from("notifications").delete().eq("user_id", userId);
    await admin.from("waitlist_signups").delete().eq("email", email);
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  }

  if (dbConnected) await db.end();
});
