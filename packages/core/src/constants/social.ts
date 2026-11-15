/** Shared social, safety and feed limits. Mirrored by database checks. */

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_RATE_LIMIT_PER_MINUTE = 10;
export const COMMENTS_MAX_PAGE = 100;

export const REPORT_DETAILS_MAX_LENGTH = 1000;

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "false_information",
  "inappropriate",
  "personal_information",
  "other",
] as const;

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  false_information: "False property information",
  inappropriate: "Inappropriate content",
  personal_information: "Shows personal or identifying information",
  other: "Something else",
};

export const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

export const SOCIAL_TARGET_TYPES = ["property", "post"] as const;
export type SocialTargetType = (typeof SOCIAL_TARGET_TYPES)[number];

export const REPORT_TARGET_TYPES = ["property", "post", "comment", "profile"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "collection_invite",
  "collection_activity",
  "comment",
  "like",
  "follow",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const FEED_NEIGHBORHOOD_MAX = 10;
export const FEED_STYLE_MAX = 10;
export const FEED_PAGE_SIZE = 12;

/** Ranking is intentionally limited to explicit signals; see ARCHITECTURE.md. */
export const FEED_RELEVANCE = {
  followedAndMatched: 3,
  followed: 2,
  matched: 1,
} as const;
