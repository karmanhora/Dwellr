import type { PostCategory, PostKind, VideoMimeType, VideoStatus } from "../constants/post";
import type { PropertySummary } from "./property";

export interface PostAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface PostRow {
  id: string;
  author_id: string;
  kind: PostKind;
  caption: string;
  categories: PostCategory[];
  property_id: string | null;
  neighborhood: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface PostPhotoRow {
  id: string;
  post_id: string;
  storage_path: string;
  position: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number;
  created_at: string;
}

export interface VideoRow {
  id: string;
  post_id: string;
  author_id: string;
  storage_path: string;
  poster_path: string;
  duration_seconds: number;
  width: number;
  height: number;
  size_bytes: number;
  mime_type: VideoMimeType;
  captions: string | null;
  status: VideoStatus;
  created_at: string;
}

export interface PostPhoto {
  id: string;
  storagePath: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface Video {
  id: string;
  storagePath: string;
  posterPath: string;
  durationSeconds: number;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: VideoMimeType;
  captions: string | null;
  status: VideoStatus;
}

export interface Post {
  id: string;
  kind: PostKind;
  caption: string;
  categories: PostCategory[];
  propertyId: string | null;
  property: PropertySummary | null;
  neighborhood: string | null;
  city: string | null;
  author: PostAuthor | null;
  photos: PostPhoto[];
  video: Video | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostSummary {
  id: string;
  kind: PostKind;
  caption: string;
  categories: PostCategory[];
  propertyId: string | null;
  propertyTitle: string | null;
  neighborhood: string | null;
  city: string | null;
  author: PostAuthor | null;
  coverPhoto: PostPhoto | null;
  videoPosterPath: string | null;
  photoCount: number;
  durationSeconds: number | null;
  createdAt: string;
}

export interface WatchItem {
  post: Post;
  relevance: number;
  engagementScore: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface WatchCursor {
  relevance: number;
  engagementScore: number;
  createdAt: string;
  id: string;
}

export interface WatchPage {
  items: WatchItem[];
  nextCursor: string | null;
  failed: boolean;
}

export interface PostPage {
  items: PostSummary[];
  nextCursor: string | null;
  failed: boolean;
}

export interface PostCursor {
  createdAt: string;
  id: string;
}

export interface MediaUsage {
  photoBytes: number;
  videoBytes: number;
  photoQuotaBytes: number;
  videoQuotaBytes: number;
}

export interface MediaUsageRow {
  user_id: string;
  photo_bytes: number;
  video_bytes: number;
  updated_at: string;
}
