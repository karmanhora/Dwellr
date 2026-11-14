/**
 * Property constants shared by every client and mirrored by database checks.
 * Keep these in sync with supabase/migrations/20261114190000_create_properties.sql.
 */

export const PROPERTY_TITLE_MIN_LENGTH = 3;
export const PROPERTY_TITLE_MAX_LENGTH = 120;
export const PROPERTY_DESCRIPTION_MAX_LENGTH = 4000;
export const PROPERTY_NEIGHBORHOOD_MAX_LENGTH = 80;
export const PROPERTY_CITY_MAX_LENGTH = 80;
export const PROPERTY_STATE_MAX_LENGTH = 80;
export const PROPERTY_POSTAL_CODE_MAX_LENGTH = 12;

export const PROPERTY_MAX_PHOTOS = 8;
export const PROPERTY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROPERTY_PHOTO_ALT_MAX_LENGTH = 200;
export const PROPERTY_PHOTO_MAX_EDGE = 2000;
export const PROPERTY_PHOTO_MAX_DIMENSION = 12000;
export const PROPERTY_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const PROPERTY_MIN_PRICE_CENTS = 0;
export const PROPERTY_MAX_PRICE_CENTS = 100_000_000_000;

export const PROPERTY_MAX_BEDROOMS = 50;
export const PROPERTY_MAX_BATHROOMS = 50;
export const PROPERTY_MIN_SQUARE_FEET = 1;
export const PROPERTY_MAX_SQUARE_FEET = 100_000;

export const LISTING_STATUSES = ["for_sale", "off_market", "sold", "unknown"] as const;
export const PROPERTY_TYPES = [
  "house",
  "apartment",
  "condo",
  "townhouse",
  "multi_family",
  "land",
  "other",
] as const;

/** Playful but honest copy for the listing-status badge. */
export const LISTING_STATUS_LABELS: Record<(typeof LISTING_STATUSES)[number], string> = {
  for_sale: "For sale",
  off_market: "Off market",
  sold: "Sold",
  unknown: "Status unknown",
};

export const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  house: "House",
  apartment: "Apartment",
  condo: "Condo",
  townhouse: "Townhouse",
  multi_family: "Multi-family",
  land: "Land",
  other: "Other",
};

export const PROPERTY_BUCKET = "property-photos";
export const AVATAR_BUCKET = "avatars";

/** Every property fact that carries provenance. */
export const PROPERTY_PROVENANCE_FIELDS = [
  "title",
  "description",
  "listing_status",
  "price",
  "bedrooms",
  "bathrooms",
  "square_feet",
  "property_type",
  "neighborhood",
  "city",
  "state",
  "postal_code",
  "location",
] as const;
