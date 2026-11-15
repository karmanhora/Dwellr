import { describe, expect, it } from "vitest";

import {
  POST_MAX_PHOTOS,
  POST_PHOTO_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "../constants/post";
import { createPostSchema, updatePostSchema, videoMetadataSchema } from "./post";

const userId = "0d1f4b0a-1111-4000-8000-000000000010";
const propertyId = "0d1f4b0a-1111-4000-8000-000000000020";

function photo(index = 1) {
  return {
    storagePath: `${userId}/0d1f4b0a-1111-4000-8000-00000000010${index}.webp`,
    width: 1200,
    height: 900,
    sizeBytes: 300_000,
  };
}

function video(overrides: Record<string, unknown> = {}) {
  return {
    storagePath: `${userId}/0d1f4b0a-1111-4000-8000-000000000030.mp4`,
    posterPath: `${userId}/0d1f4b0a-1111-4000-8000-000000000031.webp`,
    durationSeconds: 18.4,
    width: 1080,
    height: 1920,
    sizeBytes: 8_000_000,
    mimeType: "video/mp4",
    ...overrides,
  };
}

const base = {
  kind: "text",
  caption: "A quiet corner of the house at 7am.",
  categories: ["interiors"],
  propertyId: "",
  neighborhood: "",
  city: "",
};

describe("createPostSchema", () => {
  it("accepts a text post and normalizes empty optional fields", () => {
    const parsed = createPostSchema.parse(base);
    expect(parsed.propertyId).toBeUndefined();
    expect(parsed.photos).toEqual([]);
    expect(parsed.caption).toBe(base.caption);
  });

  it("requires words for a text post", () => {
    const result = createPostSchema.safeParse({ ...base, caption: "   " });
    expect(result.success).toBe(false);
  });

  it("requires one to eight photos for a photo post", () => {
    expect(
      createPostSchema.safeParse({ ...base, kind: "photo", caption: "", photos: [] }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "photo",
        caption: "",
        photos: [photo()],
      }).success,
    ).toBe(true);

    const tooMany = Array.from({ length: POST_MAX_PHOTOS + 1 }, (_, index) => photo(index + 1));
    expect(
      createPostSchema.safeParse({ ...base, kind: "photo", photos: tooMany }).success,
    ).toBe(false);
  });

  it("rejects a photo over the bucket limit and a path outside the user's prefix", () => {
    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "photo",
        photos: [{ ...photo(), sizeBytes: POST_PHOTO_MAX_BYTES + 1 }],
      }).success,
    ).toBe(false);

    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "photo",
        photos: [{ ...photo(), storagePath: "someone-else/photo.webp" }],
      }).success,
    ).toBe(false);
  });

  it("allows at most three unique categories", () => {
    expect(
      createPostSchema.safeParse({
        ...base,
        categories: ["diy", "diy"],
      }).success,
    ).toBe(false);

    expect(
      createPostSchema.safeParse({
        ...base,
        categories: ["diy", "interiors", "renovation", "architecture"],
      }).success,
    ).toBe(false);
  });

  it("accepts a valid video post and rejects a missing, long or heavy video", () => {
    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "video",
        caption: "",
        propertyId,
        video: video(),
      }).success,
    ).toBe(true);

    expect(
      createPostSchema.safeParse({ ...base, kind: "video", caption: "", video: undefined })
        .success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "video",
        video: video({ durationSeconds: 30.1 }),
      }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "video",
        video: video({ sizeBytes: VIDEO_MAX_BYTES + 1 }),
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported video mime types and crossed media kinds", () => {
    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "video",
        video: video({ mimeType: "video/quicktime" }),
      }).success,
    ).toBe(false);

    expect(
      createPostSchema.safeParse({
        ...base,
        kind: "photo",
        photos: [photo()],
        video: video(),
      }).success,
    ).toBe(false);
  });
});

describe("videoMetadataSchema", () => {
  it("accepts only the supported dimensions and duration", () => {
    expect(videoMetadataSchema.safeParse(video()).success).toBe(true);
    expect(videoMetadataSchema.safeParse(video({ width: 5000 })).success).toBe(false);
    expect(videoMetadataSchema.safeParse(video({ durationSeconds: 0 })).success).toBe(false);
  });
});

describe("updatePostSchema", () => {
  it("keeps media out of edits and allows clearing the property tag", () => {
    const parsed = updatePostSchema.parse({
      ...base,
      caption: "Updated",
      propertyId: "",
    });
    expect(parsed.propertyId).toBeUndefined();
    expect("photos" in parsed).toBe(false);
  });
});
