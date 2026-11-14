import { expect, test } from "@playwright/test";
import path from "node:path";

const password = "DwellrM1test42";
const runId = Date.now();
const email = `dwellr.m1.${runId}@gmail.com`;
const username = `m1check${String(runId).slice(-6)}`;
const title = `Sunlit test home ${runId}`;
const fixture = path.join(__dirname, "fixtures", "sample-home.png");

test("sign up, post a home, find it on explore, edit it, then sign out", async ({ page }) => {
  // 1. Sign up — the dev project has email confirmation disabled.
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("M1 Check");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();

  // 2. Post a home: upload first, then facts. Uploading proves the storage
  // policy allows the owner's prefix and that compression produced a file.
  // Wait for hydration (the account menu only opens with JS) before handing
  // files to a controlled input, otherwise the change event is lost.
  await page.goto("/create");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Post a home" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("#photo-input").setInputFiles(fixture);
  await expect(page.getByText("1 of 1 uploaded")).toBeVisible({ timeout: 45_000 });

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Neighborhood").fill("Test Heights");
  await page.getByLabel("City").fill("Portland");
  await page.getByLabel("State or region").fill("OR");
  await page.getByLabel("Price").fill("525000");
  await page.getByLabel("Bedrooms").fill("3");
  await page.getByLabel("Bathrooms").fill("2");
  await page.getByLabel("Square feet").fill("1400");

  await page.getByRole("button", { name: "Publish home" }).click();

  // 3. Detail page renders the real values, not placeholders.
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("$525,000")).toBeVisible();
  await expect(page.getByText("Test Heights, Portland, OR")).toBeVisible();
  await expect(page.getByText("Community").first()).toBeVisible();

  // 4. The post appears in discovery.
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // 5. Open it from the grid.
  await page.getByRole("link", { name: new RegExp(title) }).first().click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // 6. The owner edits a fact.
  await page.getByRole("link", { name: "Edit post" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByLabel("Price").fill("510000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\?updated=1$/);
  await expect(page.getByText("$510,000")).toBeVisible();

  // 7. Sign out through the account menu.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

  // 8. Signing back in lands on the account page, then clean up the test post.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/me$/);

  await page.goto("/explore");
  await page.getByRole("link", { name: new RegExp(title) }).first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/explore\?deleted=1$/);
  await expect(page.getByText(title)).toHaveCount(0);
});
