import type {
  Collection,
  CollectionActivity,
  CollectionActivityRow,
  CollectionEvaluation,
  CollectionEvaluationRow,
  CollectionHomeComparison,
  CollectionItem,
  CollectionItemRow,
  CollectionMember,
  CollectionMemberProfileRow,
  CollectionMemberRow,
  CollectionRole,
  CollectionRow,
  CollectionWithItems,
} from "../types/collection";
import type { PropertySummary } from "../types/property";

export function toCollection(
  row: CollectionRow,
  itemCount = 0,
  viewerRole?: CollectionRole,
): Collection {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    itemCount,
    viewerRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCollectionItem(
  row: Pick<CollectionItemRow, "property_id" | "note" | "created_at">,
  property: PropertySummary,
): CollectionItem {
  return {
    propertyId: row.property_id,
    note: row.note,
    createdAt: row.created_at,
    property,
  };
}

export function toCollectionWithItems(
  row: CollectionRow,
  items: CollectionItem[],
): CollectionWithItems {
  return { collection: toCollection(row, items.length), items };
}

export function toCollectionMember(
  row: Pick<CollectionMemberRow, "user_id" | "role" | "joined_at">,
  profile: CollectionMemberProfileRow,
): CollectionMember {
  return {
    userId: row.user_id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    avatarUrl: profile.avatar_url,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

export function toCollectionEvaluation(row: CollectionEvaluationRow): CollectionEvaluation {
  return {
    propertyId: row.property_id,
    userId: row.user_id,
    rating: row.rating,
    note: row.note,
    pros: row.pros,
    cons: row.cons,
    updatedAt: row.updated_at,
  };
}

export function toCollectionActivity(
  row: CollectionActivityRow,
  actorName: string,
  propertyTitle: string | null,
  targetName: string | null,
): CollectionActivity {
  return {
    id: row.id,
    actorName,
    action: row.action,
    propertyTitle,
    targetName,
    createdAt: row.created_at,
  };
}

/** Editors and owners can contribute; viewers are read-only. */
export function canContribute(role: CollectionRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

export function collectionRoleLabel(role: CollectionRole): string {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  return "Viewer";
}

export function collectionActivityLabel(activity: CollectionActivity): string {
  switch (activity.action) {
    case "member_joined":
      return `${activity.targetName ?? "Someone"} joined`;
    case "member_left":
      return `${activity.targetName ?? "Someone"} left`;
    case "member_removed":
      return `${activity.targetName ?? "Someone"} was removed`;
    case "item_added":
      return `Added ${activity.propertyTitle ?? "a home"}`;
    case "item_removed":
      return `Removed ${activity.propertyTitle ?? "a home"}`;
    case "evaluation_saved":
      return `Rated ${activity.propertyTitle ?? "a home"}`;
  }
}

export function parseTagList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);
}

export function formatEvaluationTags(tags: readonly string[]): string {
  return tags.join(" · ");
}

export function averageRating(ratings: readonly number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}

/**
 * "Everyone likes" requires every current member to have rated the home 4+.
 * A missing rating is not agreement. A disagreement is a two-point spread
 * between any two ratings on the same home.
 */
export function summarizeCollectionComparison(
  homes: { property: PropertySummary; evaluations: CollectionEvaluation[] }[],
  memberIds: readonly string[],
): {
  homes: CollectionHomeComparison[];
  everyoneLikesCount: number;
  disagreementCount: number;
} {
  let everyoneLikesCount = 0;
  let disagreementCount = 0;

  const compared = homes.map((home) => {
    const ratings = home.evaluations.map((evaluation) => evaluation.rating);
    const ratingsByMember = new Map(
      home.evaluations.map((evaluation) => [evaluation.userId, evaluation.rating]),
    );
    const everyoneLikes =
      memberIds.length > 0 &&
      memberIds.every((memberId) => (ratingsByMember.get(memberId) ?? 0) >= 4);
    const disagreement =
      ratings.length >= 2 && Math.max(...ratings) - Math.min(...ratings) >= 2;

    if (everyoneLikes) everyoneLikesCount += 1;
    if (disagreement) disagreementCount += 1;

    return {
      ...home,
      everyoneLikes,
      disagreement,
      averageRating: averageRating(ratings),
    };
  });

  return { homes: compared, everyoneLikesCount, disagreementCount };
}

/** Share links are public URLs; private collections rely on RLS, not secrecy. */
export function collectionSharePath(shareSlug: string): string {
  return `/c/${shareSlug}`;
}

export function collectionVisibilityLabel(isPublic: boolean): string {
  return isPublic ? "Public" : "Private";
}

export function formatCollectionCount(count: number): string {
  if (count === 0) return "No homes yet";
  return `${count} ${count === 1 ? "home" : "homes"}`;
}
