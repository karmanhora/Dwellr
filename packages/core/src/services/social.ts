import { REPORT_REASON_LABELS, type NotificationType } from "../constants/social";
import type {
  Comment,
  CommentAuthor,
  CommentRow,
  FeedCursor,
  Notification,
  ReportRow,
} from "../types/social";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds one-level threads from a flat, chronological comment list. */
export function buildCommentTree(
  rows: readonly CommentRow[],
  authors: ReadonlyMap<string, CommentAuthor>,
): Comment[] {
  const nodes = new Map<string, Comment>();

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      parentId: row.parent_id,
      body: row.deleted_at ? "" : row.body,
      deleted: Boolean(row.deleted_at),
      createdAt: row.created_at,
      author: authors.get(row.author_id) ?? null,
      replies: [],
    });
  }

  const roots: Comment[] = [];
  for (const node of nodes.values()) {
    if (node.parentId) {
      const parent = nodes.get(node.parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }

  const byDate = (a: Comment, b: Comment) => a.createdAt.localeCompare(b.createdAt);
  roots.sort(byDate);
  for (const root of roots) root.replies.sort(byDate);
  return roots;
}

export function countComments(comments: readonly Comment[]): number {
  return comments.reduce((count, comment) => count + 1 + comment.replies.length, 0);
}

export function reportReasonLabel(reason: ReportRow["reason"]): string {
  return REPORT_REASON_LABELS[reason];
}

export function notificationLabel(
  notification: Pick<Notification, "type" | "actorName" | "actorCount" | "propertyTitle"> & {
    postCaption?: string | null;
    targetType?: Notification["targetType"];
  },
): string {
  const others = notification.actorCount - 1;
  const actor =
    others > 0
      ? `${notification.actorName} and ${others} ${others === 1 ? "other" : "others"}`
      : notification.actorName;

  const subject = notification.propertyTitle
    ? ` ${notification.propertyTitle}`
    : notification.targetType === "post"
      ? " your post"
      : " your home";

  switch (notification.type) {
    case "like":
      return `${actor} liked${subject}`;
    case "comment":
      return `${actor} commented on${subject}`;
    case "follow":
      return `${notification.actorName} started following you`;
    case "collection_invite":
      return `${notification.actorName} invited you to a collection`;
    case "collection_activity":
      return `${notification.actorName} updated a shared collection`;
  }
}

export function notificationHref(
  notification: Pick<
    Notification,
    "type" | "targetType" | "targetId" | "commentId" | "collectionSlug"
  >,
): string {
  if (notification.collectionSlug) return `/c/${notification.collectionSlug}`;
  if (notification.type === "follow" || notification.type === "collection_invite") {
    return "/notifications";
  }
  if (notification.targetType === "property" && notification.targetId) {
    return `/p/${notification.targetId}${notification.commentId ? `#comment-${notification.commentId}` : ""}`;
  }
  if (notification.targetType === "post" && notification.targetId) {
    return `/posts/${notification.targetId}${notification.commentId ? `#comment-${notification.commentId}` : ""}`;
  }
  return "/notifications";
}

/** Opaque, URL-safe cursor for the relevance + recency feed. */
export function encodeFeedCursor(item: { relevance: number; createdAt: string; id: string }): string {
  return `${item.relevance}|${item.createdAt}|${item.id}`;
}

export function decodeFeedCursor(value: string | null | undefined): FeedCursor | null {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 3) return null;

  const relevanceRaw = parts[0] ?? "";
  const createdAt = parts[1] ?? "";
  const id = parts[2] ?? "";
  const relevance = Number(relevanceRaw);

  if (!Number.isInteger(relevance) || relevance < 0 || relevance > 3) return null;
  if (!id || !UUID_PATTERN.test(id)) return null;
  if (Number.isNaN(new Date(createdAt).getTime())) return null;

  return { relevance, createdAt, id };
}

export function feedRelevanceLabel(relevance: number): string {
  if (relevance >= 3) return "From someone you follow · matches your preferences";
  if (relevance === 2) return "From someone you follow";
  return "Matches your neighborhoods or styles";
}

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "collection_invite":
      return "Invite";
    case "collection_activity":
      return "Collection";
    case "comment":
      return "Comment";
    case "like":
      return "Like";
    case "follow":
      return "Follow";
  }
}
