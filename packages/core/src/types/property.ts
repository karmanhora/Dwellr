export type ListingStatus = "for_sale" | "off_market" | "sold" | "unknown";

export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "townhouse"
  | "multi_family"
  | "land"
  | "other";

export type Provenance = "user_submitted" | "verified";

/** Factual fields that carry a provenance entry. Mirrors the database check. */
export type PropertyField =
  | "title"
  | "description"
  | "listing_status"
  | "price"
  | "bedrooms"
  | "bathrooms"
  | "square_feet"
  | "property_type"
  | "neighborhood"
  | "city"
  | "state"
  | "postal_code"
  | "location";

/** Shape as stored in Postgres (snake_case). */
export interface PropertyRow {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  listing_status: ListingStatus;
  price_cents: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  property_type: PropertyType;
  neighborhood: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyPhotoRow {
  id: string;
  property_id: string;
  storage_path: string;
  position: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
}

export interface PropertyProvenanceRow {
  property_id: string;
  field: PropertyField;
  provenance: Provenance;
  verified_at: string | null;
  /** Server-side only: never selected by client-facing queries. */
  source_ref?: string | null;
}

export interface PropertyPhoto {
  id: string;
  storagePath: string;
  position: number;
  altText: string | null;
  width: number | null;
  height: number | null;
}

/** Shape used by UI code (camelCase, no transport concerns). */
export interface Property {
  id: string;
  createdBy: string;
  title: string;
  description: string | null;
  listingStatus: ListingStatus;
  priceCents: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: PropertyType;
  location: {
    neighborhood: string;
    city: string;
    state: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  createdAt: string;
  updatedAt: string;
  photos: PropertyPhoto[];
  provenance: Partial<Record<PropertyField, Provenance>>;
}

/** A card-sized projection: enough for the grid, without the description. */
export interface PropertySummary {
  id: string;
  title: string;
  listingStatus: ListingStatus;
  priceCents: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: PropertyType;
  neighborhood: string;
  city: string;
  state: string | null;
  createdAt: string;
  coverPhoto: PropertyPhoto | null;
  photoCount: number;
  verification: Provenance;
}
