import {
  buildCommentTree,
  decodeFeedCursor,
  encodeFeedCursor,
  isUuid,
  toProfile,
  type Comment,
  type CommentAuthor,
  type CommentRow,
  type FeedPage,
  type FeedPreferences,
  type LikeSummary,
  type Notification,
  type Profile,
} from "@dwellr/core";

import { getPropertiesByIds } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

type CommentQueryRow = CommentRow & {
  profiles: CommentAuthor | null;
};

type NotificationQueryRow = {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: Notification["type"];
  target_type: Notification["targetType"];
  target_id: string | null;
  comment_id: string | null;
  collection_id: string | null;
  actor_count: number;
  read_at: string | null;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
  collections: { share_slug: string } | null;
};

type ProfileRowLite = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export async function getLikeSummaries(
  targetIds: readonly string[],
  userId: string | null,
): Promise<Map<string, LikeSummary>> {
  const summaries = new Map<string, LikeSummary>();
  if (targetIds.length === 0) return summaries;

  const supabase = await createClient();
  const [counts, mine] = await Promise.all([
    supabase
      .from("content_like_counts")
      .select("target_id, like_count")
      .eq("target_type", "property")
      .in("target_id", [...targetIds]),
    userId
      ? supabase
          .from("content_likes")
          .select("target_id")
          .eq("user_id", userId)
          .eq("target_type", "property")
          .in("target_id", [...targetIds])
      : Promise.resolve({ data: [], error: null }),
  ]);

  const liked = new Set(
    ((mine.data ?? []) as { target_id: string }[]).map((row) => row.target_id),
  );

  for (const id of targetIds) {
    const row = ((counts.data ?? []) as { target_id: string; like_count: number }[]).find(
      (entry) => entry.target_id === id,
    );
    summaries.set(id, { count: row?.like_count ?? 0, likedByMe: liked.has(id) });
  }

  return summaries;
}

export async function getComments(
  targetType: "property" | "post",
  targetId: string,
): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, target_type, target_id, author_id, parent_id, body, created_at, updated_at, deleted_at, deleted_by, profiles!comments_author_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[social] comments query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as CommentQueryRow[];
  const authors = new Map<string, CommentAuthor>();
  for (const row of rows) {
    if (row.profiles) authors.set(row.author_id, row.profiles);
  }
  return buildCommentTree(rows, authors);
}

export async function getFollowCounts(userId: string): Promise<{
  followerCount: number;
  followingCount: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_follow_counts")
    .select("follower_count, following_count")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    followerCount: data?.follower_count ?? 0,
    followingCount: data?.following_count ?? 0,
  };
}

export async function getFollowState(
  followerId: string | null,
  followingId: string,
): Promise<boolean> {
  if (!followerId || followerId === followingId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

export async function getFollowerProfiles(userId: string, limit = 50): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select(
      "created_at, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio, created_at)",
    )
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[social] followers query failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as { profiles: ProfileRowLite | null }[]).flatMap((row) =>
    row.profiles ? [toProfile(row.profiles)] : [],
  );
}

export async function getFollowingProfiles(userId: string, limit = 50): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select(
      "created_at, profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio, created_at)",
    )
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[social] following query failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as { profiles: ProfileRowLite | null }[]).flatMap((row) =>
    row.profiles ? [toProfile(row.profiles)] : [],
  );
}

