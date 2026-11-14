import type { PropertySummary } from "./property";

export interface CollectionRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  share_slug: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionItemRow {
  collection_id: string;
  property_id: string;
  added_by: string;
  note: string | null;
  created_at: string;
}

export interface PropertySaveRow {
  property_id: string;
  user_id: string;
  created_at: string;
}

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  shareSlug: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  propertyId: string;
  note: string | null;
  createdAt: string;
  property: PropertySummary;
}

export interface CollectionWithItems {
  collection: Collection;
  items: CollectionItem[];
}
