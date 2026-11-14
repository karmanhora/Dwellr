import { describe, expect, it } from "vitest";

import type {
  PropertyPhotoRow,
  PropertyProvenanceRow,
  PropertyRow,
} from "../types/property";
import {
  buildPublicStorageUrl,
  decodeCursor,
  encodeCursor,
  formatPrice,
  getPropertyVerification,
  propertyFacts,
  sortPhotos,
  toProperty,
  toPropertySummary,
} from "./property";

const propertyRow: PropertyRow = {
  id: "0d1f4b0a-1111-4000-8000-000000000001",
  created_by: "5b0d1c2e-0000-4000-8000-000000000000",
  title: "Sunlit two-bed by the park",
  description: "Quiet street.",
  listing_status: "for_sale",
  price_cents: 68_500_000,
  currency: "USD",
  bedrooms: 2,
  bathrooms: 1.5,
  square_feet: 980,
  property_type: "condo",
  neighborhood: "Juniper Heights",
  city: "Portland",
  state: "OR",
  postal_code: "97212",
  latitude: 45.55,
  longitude: -122.6,
  created_at: "2026-11-14T20:00:00.000Z",
  updated_at: "2026-11-14T20:00:00.000Z",
};

const photoRows: PropertyPhotoRow[] = [
  {
    id: "photo-b",
    property_id: propertyRow.id,
    storage_path: "user/bbbbbbbb-0000-4000-8000-000000000002.webp",
    position: 1,
    alt_text: "Bedroom",
    width: 1200,
    height: 800,
  },
  {
    id: "photo-a",
    property_id: propertyRow.id,
    storage_path: "user/aaaaaaaa-0000-4000-8000-000000000001.webp",
    position: 0,
    alt_text: "Living room",
    width: 1600,
    height: 1067,
  },
];

const provenanceRows: PropertyProvenanceRow[] = [
  {
    property_id: propertyRow.id,
    field: "title",
    provenance: "user_submitted",
    verified_at: null,
    source_ref: null,
  },
  {
    property_id: propertyRow.id,
    field: "price",
    provenance: "verified",
    verified_at: "2026-11-14T21:00:00.000Z",
    source_ref: "county-records",
  },
];

describe("toProperty", () => {
  it("maps snake_case to camelCase and sorts photos by position", () => {
    const property = toProperty(propertyRow, photoRows, provenanceRows);

    expect(property.location).toEqual({
      neighborhood: "Juniper Heights",
      city: "Portland",
      state: "OR",
      postalCode: "97212",
      latitude: 45.55,
      longitude: -122.6,
    });
    expect(property.photos.map((photo) => photo.position)).toEqual([0, 1]);
    expect(property.provenance).toEqual({ title: "user_submitted", price: "verified" });
  });

  it("survives a property with no photos", () => {
    const property = toProperty(propertyRow, [], []);
    expect(property.photos).toEqual([]);
    expect(property.provenance).toEqual({});
  });
});

describe("sortPhotos", () => {
  it("breaks position ties deterministically", () => {
    const rows = [
      { ...photoRows[0]!, position: 0 },
      { ...photoRows[1]!, position: 0 },
    ];
    expect(sortPhotos(rows).map((row) => row.storage_path)).toEqual([
      rows[1]!.storage_path,
      rows[0]!.storage_path,
    ]);
  });
});

describe("getPropertyVerification", () => {
  it("is verified only when every fact is verified", () => {
    expect(getPropertyVerification({ title: "verified", price: "verified" })).toBe("verified");
  });

  it("falls back to community when any fact is user-submitted", () => {
    expect(getPropertyVerification({ title: "verified", price: "user_submitted" })).toBe(
      "user_submitted",
    );
  });

  it("treats an empty provenance map as community data", () => {
    expect(getPropertyVerification({})).toBe("user_submitted");
  });
});

describe("formatPrice", () => {
  it("formats cents as whole currency units", () => {
    expect(formatPrice(68_500_000)).toBe("$685,000");
    expect(formatPrice(68_500_000, "EUR")).toBe("€685,000");
  });

  it("never invents a price", () => {
    expect(formatPrice(null)).toBe("Price not listed");
  });

  it("renders an unknown currency code rather than crashing", () => {
    expect(formatPrice(100_000, "ZZZ")).toContain("1,000");
  });
});

describe("propertyFacts", () => {
  const factsSource = {
    bedrooms: 2,
    bathrooms: 1.5,
    squareFeet: 980,
    propertyType: "condo" as const,
  };

  it("lists only the facts that were provided", () => {
    expect(propertyFacts(factsSource)).toEqual([
      { label: "Beds", value: "2" },
      { label: "Baths", value: "1.5" },
      { label: "Sq ft", value: "980" },
      { label: "Type", value: "Condo" },
    ]);
  });

  it("omits unknown numbers instead of showing zero", () => {
    const facts = propertyFacts({
      ...factsSource,
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
    });
    expect(facts).toEqual([{ label: "Type", value: "Condo" }]);
  });
});

describe("buildPublicStorageUrl", () => {
  it("builds a public URL and encodes path segments", () => {
    expect(
      buildPublicStorageUrl("https://demo.supabase.co/", "property-photos", "user/a b.webp"),
    ).toBe("https://demo.supabase.co/storage/v1/object/public/property-photos/user/a%20b.webp");
  });
});

describe("cursor helpers", () => {
  it("round-trips a cursor", () => {
    const cursor = encodeCursor({ createdAt: propertyRow.created_at, id: propertyRow.id });
    expect(decodeCursor(cursor)).toEqual({ createdAt: propertyRow.created_at, id: propertyRow.id });
  });

  it.each([null, undefined, "", "no-separator", "2026-11-14T20:00:00.000Z|not-a-uuid"])(
    "rejects invalid cursor %j",
    (value) => {
      expect(decodeCursor(value)).toBeNull();
    },
  );

  it("rejects an unparseable timestamp", () => {
    expect(decodeCursor(`nope|${propertyRow.id}`)).toBeNull();
  });
});

describe("toPropertySummary", () => {
  it("uses the first photo as the cover and summarizes provenance", () => {
    const summary = toPropertySummary(propertyRow, photoRows, provenanceRows);

    expect(summary.coverPhoto?.position).toBe(0);
    expect(summary.photoCount).toBe(2);
    expect(summary.verification).toBe("user_submitted");
    expect(summary.priceCents).toBe(68_500_000);
  });
});
