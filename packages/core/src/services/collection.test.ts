import { describe, expect, it } from "vitest";

import type { CollectionRow } from "../types/collection";
import type { PropertySummary } from "../types/property";
import {
  collectionSharePath,
  collectionVisibilityLabel,
  formatCollectionCount,
  toCollection,
  toCollectionItem,
  toCollectionWithItems,
} from "./collection";

const row: CollectionRow = {
  id: "0d1f4b0a-1111-4000-8000-000000000001",
  owner_id: "5b0d1c2e-0000-4000-8000-000000000000",
  name: "Weekend tours",
  description: "Homes we can visit on Saturday.",
  is_public: true,
  share_slug: "abc123def456",
  created_at: "2026-11-14T20:00:00.000Z",
  updated_at: "2026-11-14T20:00:00.000Z",
};

const summary: PropertySummary = {
  id: "0d1f4b0a-1111-4000-8000-000000000002",
  title: "Sunlit two-bed",
  listingStatus: "for_sale",
  priceCents: 45_000_000,
  currency: "USD",
  bedrooms: 2,
  bathrooms: 1,
  squareFeet: 900,
  propertyType: "condo",
  neighborhood: "Juniper Heights",
  city: "Portland",
  state: "OR",
  createdAt: "2026-11-14T20:00:00.000Z",
  coverPhoto: null,
  photoCount: 0,
  verification: "user_submitted",
  priceCut: null,
};

describe("toCollection", () => {
  it("maps snake_case to camelCase with a count", () => {
    const collection = toCollection(row, 3);
    expect(collection.ownerId).toBe(row.owner_id);
    expect(collection.isPublic).toBe(true);
    expect(collection.shareSlug).toBe("abc123def456");
    expect(collection.itemCount).toBe(3);
  });
});

describe("toCollectionItem", () => {
  it("keeps the owner's note separate from property facts", () => {
    const item = toCollectionItem(
      { property_id: "p1", note: "Loved the light.", created_at: row.created_at },
      summary,
    );
    expect(item.note).toBe("Loved the light.");
    expect(item.property.title).toBe("Sunlit two-bed");
  });
});

describe("toCollectionWithItems", () => {
  it("derives the count from its items", () => {
    const result = toCollectionWithItems(row, [
      toCollectionItem({ property_id: "p1", note: null, created_at: row.created_at }, summary),
    ]);
    expect(result.collection.itemCount).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});

describe("collection helpers", () => {
  it("builds share paths", () => {
    expect(collectionSharePath("abc123def456")).toBe("/c/abc123def456");
  });

  it("labels visibility", () => {
    expect(collectionVisibilityLabel(true)).toBe("Public");
    expect(collectionVisibilityLabel(false)).toBe("Private");
  });

  it("formats counts", () => {
    expect(formatCollectionCount(0)).toBe("No homes yet");
    expect(formatCollectionCount(1)).toBe("1 home");
    expect(formatCollectionCount(4)).toBe("4 homes");
  });
});
