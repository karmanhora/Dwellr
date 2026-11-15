import {
  POST_CATEGORY_LABELS,
  POST_KIND_LABELS,
  POSTS_PER_HOUR,
  VIDEOS_PER_DAY,
  type PostCategory,
  type PostKind,
} from "../constants/post";
import type { PostAuthor, PostRow, PostSummary, WatchCursor } from "../types/post";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function authorName(
  author: { username: string; display_name: string | null } | null | undefined,
): string {
  return author?.display_name ?? author?.username ?? "Former member";
}

export function postKindLabel(kind: PostKind): string {
  return POST_KIND_LABELS[kind];
}

export function postCategoryLabel(category: PostCategory): string {
  return POST_CATEGORY_LABELS[category];
}

export function postCategoriesLabel(categories: readonly PostCategory[]): string {
  return categories.map(postCategoryLabel).join(" · ");
}

export function postExcerpt(caption: string, max = 160): string {
  const normalized = caption.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;

  let cut = normalized.slice(0, Math.max(0, max - 1)).trimEnd();
  if (!normalized.startsWith(`${cut} `) && cut.includes(" ")) {
    cut = cut.slice(0, cut.lastIndexOf(" ")).trimEnd();
  }
  return `${cut}…`;
}

export function formatVideoDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

/**
 * Mirrors the database rate limits so the UI can explain a refusal before a
 * failed upload. The database remains authoritative.
 */
export function canPublishPost({
  kind,
  postsLastHour,
  videosLastDay,
}: {
  kind: PostKind;
  postsLastHour: number;
  videosLastDay: number;
}): { ok: true } | { ok: false; message: string } {
  if (postsLastHour >= POSTS_PER_HOUR) {
    return {
      ok: false,
      message: `You can publish ${POSTS_PER_HOUR} posts an hour. Try again in a little while.`,
    };
  }
  if (kind === "video" && videosLastDay >= VIDEOS_PER_DAY) {
    return {
      ok: false,
      message: `You can publish ${VIDEOS_PER_DAY} videos a day. Try again tomorrow.`,
    };
  }
  return { ok: true };
}

/** Opaque cursor for relevance + engagement + recency ordering. */
export function encodeWatchCursor(item: WatchCursor): string {
  return `${item.relevance}|${item.engagementScore}|${item.createdAt}|${item.id}`;
}

export function decodeWatchCursor(value: string | null | undefined): WatchCursor | null {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 4) return null;

  const [relevanceRaw, engagementRaw, createdAt, id] = parts;
  const relevance = Number(relevanceRaw);
  const engagementScore = Number(engagementRaw);

  if (!Number.isInteger(relevance) || relevance < 0 || relevance > 3) return null;
  if (!Number.isInteger(engagementScore) || engagementScore < 0) return null;
  if (!createdAt || Number.isNaN(new Date(createdAt).getTime())) return null;
  if (!id || !UUID_PATTERN.test(id)) return null;

  return { relevance, engagementScore, createdAt, id };
}

export function watchRelevanceLabel(relevance: number): string {
  if (relevance >= 3) return "Someone you follow · in a neighborhood you chose";
  if (relevance === 2) return "From someone you follow";
  if (relevance === 1) return "In a neighborhood you chose";
  return "Newest on dwellr";
}

export function toPostSummary(
  row: PostRow,
  author: PostAuthor | null,
  media: {
    coverPhoto: PostSummary["coverPhoto"];
    videoPosterPath: string | null;
    photoCount: number;
    durationSeconds: number | null;
    propertyTitle?: string | null;
  },
): PostSummary {
  return {
    id: row.id,
    kind: row.kind,
    caption: row.caption,
    categories: row.categories,
    propertyId: row.property_id,
    propertyTitle: media.propertyTitle ?? null,
    neighborhood: row.neighborhood,
    city: row.city,
    author,
    coverPhoto: media.coverPhoto,
    videoPosterPath: media.videoPosterPath,
    photoCount: media.photoCount,
    durationSeconds: media.durationSeconds,
    createdAt: row.created_at,
  };
}

export function videoPosterAlt(caption: string): string {
  return caption.trim() ? postExcerpt(caption, 120) : "Video preview";
}
