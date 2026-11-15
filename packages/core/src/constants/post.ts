/**
 * Social post and short-video limits shared by the web client, Server Actions
 * and the database. Keep these values in sync with
 * supabase/migrations/20261116090000_posts_and_videos.sql.
 */

export const POST_KINDS = ["text", "photo", "video"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_CATEGORIES = [
  "walkthrough",
  "renovation",
  "architecture",
  "interiors",
  "neighborhood",
  "before_after",
  "diy",
  "other",
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  walkthrough: "Walkthrough",
  renovation: "Renovation",
  architecture: "Architecture",
  interiors: "Interiors",
  neighborhood: "Neighborhood",
  before_after: "Before & after",
  diy: "DIY",
  other: "Other",
};

export const POST_KIND_LABELS: Record<PostKind, string> = {
  text: "Text post",
  photo: "Photo post",
  video: "Short video",
};

export const POST_CAPTION_MAX_LENGTH = 2200;
export const POST_CATEGORY_MAX = 3;
export const POST_NEIGHBORHOOD_MAX_LENGTH = 80;
export const POST_CITY_MAX_LENGTH = 80;

export const POST_MAX_PHOTOS = 8;
export const POST_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const POST_PHOTO_ALT_MAX_LENGTH = 200;
export const POST_PHOTO_MAX_EDGE = 2000;
export const POST_PHOTO_MAX_DIMENSION = 12000;
export const POST_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const POST_PHOTOS_BUCKET = "post-photos";
export const POST_VIDEOS_BUCKET = "post-videos";

export const VIDEO_MAX_DURATION_SECONDS = 30;
export const VIDEO_MIN_DURATION_SECONDS = 0.1;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const VIDEO_MAX_DIMENSION = 4096;
export const VIDEO_CAPTIONS_MAX_LENGTH = 2000;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export type VideoMimeType = (typeof VIDEO_MIME_TYPES)[number];

export const VIDEO_STATUSES = ["uploaded", "ready", "failed"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

/** Database-enforced abuse limits. */
export const POSTS_PER_HOUR = 10;
export const VIDEOS_PER_DAY = 3;

/** Per-user storage allowances for posts and videos. */
export const POST_PHOTO_QUOTA_BYTES = 200 * 1024 * 1024;
export const POST_VIDEO_QUOTA_BYTES = 500 * 1024 * 1024;

export const WATCH_PAGE_SIZE = 6;

/** Relevance is explainable and SQL-derived, never a hidden model. */
export const WATCH_RELEVANCE = {
  followedAndNeighborhood: 3,
  followed: 2,
  neighborhood: 1,
  newest: 0,
} as const;

export const WATCH_MUTE_STORAGE_KEY = "dwellr:watch:muted";
