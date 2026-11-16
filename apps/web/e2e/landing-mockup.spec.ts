import { expect, test } from "@playwright/test";

const mockupLabel = "Example collection showing two partners' ratings for three homes";

test("renders the example collection and its computed summary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("img", { name: mockupLabel })).toBeVisible();
  await expect(page.getByText("You both like 2 of 3 homes")).toBeVisible();
  await expect(
    page.getByText("Illustrative example. Early access screens may change."),
  ).toBeVisible();
  await expect(page.getByText("Split opinion")).toBeVisible();
});

test("reserves the phone frame height explicitly", async ({ page }) => {
  await page.goto("/");

  const height = await page
    .getByRole("img", { name: mockupLabel })
    .evaluate((element) => getComputedStyle(element).height);

  expect(height).toBe("692px");
});

for (const width of [375, 768, 1280]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test(`keeps the complete frame and caption together at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const frame = page.getByRole("img", { name: mockupLabel });
    const caption = page.getByText("Illustrative example. Early access screens may change.");
    await page.evaluate((label) => {
      const element = document.querySelector(`[role="img"][aria-label="${label}"]`);
      if (!element) return;
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 80), behavior: "instant" });
    }, mockupLabel);

    const frameBox = await frame.boundingBox();
    const captionBox = await caption.boundingBox();

    expect(frameBox).not.toBeNull();
    expect(captionBox).not.toBeNull();
    expect(frameBox!.x).toBeGreaterThanOrEqual(0);
    expect(frameBox!.x + frameBox!.width).toBeLessThanOrEqual(width + 1);
    expect(frameBox!.y).toBeGreaterThanOrEqual(0);
    expect(frameBox!.y + frameBox!.height).toBeLessThanOrEqual(900);
    expect(captionBox!.y).toBeGreaterThanOrEqual(frameBox!.y + frameBox!.height);
    expect(captionBox!.y + captionBox!.height).toBeLessThanOrEqual(900);
  });
}

test("keeps the form submit above the fold at 375x667", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  const submit = page.locator("#join button[type='submit']");
  await expect(submit).toBeVisible();

  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(667);
});

test("does not animate when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const duration = await page
    .getByRole("img", { name: mockupLabel })
    .locator("..")
    .evaluate((element) => getComputedStyle(element).animationDuration);

  expect(Number.parseFloat(duration)).toBeLessThan(0.001);
});
