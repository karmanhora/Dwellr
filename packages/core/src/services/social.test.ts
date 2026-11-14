import { describe, expect, it } from "vitest";

import type { CommentRow } from "../types/social";
import {
  buildCommentTree,
  countComments,
  decodeFeedCursor,
  encodeFeedCursor,
  feedRelevanceLabel,
  notificationLabel,
  reportReasonLabel,
} from "./social";

const targetId = "0d1f4b0a-1111-4000-8000-000000000001";
const authorId = "0d1f4b0a-1111-4000-8000-000000000010";
const commentId = "0d1f4b0a-1111-4000-8000-000000000002";

function row(overrides: Partial<CommentRow>): CommentRow {
  return {
    id: commentId,
    target_type: "property",
    target_id: targetId,
    author_id: authorId,
    parent_id: null,
    body: "A comment",
    created_at: "2026-11-15T10:00:00.000Z",
    updated_at: "2026-11-15T10:00:00.000Z",
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

describe("buildCommentTree", () => {
  it("keeps one-level replies under their parent", () => {
    const replies = row({
      id: "0d1f4b0a-1111-4000-8000-000000000003",
      parent_id: commentId,
      body: "A reply",
      created_at: "2026-11-15T10:01:00.000Z",
    });

    const comments = buildCommentTree([row({}), replies], new Map());

    expect(comments).toHaveLength(1);
    expect(comments[0]?.replies).toHaveLength(1);
    expect(countComments(comments)).toBe(2);
  });

  it("turns a deleted comment into an empty tombstone", () => {
    const comments = buildCommentTree(
      [row({ deleted_at: "2026-11-15T10:02:00.000Z", deleted_by: authorId })],
      new Map(),
    );
    expect(comments[0]?.deleted).toBe(true);
    expect(comments[0]?.body).toBe("");
  });

  it("promotes an orphaned reply rather than dropping it", () => {
    const orphan = row({
      id: "0d1f4b0a-1111-4000-8000-000000000004",
      parent_id: "0d1f4b0a-1111-4000-8000-000000000099",
    });
    expect(buildCommentTree([orphan], new Map())).toHaveLength(1);
  });
});

describe("feed cursor", () => {
  it("round-trips relevance, time and id", () => {
    const cursor = encodeFeedCursor({
      relevance: 3,
      createdAt: "2026-11-15T10:00:00.000Z",
      id: targetId,
    });
    expect(decodeFeedCursor(cursor)).toEqual({
      relevance: 3,
      createdAt: "2026-11-15T10:00:00.000Z",
      id: targetId,
    });
  });

  it("rejects malformed cursors", () => {
    expect(decodeFeedCursor(null)).toBeNull();
    expect(decodeFeedCursor("9|2026-11-15T10:00:00.000Z|" + targetId)).toBeNull();
    expect(decodeFeedCursor("2|not-a-date|" + targetId)).toBeNull();
    expect(decodeFeedCursor("2|2026-11-15T10:00:00.000Z|nope")).toBeNull();
  });
});

describe("labels", () => {
  it("explains feed relevance without a black box", () => {
    expect(feedRelevanceLabel(3)).toContain("follow");
    expect(feedRelevanceLabel(2)).toContain("follow");
    expect(feedRelevanceLabel(1)).toContain("neighborhoods");
  });

  it("collapses repeated likes in the notification label", () => {
    expect(
      notificationLabel({
        type: "like",
        actorName: "Mina",
        actorCount: 4,
        propertyTitle: "Sunlit two-bed",
      }),
    ).toBe("Mina and 3 others liked Sunlit two-bed");
  });

  it("labels report reasons", () => {
    expect(reportReasonLabel("false_information")).toBe("False property information");
  });
});
