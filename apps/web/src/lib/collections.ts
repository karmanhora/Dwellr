import {
  toCollection,
  toCollectionActivity,
  toCollectionEvaluation,
  toCollectionItem,
  toCollectionMember,
  toProfile,
  toPropertySummary,
  type Collection,
  type CollectionActivity,
  type CollectionEvaluation,
  type CollectionEvaluationRow,
  type CollectionInviteRow,
  type CollectionItem,
  type CollectionMember,
  type CollectionMemberProfileRow,
  type CollectionMemberRow,
  type CollectionRole,
  type CollectionRow,
  type Profile,
  type PropertyPhotoRow,
  type PropertyProvenanceRow,
  type PropertyRow,
  type PropertySummary,
} from "@dwellr/core";

import { getLatestPriceCuts } from "@/lib/price-history";
import { createClient } from "@/lib/supabase/server";

const PROPERTY_RELATIONS =
  "*, property_photos(*), property_field_provenance(property_id, field, provenance, verified_at)";

type PropertyRelations = PropertyRow & {
  property_photos: PropertyPhotoRow[] | null;
  property_field_provenance: PropertyProvenanceRow[] | null;
};

type CollectionItemWithProperty = {
  property_id: string;
  note: string | null;
  created_at: string;
  properties: PropertyRelations | null;
};

type CollectionDetailRow = CollectionRow & {
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
  } | null;
  collection_items: CollectionItemWithProperty[] | null;
};

type MembershipCollectionRow = {
  role: CollectionRole;
  joined_at: string;
  collections:
    | (CollectionRow & { collection_items: { property_id: string }[] | null })
    | null;
};

type MemberQueryRow = CollectionMemberRow & {
  profiles: CollectionMemberProfileRow | null;
};

type ActivityQueryRow = {
  id: number;
  collection_id: string;
  actor_id: string | null;
  action:
    | "member_joined"
    | "member_left"
    | "member_removed"
    | "item_added"
    | "item_removed"
    | "evaluation_saved";
  property_id: string | null;
  target_user_id: string | null;
  created_at: string;
  actor: { username: string; display_name: string | null } | null;
  target: { username: string; display_name: string | null } | null;
  properties: { title: string } | null;
};

function toSummary(
  row: PropertyRelations,
  priceCut: PropertySummary["priceCut"] = null,
): PropertySummary {
  return toPropertySummary(
    row,
    row.property_photos ?? [],
    row.property_field_provenance ?? [],
    priceCut,
  );
}

