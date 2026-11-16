/**
 * Runs the access suite against the local Supabase stack.
 *
 * `supabase status -o env` prints the local API URL and keys. The service-role
 * key is passed only to the access-suite process for disposable fixtures and
 * is never written to disk. Set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY and
 * optionally SUPABASE_TEST_SERVICE_ROLE_KEY to point at another disposable
 * project.
 */

import { execSync, spawnSync } from "node:child_process";

let url = process.env.SUPABASE_TEST_URL;
let anonKey = process.env.SUPABASE_TEST_ANON_KEY;
let serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  let status = "";
  try {
    status = execSync("pnpm supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    console.error(
      "Could not read local Supabase credentials. Is the stack running? Start it with `pnpm supabase start`.",
    );
    if (error.stderr) console.error(String(error.stderr).trim());
    process.exit(1);
  }

  const values = {};
  for (const line of status.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }

  url = values.API_URL;
  anonKey = values.ANON_KEY;
  serviceKey = serviceKey || values.SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    console.error("`supabase status -o env` did not include API_URL and ANON_KEY.");
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, ["tests/security/access.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    SUPABASE_TEST_URL: url,
    SUPABASE_TEST_ANON_KEY: anonKey,
    ...(serviceKey ? { SUPABASE_TEST_SERVICE_ROLE_KEY: serviceKey } : {}),
  },
});

process.exit(result.status ?? 1);
