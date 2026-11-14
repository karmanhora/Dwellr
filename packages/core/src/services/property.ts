import { LISTING_STATUS_LABELS, PROPERTY_TYPE_LABELS } from "../constants/property";
import type {
  Property,
  PropertyField,
  PropertyPhoto,
  PropertyPhotoRow,
  PropertyProvenanceRow,
  PropertyRow,
  PropertySummary,
  Provenance,
} from "../types/property";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function toPropertyPhoto(row: PropertyPhotoRow): PropertyPhoto {
  return {
    id: row.id,
    storagePath: row.storage_path,
    position: row.position,
    altText: row.alt_text,
    width: row.width,
    height: row.height,
  };
}

/** Photos are ordered by their stored position; ties break deterministically. */
export function sortPhotos(rows: readonly PropertyPhotoRow[]): PropertyPhotoRow[] {
  return [...rows].sort(
    (a, b) => a.position - b.position || a.storage_path.localeCompare(b.storage_path),
  );
}

export function toProvenanceMap(
  rows: readonly PropertyProvenanceRow[],
): Partial<Record<PropertyField, Provenance>> {
  const map: Partial<Record<PropertyField, Provenance>> = {};
  for (const row of rows) map[row.field] = row.provenance;
  return map;
}

export function toProperty(
  row: PropertyRow,
  photoRows: readonly PropertyPhotoRow[],
  provenanceRows: readonly PropertyProvenanceRow[],
): Property {
  return {
    id: row.id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    listingStatus: row.listing_status,
    priceCents: row.price_cents,
    currency: row.currency,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    squareFeet: row.square_feet,
    propertyType: row.property_type,
    location: {
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: sortPhotos(photoRows).map(toPropertyPhoto),
    provenance: toProvenanceMap(provenanceRows),
  };
}

/**
 * A property is "verified" only when every recorded fact is verified. Anything
 * else — including a property with no provenance rows yet — is community data.
 */
export function getPropertyVerification(
  provenance: Partial<Record<PropertyField, Provenance>>,
): Provenance {
  const values = Object.values(provenance);
  if (values.length === 0) return "user_submitted";
  return values.every((value) => value === "verified") ? "verified" : "user_submitted";
}

export function formatPrice(priceCents: number | null, currency = "USD"): string {
  if (priceCents === null) return "Price not listed";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(priceCents / 100);
  } catch {
    return `${Math.round(priceCents / 100).toLocaleString("en-US")} ${currency}`;
  }
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Beds / baths / square feet, with the labels the card and detail page use. */
export function propertyFacts(
  property: Pick<Property, "bedrooms" | "bathrooms" | "squareFeet" | "propertyType">,
): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];

  if (property.bedrooms !== null) {
    facts.push({ label: "Beds", value: formatCount(property.bedrooms) });
  }
  if (property.bathrooms !== null) {
    facts.push({ label: "Baths", value: formatCount(property.bathrooms) });
  }
  if (property.squareFeet !== null) {
    facts.push({ label: "Sq ft", value: formatCount(property.squareFeet) });
  }

  facts.push({ label: "Type", value: PROPERTY_TYPE_LABELS[property.propertyType] });

  return facts;
}

export function listingStatusLabel(status: Property["listingStatus"]): string {
  return LISTING_STATUS_LABELS[status];
}

/**
 * Public object URL for a stored photo. Path segments are encoded, but the
 * storage key is generated server-side and only contains safe characters.
 */
export function buildPublicStorageUrl(supabaseUrl: string, bucket: string, path: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

/** Opaque, URL-safe cursor for keyset pagination over (created_at, id). */
export function encodeCursor(item: { createdAt: string; id: string }): string {
  return `${item.createdAt}|${item.id}`;
}

export function decodeCursor(value: string | null | undefined): { createdAt: string; id: string } | null {
  if (!value) return null;
  const separator = value.indexOf("|");
  if (separator <= 0) return null;

  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);

  if (!UUID_PATTERN.test(id)) return null;
  if (Number.isNaN(new Date(createdAt).getTime())) return null;

  return { createdAt, id };
}

/** Builds the card projection from a row, its photos and provenance rows. */
export function toPropertySummary(
  row: PropertyRow,
  photoRows: readonly PropertyPhotoRow[],
  provenanceRows: readonly PropertyProvenanceRow[],
): PropertySummary {
  const photos = sortPhotos(photoRows);

  return {
    id: row.id,
    title: row.title,
    listingStatus: row.listing_status,
    priceCents: row.price_cents,
    currency: row.currency,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    squareFeet: row.square_feet,
    propertyType: row.property_type,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    createdAt: row.created_at,
    coverPhoto: photos[0] ? toPropertyPhoto(photos[0]) : null,
    photoCount: photos.length,
    verification: getPropertyVerification(toProvenanceMap(provenanceRows)),
  };
}
