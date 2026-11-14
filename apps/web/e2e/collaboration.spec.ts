import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const password = "DwellrM2test42";
const runId = Date.now();
const suffix = String(runId).slice(-7);
const ownerEmail = `dwellr.m2.owner.${runId}@gmail.com`;
const ownerUsername = `m2owner${suffix}`;
const editorEmail = `dwellr.m2.editor.${runId}@gmail.com`;
const editorUsername = `m2editor${suffix}`;
const firstTitle = `Cedar test home ${runId}`;
const secondTitle = `Alder test home ${runId}`;
const collectionName = `M2 shortlist ${runId}`;
const note = `Editor note ${runId}`;
const comment = `Editor question ${runId}`;
const fixture = path.join(__dirname, "fixtures", "sample-home.png");

test.setTimeout(240_000);

async function signUp(page: Page, email: string, username: string, displayName: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
}

async function postHome(page: Page, title: string, price: string) {
  await page.goto("/create");
  // Wait for hydration before handing the file to the controlled input.
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Post a home" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("#photo-input").setInputFiles(fixture);
  await expect(page.getByText("1 of 1 uploaded")).toBeVisible({ timeout: 45_000 });

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Neighborhood").fill("Test Heights");
  await page.getByLabel("City").fill("Portland");
  await page.getByLabel("State or region").fill("OR");
  await page.getByLabel("Price").fill(price);
  await page.getByLabel("Bedrooms").fill("3");
  await page.getByLabel("Bathrooms").fill("2");
  await page.getByLabel("Square feet").fill("1400");
  await page.getByRole("button", { name: "Publish home" }).click();

  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  const [url] = page.url().split("?");
  return url || page.url();
}

async function rate(
  page: Page,
  title: string,
  value: string,
  noteText: string,
  submitLabel: "Add evaluation" | "Save evaluation",
) {
  const section = page.getByRole("region", { name: `Evaluations for ${title}` });
  await section.getByLabel("Rating").selectOption(value);
  await section.getByLabel("Note").fill(noteText);
  await section.getByRole("button", { name: submitLabel }).click();
  await expect(page).toHaveURL(/\?evaluated=1$/);
}

test("two members invite, rate, compare, follow and comment", async ({ browser, page }) => {
  await signUp(page, ownerEmail, ownerUsername, "M2 Owner");

  const firstUrl = await postHome(page, firstTitle, "525000");
  const firstId = firstUrl.split("/").pop() ?? "";
  const secondUrl = await postHome(page, secondTitle, "610000");
  const secondId = secondUrl.split("/").pop() ?? "";

  // Private collection with the first home.
  await page.goto(firstUrl);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to collection" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Name").fill(collectionName);
  await createDialog.getByRole("button", { name: "Create and add" }).click();
  await expect(page).toHaveURL(/\/c\/[a-z0-9]{12}\?added=1$/);
  const [collectionPath] = page.url().split("?");
  const collectionUrl = collectionPath || page.url();

  // Add the second home from its own page.
  await page.goto(secondUrl);
  await page.getByRole("button", { name: "Add to collection" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page).toHaveURL(/\/c\/[a-z0-9]{12}\?added=1$/);
  await expect(page.getByRole("heading", { name: firstTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: secondTitle })).toBeVisible();

  // Invite the second account as an editor.
  await page.getByLabel("Username").fill(editorUsername);
  await page.locator("#invite-role").selectOption("editor");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Invite sent. It appears in their notifications.")).toBeVisible();

  const editorContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const editorPage = await editorContext.newPage();
  await signUp(editorPage, editorEmail, editorUsername, "M2 Editor");

  // Accept the named invite from notifications.
  await editorPage.goto("/notifications");
  await expect(editorPage.getByRole("heading", { name: "Invitations" })).toBeVisible();
  await expect(editorPage.getByText(collectionName)).toBeVisible();
  await editorPage.getByRole("button", { name: "Accept" }).click();
  await expect(editorPage).toHaveURL(/\/c\/[a-z0-9]{12}\?joined=1$/);
  await expect(editorPage.getByRole("heading", { name: collectionName })).toBeVisible();
  await expect(editorPage.getByText("You are editor.")).toBeVisible();

  // Editor rates both homes.
  await rate(editorPage, firstTitle, "5", `${note} first`, "Add evaluation");
  await rate(editorPage, secondTitle, "2", `${note} second`, "Add evaluation");

  // Owner rates: first is unanimous, second has a two-point split.
  await page.goto(collectionUrl);
  await rate(page, firstTitle, "5", "Owner also likes this one.", "Add evaluation");
  await rate(page, secondTitle, "4", "Owner is warmer on this one.", "Add evaluation");

  await page.getByRole("link", { name: "Compare all 2 homes" }).click();
  await expect(page.getByRole("heading", { name: "Compare 2 homes" })).toBeVisible();
  await expect(page.getByText("Everyone likes")).toBeVisible();
  await expect(page.getByText("Split opinion")).toBeVisible();
  await expect(page.getByText(firstTitle)).toBeVisible();
  await expect(page.getByText(secondTitle)).toBeVisible();

  // Editor follows the owner and comments on the first home.
  await editorPage.goto(`/u/${ownerUsername}`);
  await editorPage.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(editorPage.getByRole("button", { name: "Following", exact: true })).toBeVisible();

  await editorPage.goto(firstUrl);
  await editorPage.getByLabel("Add a comment").fill(comment);
  await editorPage.getByRole("button", { name: "Post comment" }).click();
  await expect(editorPage.getByText(comment)).toBeVisible();

  // Owner sees the follow and comment notifications.
  await page.goto("/notifications");
  await expect(page.getByText(/started following you/)).toBeVisible();
  await expect(page.getByText(/commented on/)).toBeVisible();

  await page.goto(firstUrl);
  await expect(page.getByText(comment)).toBeVisible();

  // Reporting is private and confirms without leaving the page.
  await editorPage.goto(secondUrl);
  await editorPage.getByRole("button", { name: "Report this home" }).click();
  const reportDialog = editorPage.getByRole("dialog");
  await reportDialog.getByLabel("Reason").selectOption("spam");
  await reportDialog.getByRole("button", { name: "Send report" }).click();
  await expect(reportDialog.getByRole("status")).toContainText("report");

  // Clean up the collection and both test homes.
  await page.goto(collectionUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete collection" }).click();
  await expect(page).toHaveURL(/\/saved\?deleted=1$/);

  for (const id of [firstId, secondId]) {
    await page.goto(`/p/${id}`);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/explore\?deleted=1$/);
  }

  await editorContext.close();
});
