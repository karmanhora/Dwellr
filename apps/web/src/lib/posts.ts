import {
  decodeWatchCursor,
  encodeWatchCursor,
  toPostSummary,
  type MediaUsage,
  type Post,
  type PostAuthor,
  type PostCategory,
  type PostPage,
  type PostPhoto,
  type PostRow,
  type PostSummary,
  type Video,
  type WatchPage,
} from "@dwellr/core";

import { getPropertiesByIds } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

type PhotoQueryRow = {
  id: string;
  storage_path: string;
  position: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
};

type VideoQueryRow = {
  id: string;
  storage_path: string;
  poster_path: string;
  duration_seconds: number;
  width: number;
  height: number;
  size_bytes: number;
  mime_type: Video["mimeType"];
  captions: string | null;
  status: Video["status"];
};

type PostQueryRow = PostRow & {
  profiles: PostAuthor | null;
  post_photos?: PhotoQueryRow[] | null;
  videos?: VideoQueryRow | VideoQueryRow[] | null;
  properties?: { title: string } | { title: string }[] | null;
};

const POST_SELECT =
  "id, author_id, kind, caption, categories, property_id, neighborhood, city, created_at, updated_at, deleted_at, deleted_by, profiles!posts_author_id_fkey(id, username, display_name, avatar_url), post_photos(id, storage_path, position, alt_text, width, height), videos(id, storage_path, poster_path, duration_seconds, width, height, size_bytes, mime_type, captions, status)";

function normalizeVideo(row: PostQueryRow["videos"]): Video | null {
  if (!row) return null;
  const value = Array.isArray(row) ? (row[0] ?? null) : row;
  if (!value) return null;
  return {
    id: value.id,
    storagePath: value.storage_path,
    posterPath: value.poster_path,
    durationSeconds: Number(value.duration_seconds),
    width: value.width,
    height: value.height,
    sizeBytes: Number(value.size_bytes),
    mimeType: value.mime_type,
    captions: value.captions,
    status: value.status,
  };
}

function normalizePhotos(rows: PhotoQueryRow[] | null | undefined): PostPhoto[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((photo) => ({
      id: photo.id,
      storagePath: photo.storage_path,
      altText: photo.alt_text,
      width: photo.width,
      height: photo.height,
    }));
}

function propertyTitle(row: PostQueryRow["properties"]): string | null {
  if (!row) return null;
  return (Array.isArray(row) ? row[0]?.title : row.title) ?? null;
}

