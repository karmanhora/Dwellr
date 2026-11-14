import {
  decodeCursor,
  encodeCursor,
  isUuid,
  toProfile,
  toProperty,
  toPropertySummary,
  type ListingStatus,
  type Profile,
  type Property,
  type PropertyPhotoRow,
  type PropertyProvenanceRow,
  type PropertyRow,
  type PropertySummary,
} from "@dwellr/core";

import { createClient } from "@/lib/supabase/server";

const RELATIONS =
  "*, property_photos(*), property_field_provenance(property_id, field, provenance, verified_at)";

type FeedRow = PropertyRow & {
  property_photos: PropertyPhotoRow[] | null;
  property_field_provenance: PropertyProvenanceRow[] | null;
};

type DetailRow = FeedRow & {
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
  } | null;
};

export type PropertyFeed = {
  items: PropertySummary[];
  nextCursor: string | null;
  failed: boolean;
};

export type PropertyFeedParams = {
  cursor?: string | null;
  status?: ListingStatus | null;
  query?: string | null;
  limit?: number;
};

/**
 * Keyset pagination over (created_at, id). Offset pagination drifts when new
 * posts arrive; a cursor keeps the grid stable while people scroll.
 */
export async function getPropertyFeed({
  cursor,
  status = null,
  query = null,
  limit = 12,
}: PropertyFeedParams = {}): Promise<PropertyFeed> {
  const supabase = await createClient();

  let request = supabase.from("properties").select(RELATIONS);

  if (status) request = request.eq("listing_status", status);

  // PostgREST filters are expressions, so strip the characters that would let
  // a search term alter the expression instead of matching text.
  const search = query?.replace(/[,()*%\\"]/g, " ").trim();
  if (search) {
    request = request.or(
      `title.ilike.%${search}%,city.ilike.%${search}%,neighborhood.ilike.%${search}%`,
    );
  }

  const decoded = decodeCursor(cursor);
  if (decoded) {
    request = request.or(
      `created_at.lt."${decoded.createdAt}",and(created_at.eq."${decoded.createdAt}",id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (error) {
    console.error("[properties] feed query failed:", error.message);
    return { items: [], nextCursor: null, failed: true };
  }

  const rows = (data ?? []) as FeedRow[];
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];

  return {
    items: page.map((row) =>
      toPropertySummary(row, row.property_photos ?? [], row.property_field_provenance ?? []),
    ),
    nextCursor:
      rows.length > limit && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null,
    failed: false,
  };
}

export type PropertyDetailResult =
  | { status: "ok"; property: Property; creator: Profile | null }
  | { status: "missing" }
  | { status: "error" };

export async function getPropertyDetail(id: string): Promise<PropertyDetailResult> {
  if (!isUuid(id)) return { status: "missing" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(`${RELATIONS}, profiles!properties_created_by_fkey(id, username, display_name, avatar_url, bio, created_at)`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[properties] detail query failed:", error.message);
    return { status: "error" };
  }
  if (!data) return { status: "missing" };

  const row = data as DetailRow;

  return {
    status: "ok",
    property: toProperty(row, row.property_photos ?? [], row.property_field_provenance ?? []),
    creator: row.profiles ? toProfile(row.profiles) : null,
  };
}

export async function getPropertiesByCreator(
  creatorId: string,
  limit = 24,
): Promise<PropertySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(RELATIONS)
    .eq("created_by", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[properties] creator query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as FeedRow[];
  return rows.map((row) =>
    toPropertySummary(row, row.property_photos ?? [], row.property_field_provenance ?? []),
  );
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("username", normalized)
    .maybeSingle();

  if (error) {
    console.error("[profiles] lookup failed:", error.message);
    return null;
  }
  return data ? toProfile(data) : null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[profiles] lookup failed:", error.message);
    return null;
  }
  return data ? toProfile(data) : null;
}

/** Used by the owner-only edit screen; RLS still guards the write itself. */
export async function getOwnedProperty(id: string, ownerId: string): Promise<PropertyDetailResult> {
  const result = await getPropertyDetail(id);
  if (result.status !== "ok") return result;
  if (result.property.createdBy !== ownerId) return { status: "missing" };
  return result;
}
