import { expect, test } from "@playwright/test";

// Keep local runs below the per-IP database limit; production still sees the
// real forwarded address.
const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

test.use({
  extraHTTPHeaders: { "x-forwarded-for": testIp },
});

test("submits the waitlist form and shows a usable share link", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /find a home together/i }),
  ).toBeVisible();
  await expect(page.getByText("Illustrative example").first()).toBeVisible();

  const hero = page.locator("#join");
  await hero.getByLabel("Email address").fill(`waitlist.e2e.${Date.now()}@gmail.com`);

  await hero.getByText("Add a little more").click();
  await hero.getByLabel("What best describes you?").selectOption("actively_looking");
  await hero.getByLabel("Who are you searching with?").selectOption("partner");
  await hero.getByLabel("City or region").fill("Seattle");

  await hero.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(page.getByText("You're on the list.")).toBeVisible();
  await expect(page.getByLabel("Your share link")).toHaveValue(
    /\?ref=[a-z0-9]{10}$/,
  );

  const shareUrl = await page.getByLabel("Your share link").inputValue();
  expect(shareUrl).toContain("http://127.0.0.1:3101/?ref=");
});

test("silently accepts a honeypot-filled submission", async ({ page }) => {
  await page.goto("/");

  const hero = page.locator("#join");
  await hero.getByLabel("Email address").fill(`waitlist.honeypot.${Date.now()}@gmail.com`);
  await page.locator("#hero-website").evaluate((element) => {
    (element as HTMLInputElement).value = "https://spam.example";
  });

  await hero.getByRole("button", { name: "Join the waitlist" }).click();

  // The bot gets the normal success shape; the route writes nothing.
  await expect(page.getByText("You're on the list.")).toBeVisible();
});

test("waitlist-only mode redirects app routes to the landing page", async ({ page }) => {
  await page.goto("/explore?sort=newest");
  await expect(page).toHaveURL("http://127.0.0.1:3101/");

  await page.goto("/sign-in");
  await expect(page).toHaveURL("http://127.0.0.1:3101/");

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible();
});
