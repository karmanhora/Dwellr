import { dollarsToCents, parseOptionalNumber } from "@hauscrawl/core";

export type PropertyFormState = {
  status: "idle" | "error" | "notice";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialPropertyFormState: PropertyFormState = { status: "idle" };

export type PropertyFormPhoto = {
  storagePath: string;
  width?: number;
  height?: number;
  altText?: string;
};

export type PropertyFormFields = {
  title: string;
  description: string;
  listingStatus: string;
  priceCents: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

export const PROPERTY_FORM_KEYS = [
  "title",
  "description",
  "listingStatus",
  "price",
  "bedrooms",
  "bathrooms",
  "squareFeet",
  "propertyType",
  "neighborhood",
  "city",
  "state",
  "postalCode",
  "latitude",
  "longitude",
] as const;

export function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Keeps typed values across a failed submit without echoing anything secret. */
export function snapshotPropertyForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of PROPERTY_FORM_KEYS) values[key] = readText(formData, key);
  return values;
}

export function parseFormPhotos(formData: FormData): PropertyFormPhoto[] {
  const raw = readText(formData, "photos");
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): PropertyFormPhoto[] => {
      if (typeof item !== "object" || item === null) return [];
      const record = item as Record<string, unknown>;
      if (typeof record.storagePath !== "string") return [];

      return [
        {
          storagePath: record.storagePath,
          width: typeof record.width === "number" ? record.width : undefined,
          height: typeof record.height === "number" ? record.height : undefined,
          altText: typeof record.altText === "string" ? record.altText : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

type ParsedFields = {
  fields: PropertyFormFields;
  fieldErrors: Record<string, string>;
};

function parseCoordinate(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Converts form strings to the numbers the shared schema expects, keeping a
 * typo ("12a") distinct from a deliberately blank optional field.
 */
export function readPropertyFields(formData: FormData): ParsedFields {
  const fieldErrors: Record<string, string> = {};

  const priceRaw = readText(formData, "price");
  let priceCents: number | null = null;
  if (priceRaw.trim() !== "") {
    priceCents = dollarsToCents(priceRaw);
    if (priceCents === null) {
      fieldErrors.price = "Enter a price like 450000, or leave it blank.";
    }
  }

  const numeric = (key: string, label: string): number | null => {
    const raw = readText(formData, key);
    const value = parseOptionalNumber(raw);
    if (raw.trim() !== "" && value === null) {
      fieldErrors[key] = `Enter ${label} as a number.`;
    }
    return value;
  };

  const bedrooms = numeric("bedrooms", "bedrooms");
  const bathrooms = numeric("bathrooms", "bathrooms");
  const squareFeet = numeric("squareFeet", "square feet");

  const coordinates = (key: string, label: string): number | null => {
    const raw = readText(formData, key);
    const value = parseCoordinate(raw);
    if (raw.trim() !== "" && value === null) {
      fieldErrors[key] = `Enter ${label} as a number.`;
    }
    return value;
  };

  return {
    fields: {
      title: readText(formData, "title"),
      description: readText(formData, "description"),
      listingStatus: readText(formData, "listingStatus") || "unknown",
      priceCents,
      currency: "USD",
      bedrooms,
      bathrooms,
      squareFeet,
      propertyType: readText(formData, "propertyType") || "house",
      neighborhood: readText(formData, "neighborhood"),
      city: readText(formData, "city"),
      state: readText(formData, "state"),
      postalCode: readText(formData, "postalCode"),
      latitude: coordinates("latitude", "latitude"),
      longitude: coordinates("longitude", "longitude"),
    },
    fieldErrors,
  };
}
