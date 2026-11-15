import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const password = "DwellrM3test42";
const runId = Date.now();
const suffix = String(runId).slice(-7);
const email = `dwellr.m3.${runId}@gmail.com`;
const username = `m3owner${suffix}`;
const homeTitle = `M3 tagged home ${runId}`;
const photoCaption = `Photo post caption ${runId}`;
const videoCaption = `Video walkthrough caption ${runId}`;
const comment = `M3 comment ${runId}`;
const fixture = path.join(__dirname, "fixtures", "sample-home.png");

test.setTimeout(300_000);

async function signUp(page: Page) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("M3 Creator");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/me$/);
}

async function makeWebm(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 568;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    const stream = canvas.captureStream(24);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    let frame = 0;
    const paint = () => {
      frame += 1;
      context.fillStyle = frame % 2 === 0 ? "#d8d1c2" : "#c7d2c4";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#20241f";
      context.font = "20px sans-serif";
      context.fillText("dwellr test", 70, 280);
      if (recorder.state !== "inactive") requestAnimationFrame(paint);
    };

    recorder.start(100);
    paint();
    await new Promise((resolve) => setTimeout(resolve, 1400));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());

    const buffer = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  });

  return Buffer.from(base64, "base64");
}

async function createHome(page: Page) {
  await page.goto("/create/home");
  await page.locator("#photo-input").setInputFiles(fixture);
  await expect(page.getByText("1 of 1 uploaded")).toBeVisible({ timeout: 45_000 });
  await page.getByLabel("Title").fill(homeTitle);
  await page.getByLabel("Neighborhood").fill("M3 Heights");
  await page.getByLabel("City").fill("Portland");
  await page.getByLabel("Price").fill("480000");
  await page.getByRole("button", { name: "Publish home" }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  const [url] = page.url().split("?");
  return url ?? page.url();
}

async function tagHome(page: Page) {
  await page.getByLabel("Search homes to tag").fill(homeTitle);
  await page.getByRole("button", { name: new RegExp(homeTitle) }).click();
  await expect(page.getByText(homeTitle).first()).toBeVisible();
}

test("create photo and video posts, discover them, watch, like, comment and tag a home", async ({
  page,
}) => {
  await signUp(page);
  const homeUrl = await createHome(page);
  const homeId = homeUrl.split("/").pop() ?? "";

  const videoBuffer = await makeWebm(page);

  // Photo post with a topic and a property tag.
  await page.goto("/create/post");
  await page.locator("#post-photo-input").setInputFiles(fixture);
  await expect(page.getByText("1 of 1")).toBeVisible({ timeout: 45_000 });
  await page.getByLabel("Caption").fill(photoCaption);
  await page.getByRole("button", { name: "Renovation" }).click();
  await tagHome(page);
  await page.getByRole("button", { name: "Publish post" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}\?created=1$/);
  const [photoPostPath] = page.url().split("?");
  const photoPostUrl = photoPostPath ?? page.url();
  const photoPostId = photoPostUrl.split("/").pop() ?? "";
  await expect(page.getByText(photoCaption)).toBeVisible();
  await expect(page.getByRole("link", { name: homeTitle })).toBeVisible();

  // Video post using a browser-generated WebM.
  await page.goto("/create/video");
  await page.locator("#video-input").setInputFiles({
    name: `dwellr-${runId}.webm`,
    mimeType: "video/webm",
    buffer: videoBuffer,
  });
  await expect(page.getByText(/1\.[0-9]s/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Upload video" }).click();
  await expect(page.getByText("Video uploaded. Add a caption and publish.")).toBeVisible({
    timeout: 90_000,
  });
  await page.getByLabel("Caption", { exact: true }).fill(videoCaption);
  await page.getByRole("button", { name: "Walkthrough", exact: true }).click();
  await page.getByLabel("Captions or transcript").fill("A test walkthrough with no audio.");
  await tagHome(page);
  await page.getByRole("button", { name: "Publish video" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}\?created=1$/);
  const [videoPostPath] = page.url().split("?");
  const videoPostUrl = videoPostPath ?? page.url();
  const videoPostId = videoPostUrl.split("/").pop() ?? "";
  await expect(page.getByText(videoCaption)).toBeVisible();

  // Both posts are discoverable in the feed.
  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: "Community posts" })).toBeVisible();
  await expect(page.getByText(photoCaption).first()).toBeVisible();
  await expect(page.getByText(videoCaption).first()).toBeVisible();

  // The video appears in the vertical watch feed with its property tag.
  await page.goto("/watch");
  await expect(page.getByRole("heading", { name: "Homes in motion." })).toBeVisible();
  const watchVideo = page.locator("video").first();
  await expect(watchVideo).toBeVisible();
  await expect(watchVideo).toHaveAttribute("src", /post-videos/);
  await page.getByRole("button", { name: "Sound off" }).last().click();
  await expect(page.getByRole("button", { name: "Sound on" }).last()).toBeVisible();
  await page.getByRole("button", { name: "Tap to play or pause" }).last().click();
  await page.getByRole("button", { name: "Like video" }).last().click();
  await expect(page.getByRole("button", { name: "Unlike video" }).last()).toBeVisible();

  // Comment from the watch overlay, which lands on the post.
  await page.getByRole("link", { name: "Comment", exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`/posts/${videoPostId}#comments`));
  await page.getByLabel("Add a comment").fill(comment);
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText(comment)).toBeVisible();

  // The tagged home page lists the community posts, clearly separated from facts.
  await page.goto(homeUrl);
  await expect(page.getByRole("heading", { name: "Community posts" })).toBeVisible();
  await expect(page.getByText(photoCaption)).toBeVisible();

  // Author edit and delete.
  await page.goto(photoPostUrl);
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Caption", { exact: true }).fill(`${photoCaption} edited`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(`${photoCaption} edited`)).toBeVisible();

  for (const id of [photoPostId, videoPostId]) {
    await page.goto(`/posts/${id}`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete post" }).click();
    await expect(page).toHaveURL(new RegExp(`/u/${username}\\?postDeleted=1`));
  }

  await page.goto(`/p/${homeId}`);
  await page
    .getByRole("complementary", { name: "Home details" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/explore\?deleted=1$/);
});

test("community and watch surfaces fit phone, tablet and desktop widths", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);

    await page.goto("/posts");
    await expect(page.getByRole("heading", { name: "Notes from real homes." })).toBeVisible();
    const postsOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(postsOverflow, `posts overflow at ${viewport.width}`).toBeLessThanOrEqual(1);

    await page.goto("/watch");
    await expect(page.getByRole("heading", { name: "Homes in motion." })).toBeVisible();
    const watchOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(watchOverflow, `watch overflow at ${viewport.width}`).toBeLessThanOrEqual(1);
  }
});