/** Private bookmarks for the signed-in user, newest first. */
export async function getSavedProperties(userId: string): Promise<PropertySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_saves")
    .select(`created_at, properties(${PROPERTY_RELATIONS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[collections] saved homes query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as { properties: PropertyRelations | null }[];
  const properties = rows.flatMap((row) => (row.properties ? [row.properties] : []));
  const priceCuts = await getLatestPriceCuts(properties.map((property) => property.id));
  return properties.map((property) => toSummary(property, priceCuts.get(property.id) ?? null));
}

export async function isPropertySaved(propertyId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_saves")
    .select("property_id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .maybeSingle();

  return Boolean(data);
}

/** Every collection the user belongs to, including shared ones. */
export async function getUserCollections(userId: string): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_members")
    .select(
      "role, joined_at, collections!inner(id, owner_id, name, description, is_public, share_slug, created_at, updated_at, collection_items(property_id))",
    )
    .eq("user_id", userId);

  if (error) {
    console.error("[collections] list query failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as MembershipCollectionRow[])
    .flatMap((row) => {
      if (!row.collections) return [];
      return [
        toCollection(
          row.collections,
          row.collections.collection_items?.length ?? 0,
          row.role,
        ),
      ];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getWritableCollections(userId: string): Promise<Collection[]> {
  const collections = await getUserCollections(userId);
  return collections.filter(
    (collection) => collection.viewerRole === "owner" || collection.viewerRole === "editor",
  );
}

export interface PendingInvite {
  id: string;
  collectionName: string;
  collectionSlug: string;
  role: Exclude<CollectionRole, "owner">;
  expiresAt: string;
}

/** Named invites waiting for this user. Link invites have no invitee_id. */
export async function getPendingInvites(userId: string): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_invites")
    .select(
      "id, role, max_uses, use_count, expires_at, collections!inner(name, share_slug)",
    )
    .eq("invitee_id", userId)
    .is("revoked_at", null)
    .is("declined_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[collections] pending invites failed:", error.message);
    return [];
  }

  type Row = {
    id: string;
    role: Exclude<CollectionRole, "owner">;
    max_uses: number;
    use_count: number;
    expires_at: string;
    collections: { name: string; share_slug: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).flatMap((row) =>
    row.collections && row.use_count < row.max_uses
      ? [
          {
            id: row.id,
            collectionName: row.collections.name,
            collectionSlug: row.collections.share_slug,
            role: row.role,
            expiresAt: row.expires_at,
          },
        ]
      : [],
  );
}

export type CollectionDetailResult =
  | {
      status: "ok";
      collection: Collection;
      owner: Profile | null;
      items: CollectionItem[];
      members: CollectionMember[];
      evaluations: CollectionEvaluation[];
      activity: CollectionActivity[];
      viewerRole: CollectionRole | null;
      invites: CollectionInviteRow[];
    }
  | { status: "missing" }
  | { status: "error" };

export async function getCollectionBySlug(
  slug: string,
  userId: string | null = null,
): Promise<CollectionDetailResult> {
  if (!/^[a-z0-9]{12}$/.test(slug)) return { status: "missing" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      `*, profiles!collections_owner_id_fkey(id, username, display_name, avatar_url, bio, created_at), collection_items(property_id, note, created_at, properties(${PROPERTY_RELATIONS}))`,
    )
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[collections] detail query failed:", error.message);
    return { status: "error" };
  }
  if (!data) return { status: "missing" };

  const row = data as CollectionDetailRow;
  const collectionId = row.id;

  const [membersResult, evaluationsResult, activityResult, invitesResult] = await Promise.all([
    supabase
      .from("collection_members")
      .select("*, profiles!collection_members_user_id_fkey(id, username, display_name, avatar_url)")
      .eq("collection_id", collectionId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("collection_item_evaluations")
      .select("*")
      .eq("collection_id", collectionId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("collection_activity")
      .select(
        "*, actor:profiles!collection_activity_actor_id_fkey(username, display_name), target:profiles!collection_activity_target_user_id_fkey(username, display_name), properties(title)",
      )
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(30),
    supabase
      .from("collection_invites")
      .select(
        "id, collection_id, invited_by, invitee_id, role, max_uses, use_count, expires_at, revoked_at, declined_at, created_at",
      )
      .eq("collection_id", collectionId)
      .is("revoked_at", null)
      .is("declined_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (membersResult.error || evaluationsResult.error) {
    console.error(
      "[collections] collaboration query failed:",
      membersResult.error?.message ?? evaluationsResult.error?.message,
    );
    return { status: "error" };
  }

  const members = ((membersResult.data ?? []) as unknown as MemberQueryRow[]).flatMap((member) =>
    member.profiles
      ? [toCollectionMember(member, member.profiles)]
      : [],
  );
  const viewerRole = userId
    ? (members.find((member) => member.userId === userId)?.role ?? null)
    : null;

  const evaluations = ((evaluationsResult.data ?? []) as CollectionEvaluationRow[]).map(
    toCollectionEvaluation,
  );

  const activity = ((activityResult.data ?? []) as unknown as ActivityQueryRow[]).map((entry) =>
    toCollectionActivity(
      entry,
      entry.actor?.display_name ?? entry.actor?.username ?? "Someone",
      entry.properties?.title ?? null,
      entry.target?.display_name ?? entry.target?.username ?? null,
    ),
  );

  const pricedItems = (row.collection_items ?? []).filter(
    (item): item is CollectionItemWithProperty & { properties: PropertyRelations } =>
      Boolean(item.properties),
  );
  const priceCuts = await getLatestPriceCuts(pricedItems.map((item) => item.properties.id));
  const items = pricedItems
    .map((item) =>
      toCollectionItem(
        { property_id: item.property_id, note: item.note, created_at: item.created_at },
        toSummary(item.properties, priceCuts.get(item.properties.id) ?? null),
      ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    status: "ok",
    collection: toCollection(row, items.length, viewerRole ?? undefined),
    owner: row.profiles ? toProfile(row.profiles) : null,
    items,
    members,
    evaluations,
    activity,
    viewerRole,
    invites: (invitesResult.data ?? []) as CollectionInviteRow[],
  };
}