function toPost(row: PostQueryRow, property: Post["property"]): Post {
  return {
    id: row.id,
    kind: row.kind,
    caption: row.caption,
    categories: row.categories,
    propertyId: row.property_id,
    property,
    neighborhood: row.neighborhood,
    city: row.city,
    author: row.profiles,
    photos: normalizePhotos(row.post_photos),
    video: normalizeVideo(row.videos),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummary(row: PostQueryRow): PostSummary {
  const photos = normalizePhotos(row.post_photos);
  const video = normalizeVideo(row.videos);
  return toPostSummary(row, row.profiles, {
    coverPhoto: photos[0] ?? null,
    videoPosterPath: video?.posterPath ?? null,
    photoCount: photos.length,
    durationSeconds: video?.durationSeconds ?? null,
    propertyTitle: propertyTitle(row.properties),
  });
}

async function attachProperties(rows: PostQueryRow[]): Promise<Map<string, Post>> {
  const propertyIds = Array.from(
    new Set(rows.flatMap((row) => (row.property_id ? [row.property_id] : []))),
  );
  const properties = await getPropertiesByIds(propertyIds);
  return new Map(
    rows.map((row) => [
      row.id,
      toPost(row, row.property_id ? (properties.get(row.property_id) ?? null) : null),
    ]),
  );
}

export async function getPostById(postId: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[posts] post query failed:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as PostQueryRow;
  const posts = await attachProperties([row]);
  return posts.get(row.id) ?? null;
}

export async function getPostsByIds(postIds: readonly string[]): Promise<Map<string, Post>> {
  if (postIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("id", [...postIds])
    .is("deleted_at", null);

  if (error) {
    console.error("[posts] batch post query failed:", error.message);
    return new Map();
  }

  const rows = (data ?? []) as unknown as PostQueryRow[];
  const mapped = await attachProperties(rows);
  return new Map(postIds.flatMap((id) => (mapped.has(id) ? [[id, mapped.get(id)!] as const] : [])));
}

export async function getPostSummaries({
  authorId,
  propertyId,
  neighborhood,
  category,
  cursor,
  limit = 12,
}: {
  authorId?: string;
  propertyId?: string;
  neighborhood?: string;
  category?: PostCategory;
  cursor?: string | null;
  limit?: number;
} = {}): Promise<PostPage> {
  const supabase = await createClient();
  let request = supabase
    .from("posts")
    .select(`${POST_SELECT}, properties!posts_property_id_fkey(title)`)
    .is("deleted_at", null);

  if (authorId) request = request.eq("author_id", authorId);
  if (propertyId) request = request.eq("property_id", propertyId);
  if (neighborhood) request = request.eq("neighborhood", neighborhood);
  if (category) request = request.contains("categories", [category]);

  if (cursor) {
    const separator = cursor.lastIndexOf("|");
    const createdAt = cursor.slice(0, separator);
    const id = cursor.slice(separator + 1);
    if (separator > 0 && createdAt && id) {
      request = request.or(
        `created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt.${id})`,
      );
    }
  }

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (error) {
    console.error("[posts] summary query failed:", error.message);
    return { items: [], nextCursor: null, failed: true };
  }

  const rows = (data ?? []) as unknown as PostQueryRow[];
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];

  return {
    items: page.map(toSummary),
    nextCursor:
      rows.length > limit && last ? `${last.created_at}|${last.id}` : null,
    failed: false,
  };
}

type WatchCandidate = {
  postId: string;
  relevance: number;
  engagementScore: number;
  createdAt: string;
};

async function hydrateWatchPage(
  rows: WatchCandidate[],
  viewerId: string | null,
  limit: number,
): Promise<WatchPage> {
  const page = rows.slice(0, limit);
  const postIds = page.map((row) => row.postId);
  const [posts, likes, commentCounts] = await Promise.all([
    getPostsByIds(postIds),
    getPostLikeSummaries(postIds, viewerId),
    getPostCommentCounts(postIds),
  ]);
  const last = page[page.length - 1];

  return {
    items: page.flatMap((row) => {
      const post = posts.get(row.postId);
      if (!post) return [];
      const like = likes.get(row.postId) ?? { count: 0, likedByMe: false };
      return [
        {
          post,
          relevance: row.relevance,
          engagementScore: row.engagementScore,
          likeCount: like.count,
          commentCount: commentCounts.get(row.postId) ?? 0,
          likedByMe: like.likedByMe,
        },
      ];
    }),
    nextCursor:
      rows.length > limit && last
        ? encodeWatchCursor({
            relevance: last.relevance,
            engagementScore: last.engagementScore,
            createdAt: last.createdAt,
            id: last.postId,
          })
        : null,
    failed: false,
  };
}

export async function getWatchPage({
  cursor,
  limit = 6,
}: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<WatchPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const decoded = decodeWatchCursor(cursor);

  // The ranking view joins follow/preference tables that anon has no table
  // privilege on. Signed-out viewers get a public, recency-only feed rather
  // than widening those table grants.
  if (!user) {
    let recent = supabase
      .from("posts")
      .select("id, created_at")
      .is("deleted_at", null)
      .eq("kind", "video");

    if (decoded) {
      recent = recent.or(
        `created_at.lt."${decoded.createdAt}",and(created_at.eq."${decoded.createdAt}",id.lt.${decoded.id})`,
      );
    }

    const { data, error } = await recent
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error("[posts] public watch query failed:", error.message);
      return { items: [], nextCursor: null, failed: true };
    }

    return hydrateWatchPage(
      (data ?? []).map((row) => ({
        postId: row.id,
        relevance: 0,
        engagementScore: 0,
        createdAt: row.created_at,
      })),
      null,
      limit,
    );
  }

  let request = supabase
    .from("watch_posts")
    .select("post_id, relevance, engagement_score, created_at");

  if (decoded) {
    request = request.or(
      `relevance.lt.${decoded.relevance},and(relevance.eq.${decoded.relevance},engagement_score.lt.${decoded.engagementScore}),and(relevance.eq.${decoded.relevance},engagement_score.eq.${decoded.engagementScore},created_at.lt."${decoded.createdAt}"),and(relevance.eq.${decoded.relevance},engagement_score.eq.${decoded.engagementScore},created_at.eq."${decoded.createdAt}",post_id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await request
    .order("relevance", { ascending: false })
    .order("engagement_score", { ascending: false })
    .order("created_at", { ascending: false })
    .order("post_id", { ascending: false })
    .limit(limit + 1);

  if (error) {
    console.error("[posts] watch query failed:", error.message);
    return { items: [], nextCursor: null, failed: true };
  }

  const rows = (data ?? []) as {
    post_id: string;
    relevance: number;
    engagement_score: number;
    created_at: string;
  }[];

  return hydrateWatchPage(
    rows.map((row) => ({
      postId: row.post_id,
      relevance: row.relevance,
      engagementScore: row.engagement_score,
      createdAt: row.created_at,
    })),
    user.id,
    limit,
  );
}

export async function getPostLikeSummaries(
  targetIds: readonly string[],
  userId: string | null,
): Promise<Map<string, { count: number; likedByMe: boolean }>> {
  if (targetIds.length === 0) return new Map();
  const supabase = await createClient();
  const [counts, mine] = await Promise.all([
    supabase
      .from("content_like_counts")
      .select("target_id, like_count")
      .eq("target_type", "post")
      .in("target_id", [...targetIds]),
    userId
      ? supabase
          .from("content_likes")
          .select("target_id")
          .eq("user_id", userId)
          .eq("target_type", "post")
          .in("target_id", [...targetIds])
      : Promise.resolve({ data: [], error: null }),
  ]);

  const liked = new Set(
    ((mine.data ?? []) as { target_id: string }[]).map((row) => row.target_id),
  );
  return new Map(
    targetIds.map((id) => [
      id,
      {
        count:
          ((counts.data ?? []) as { target_id: string; like_count: number }[]).find(
            (row) => row.target_id === id,
          )?.like_count ?? 0,
        likedByMe: liked.has(id),
      },
    ]),
  );
}

export async function getPostCommentCounts(
  postIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("target_id")
    .eq("target_type", "post")
    .is("deleted_at", null)
    .in("target_id", [...postIds]);

  if (error) {
    console.error("[posts] comment count failed:", error.message);
    return counts;
  }
  for (const row of (data ?? []) as { target_id: string }[]) {
    counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1);
  }
  return counts;
}

export async function getMediaUsage(userId: string): Promise<MediaUsage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_media_usage")
    .select("photo_bytes, video_bytes")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    photoBytes: Number(data?.photo_bytes ?? 0),
    videoBytes: Number(data?.video_bytes ?? 0),
    photoQuotaBytes: 200 * 1024 * 1024,
    videoQuotaBytes: 500 * 1024 * 1024,
  };
}

export async function getPostingActivity(userId: string): Promise<{
  postsLastHour: number;
  videosLastDay: number;
}> {
  const supabase = await createClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [posts, videos] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .gt("created_at", hourAgo),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .eq("kind", "video")
      .gt("created_at", dayAgo),
  ]);

  return { postsLastHour: posts.count ?? 0, videosLastDay: videos.count ?? 0 };
}

export async function getPropertyOptions(query?: string | null): Promise<
  { id: string; title: string; neighborhood: string; city: string }[]
> {
  const supabase = await createClient();
  let request = supabase
    .from("properties")
    .select("id, title, neighborhood, city")
    .order("created_at", { ascending: false })
    .limit(8);

  if (query?.trim()) {
    const safe = query.trim().replace(/[%_]/g, "");
    request = request.or(
      `title.ilike.%${safe}%,neighborhood.ilike.%${safe}%,city.ilike.%${safe}%`,
    );
  }

  const { data, error } = await request;
  if (error) {
    console.error("[posts] property option query failed:", error.message);
    return [];
  }
  return data ?? [];
}