export async function getBlockState(
  userId: string | null,
  targetId: string,
): Promise<{ blockedByMe: boolean; blocksMe: boolean }> {
  if (!userId || userId === targetId) return { blockedByMe: false, blocksMe: false };

  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${userId})`,
    );

  const rows = (data ?? []) as { blocker_id: string; blocked_id: string }[];
  return {
    blockedByMe: rows.some((row) => row.blocker_id === userId && row.blocked_id === targetId),
    blocksMe: rows.some((row) => row.blocker_id === targetId && row.blocked_id === userId),
  };
}

export async function getNotificationsWithStatus(
  userId: string,
): Promise<{ items: Notification[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, user_id, actor_id, type, target_type, target_id, comment_id, collection_id, actor_count, read_at, created_at, profiles!notifications_actor_id_fkey(username, display_name), collections(share_slug)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[social] notifications query failed:", error.message);
    return { items: [], failed: true };
  }

  const rows = (data ?? []) as unknown as NotificationQueryRow[];
  const propertyIds = Array.from(
    new Set(
      rows
        .filter((row) => row.target_type === "property" && row.target_id)
        .map((row) => row.target_id as string),
    ),
  );

  const properties = await getPropertiesByIds(propertyIds);
  const postIds = Array.from(
    new Set(
      rows
        .filter((row) => row.target_type === "post" && row.target_id)
        .map((row) => row.target_id as string),
    ),
  );
  const posts = new Map<string, string>();
  if (postIds.length > 0) {
    const { data: postRows } = await supabase
      .from("posts")
      .select("id, caption")
      .in("id", postIds)
      .is("deleted_at", null);
    for (const post of (postRows ?? []) as { id: string; caption: string }[]) {
      posts.set(post.id, post.caption);
    }
  }

  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      actorName: row.profiles?.display_name ?? row.profiles?.username ?? "Someone",
      actorCount: row.actor_count,
      targetType: row.target_type,
      targetId: row.target_id,
      commentId: row.comment_id,
      collectionId: row.collection_id,
      collectionSlug: row.collections?.share_slug ?? null,
      propertyTitle:
        row.target_type === "property" && row.target_id
          ? (properties.get(row.target_id)?.title ?? null)
          : null,
      postCaption:
        row.target_type === "post" && row.target_id
          ? (posts.get(row.target_id) ?? null)
          : null,
      readAt: row.read_at,
      createdAt: row.created_at,
    })),
    failed: false,
  };
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const result = await getNotificationsWithStatus(userId);
  return result.items;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[social] unread count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function getFeedPreferences(userId: string): Promise<FeedPreferences> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feed_preferences")
    .select("neighborhoods, property_types")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    neighborhoods: data?.neighborhoods ?? [],
    propertyTypes: (data?.property_types ?? []) as FeedPreferences["propertyTypes"],
  };
}

export async function getPersonalizedFeed({
  userId,
  cursor,
  limit = 12,
}: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<FeedPage> {
  // The query runs with the caller's cookies and RLS, so userId is the session
  // identity; it is kept in the signature to make that dependency explicit.
  void userId;
  const supabase = await createClient();
  let request = supabase
    .from("feed_properties")
    .select("id, relevance, created_at");

  const decoded = decodeFeedCursor(cursor);
  if (decoded) {
    request = request.or(
      `relevance.lt.${decoded.relevance},and(relevance.eq.${decoded.relevance},created_at.lt."${decoded.createdAt}"),and(relevance.eq.${decoded.relevance},created_at.eq."${decoded.createdAt}",id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await request
    .order("relevance", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (error) {
    console.error("[social] feed query failed:", error.message);
    return { items: [], nextCursor: null, failed: true };
  }

  const rows = (data ?? []) as { id: string; relevance: number; created_at: string }[];
  const page = rows.slice(0, limit);
  const properties = await getPropertiesByIds(page.map((row) => row.id));
  const last = page[page.length - 1];

  return {
    items: page.flatMap((row) => {
      const property = properties.get(row.id);
      return property ? [{ property, relevance: row.relevance }] : [];
    }),
    nextCursor:
      rows.length > limit && last
        ? encodeFeedCursor({
            relevance: last.relevance,
            createdAt: last.created_at,
            id: last.id,
          })
        : null,
    failed: false,
  };
}

export async function getBlockedProfiles(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .select(
      "blocked_id, profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url, bio, created_at)",
    )
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[social] blocked profiles failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as { profiles: ProfileRowLite | null }[]).flatMap((row) =>
    row.profiles ? [toProfile(row.profiles)] : [],
  );
}

export async function getSuggestedPeople(
  userId: string,
  limit = 4,
): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .neq("id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[social] suggested people failed:", error.message);
    return [];
  }

  return ((data ?? []) as ProfileRowLite[]).map(toProfile);
}

/** Resolve a username to the id used by invites. Usernames are public. */
export async function getProfileIdByUsername(username: string): Promise<{
  id: string;
  username: string;
} | null> {
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
  return data ?? null;
}

export async function getCollectionSlug(collectionId: string): Promise<string | null> {
  if (!isUuid(collectionId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("share_slug")
    .eq("id", collectionId)
    .maybeSingle();
  return data?.share_slug ?? null;
}
