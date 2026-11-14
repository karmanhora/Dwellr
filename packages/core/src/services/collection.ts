import type {
  Collection,
  CollectionItem,
  CollectionItemRow,
  CollectionRow,
  CollectionWithItems,
} from "../types/collection";
import type { PropertySummary } from "../types/property";

export function toCollection(row: CollectionRow, itemCount = 0): Collection {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    itemCount,
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
