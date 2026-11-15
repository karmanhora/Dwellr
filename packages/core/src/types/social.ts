import type { PropertySummary } from "./property";

export interface LikeRow {
  user_id: string;
  target_type: "property" | "post";
  target_id: string;
  created_at: string;
}

export interface LikeSummary {
  count: number;
  likedByMe: boolean;
}

export interface CommentRow {
  id: string;
  target_type: "property" | "post";
  target_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CommentAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  parentId: string | null;
  body: string;
  deleted: boolean;
  createdAt: string;
  author: CommentAuthor | null;
  replies: Comment[];
}

export interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowCounts {
  followerCount: number;
  followingCount: number;
}

export interface NotificationRow {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: "collection_invite" | "collection_activity" | "comment" | "like" | "follow";
  target_type: "property" | "post" | null;
  target_id: string | null;
  comment_id: string | null;
  collection_id: string | null;
  actor_count: number;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  type: NotificationRow["type"];
  actorName: string;
  actorCount: number;
  targetType: NotificationRow["target_type"];
  targetId: string | null;
  commentId: string | null;
  collectionId: string | null;
  collectionSlug: string | null;
  propertyTitle: string | null;
  postCaption: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: "property" | "post" | "comment" | "profile";
  target_id: string;
  reason:
    | "spam"
    | "harassment"
    | "false_information"
    | "inappropriate"
    | "personal_information"
    | "other";
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
}

export interface Report {
  id: string;
  targetType: ReportRow["target_type"];
  targetId: string;
  reason: ReportRow["reason"];
  details: string | null;
  status: ReportRow["status"];
  createdAt: string;
}

export interface FeedPreferencesRow {
  user_id: string;
  neighborhoods: string[];
  property_types: string[];
  updated_at: string;
}

export interface FeedPreferences {
  neighborhoods: string[];
  propertyTypes: string[];
}

export interface FeedPropertyRow {
  id: string;
  relevance: number;
  created_at: string;
}

export interface FeedItem {
  property: PropertySummary;
  relevance: number;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
  failed: boolean;
}

export interface FeedCursor {
  relevance: number;
  createdAt: string;
  id: string;
}
