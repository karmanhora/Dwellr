import {
  toCollection,
  toCollectionItem,
  toProfile,
  toPropertySummary,
  type Collection,
  type CollectionItem,
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

type CollectionCountRow = CollectionRow & {
  collection_items: { property_id: string }[] | null;
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

function toSummary(row: PropertyRelations, priceCut: PropertySummary["priceCut"] = null): PropertySummary {
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

export async function getUserCollections(userId: string): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, owner_id, name, description, is_public, share_slug, created_at, updated_at, collection_items(property_id)",
    )
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[collections] list query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as CollectionCountRow[];
  return rows.map((row) => toCollection(row, row.collection_items?.length ?? 0));
}

export type CollectionDetailResult =
  | { status: "ok"; collection: Collection; owner: Profile | null; items: CollectionItem[] }
  | { status: "missing" }
  | { status: "error" };

export async function getCollectionBySlug(slug: string): Promise<CollectionDetailResult> {
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
    collection: toCollection(row, items.length),
    owner: row.profiles ? toProfile(row.profiles) : null,
    items,
  };
}
