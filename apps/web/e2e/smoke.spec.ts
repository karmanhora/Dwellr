import { expect, test } from "@playwright/test";
import path from "node:path";

const password = "DwellrM1test42";
const runId = Date.now();
const email = `dwellr.m1.${runId}@gmail.com`;
const username = `m1check${String(runId).slice(-6)}`;
const title = `Sunlit test home ${runId}`;
const collectionName = `Weekend tours ${runId}`;
const fixture = path.join(__dirname, "fixtures", "sample-home.png");

test.setTimeout(150_000);

test("sign up, post, save into a public collection, share it, then clean up", async ({ page }) => {
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
  await page.goto("/create/home");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Create", exact: true })).toBeVisible();
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

  // 6b. The observed price drop produces a badge, and the poster can reconfirm.
  await expect(page.getByText("Price reduced $15,000")).toBeVisible();
  await page.getByRole("button", { name: "Confirm listing is accurate" }).click();
  await expect(page).toHaveURL(/\?confirmed=1$/);
  await expect(page.getByText("Listing freshness updated")).toBeVisible();

  await page.goto("/explore");
  await expect(page.getByText("Price cut").first()).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();
  await page.getByRole("link", { name: new RegExp(title) }).first().click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // 7. Save the home privately, then add it to a new public collection.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add to collection" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(collectionName);
  await dialog.getByLabel("Make this collection public").check();
  await dialog.getByRole("button", { name: "Create and add" }).click();
  await expect(page).toHaveURL(/\/c\/[a-z0-9]{12}\?added=1$/);
  await expect(page.getByRole("heading", { name: collectionName })).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const collectionUrl = page.url();

  // 8. Sign out and confirm a signed-out visitor can read the published collection.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

  await page.goto(collectionUrl);
  await expect(page.getByRole("heading", { name: collectionName })).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Public", { exact: true })).toBeVisible();

  // 9. Signing back in lands on the account page; the save and collection are listed.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/me$/);

  await page.goto("/saved");
  await page.getByRole("tab", { name: /Collections/ }).click();
  await expect(page.getByRole("link", { name: new RegExp(collectionName) })).toBeVisible();

  // 10. Clean up the test post, then the now-empty collection.
  await page.goto("/explore");
  await page.getByRole("link", { name: new RegExp(title) }).first().click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/explore\?deleted=1$/);
  await expect(page.getByText(title)).toHaveCount(0);

  await page.goto("/saved");
  await page.getByRole("tab", { name: /Collections/ }).click();
  await page.getByRole("link", { name: new RegExp(collectionName) }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete collection" }).click();
  await expect(page).toHaveURL(/\/saved\?deleted=1$/);
  await expect(page.getByText("Collection deleted")).toBeVisible();
});
