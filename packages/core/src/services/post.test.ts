import { describe, expect, it } from "vitest";

import {
  decodeWatchCursor,
  encodeWatchCursor,
  canPublishPost,
  formatBytes,
  formatVideoDuration,
  postExcerpt,
  watchRelevanceLabel,
} from "./post";

const id = "0d1f4b0a-1111-4000-8000-000000000001";

describe("canPublishPost", () => {
  it("allows posts below both limits", () => {
    expect(canPublishPost({ kind: "video", postsLastHour: 2, videosLastDay: 1 })).toEqual({
      ok: true,
    });
  });

  it("explains the hourly post limit", () => {
    const result = canPublishPost({ kind: "photo", postsLastHour: 10, videosLastDay: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("10 posts an hour");
  });

  it("applies the daily video limit only to videos", () => {
    expect(canPublishPost({ kind: "text", postsLastHour: 0, videosLastDay: 3 }).ok).toBe(true);
    const result = canPublishPost({ kind: "video", postsLastHour: 0, videosLastDay: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("3 videos a day");
  });
});

describe("watch cursor", () => {
  it("round-trips the documented ranking tuple", () => {
    const cursor = {
      relevance: 2,
      engagementScore: 17,
      createdAt: "2026-11-15T10:00:00.000Z",
      id,
    };
    expect(decodeWatchCursor(encodeWatchCursor(cursor))).toEqual(cursor);
  });

  it("rejects malformed or out-of-range cursors", () => {
    expect(decodeWatchCursor("")).toBeNull();
    expect(decodeWatchCursor(`4|0|2026-11-15T10:00:00.000Z|${id}`)).toBeNull();
    expect(decodeWatchCursor(`1|-2|2026-11-15T10:00:00.000Z|${id}`)).toBeNull();
    expect(decodeWatchCursor(`1|0|not-a-date|${id}`)).toBeNull();
    expect(decodeWatchCursor(`1|0|2026-11-15T10:00:00.000Z|nope`)).toBeNull();
  });
});

describe("post presentation helpers", () => {
  it("formats durations and byte sizes for the UI", () => {
    expect(formatVideoDuration(29.6)).toBe("0:30");
    expect(formatVideoDuration(65)).toBe("1:05");
    expect(formatBytes(25 * 1024 * 1024)).toBe("25 MB");
  });

  it("truncates long captions on a word boundary", () => {
    expect(postExcerpt("one two three four", 12)).toBe("one two…");
    expect(postExcerpt("short", 20)).toBe("short");
  });

  it("labels every ranking tier", () => {
    expect(watchRelevanceLabel(3)).toContain("follow");
    expect(watchRelevanceLabel(2)).toContain("follow");
    expect(watchRelevanceLabel(1)).toContain("neighborhood");
    expect(watchRelevanceLabel(0)).toContain("Newest");
  });
});
