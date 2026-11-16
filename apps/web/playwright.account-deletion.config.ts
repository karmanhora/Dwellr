import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

function repoRoot(): string {
  let current = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(current, "supabase", "config.toml"))) return current;
    current = path.dirname(current);
  }
  throw new Error("Could not find the repository root containing supabase/config.toml.");
}

function readLocalSupabase() {
  let status = "";
  try {
    status = execSync("pnpm supabase status -o env", {
      cwd: repoRoot(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read local Supabase credentials. Start the stack with \`pnpm supabase start\`. ${detail}`,
    );
  }

  const values: Record<string, string> = {};
  for (const line of status.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    const key = match?.[1];
    const rawValue = match?.[2];
    if (key && rawValue !== undefined) values[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }

  const apiUrl = values.API_URL;
  const url = apiUrl ? (/^https?:\/\//.test(apiUrl) ? apiUrl : `http://${apiUrl}`) : undefined;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  const dbUrl = values.DB_URL;

  if (!url || !anonKey || !serviceKey || !dbUrl) {
    throw new Error(
      "Local Supabase status did not include API_URL, ANON_KEY, SERVICE_ROLE_KEY, and DB_URL.",
    );
  }

  return { url, anonKey, serviceKey, dbUrl };
}

const local = readLocalSupabase();

// Pass the local credentials to the Playwright worker. The test uses the
// service key only for disposable fixtures and the DB URL only for auth-table
// assertions that PostgREST does not expose.
process.env.SUPABASE_TEST_URL = local.url;
process.env.SUPABASE_TEST_ANON_KEY = local.anonKey;
process.env.SUPABASE_TEST_SERVICE_ROLE_KEY = local.serviceKey;
process.env.SUPABASE_TEST_DB_URL = local.dbUrl;

const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => {
    return typeof entry[1] === "string";
  }),
);

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["account-deletion.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3102",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev --port 3102",
    url: "http://127.0.0.1:3102",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...inheritedEnv,
      NEXT_PUBLIC_SUPABASE_URL: local.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: local.serviceKey,
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3102",
      WAITLIST_ONLY: "false",
      WAITLIST_EMAIL_ENABLED: "false",
      WAITLIST_CONFIRMATION_SECRET: "HausCrawl-e2e-confirmation-secret",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
