import { describe, expect, it } from "vitest";

import type { CollectionEvaluation } from "../types/collection";
import type { PropertySummary } from "../types/property";
import {
  averageRating,
  canContribute,
  collectionRoleLabel,
  parseTagList,
  summarizeCollectionComparison,
} from "./collection";

const home: PropertySummary = {
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

function evaluation(userId: string, rating: number): CollectionEvaluation {
  return {
    propertyId: home.id,
    userId,
    rating,
    note: null,
    pros: [],
    cons: [],
    updatedAt: "2026-11-15T10:00:00.000Z",
  };
}

describe("collection roles", () => {
  it("lets owners and editors contribute, not viewers", () => {
    expect(canContribute("owner")).toBe(true);
    expect(canContribute("editor")).toBe(true);
    expect(canContribute("viewer")).toBe(false);
    expect(canContribute(null)).toBe(false);
  });

  it("labels roles", () => {
    expect(collectionRoleLabel("owner")).toBe("Owner");
    expect(collectionRoleLabel("editor")).toBe("Editor");
    expect(collectionRoleLabel("viewer")).toBe("Viewer");
  });
});

describe("evaluation tags", () => {
  it("trims, deduplicates and caps tags", () => {
    expect(parseTagList(" light, garden, light, , quiet ")).toEqual(["light", "garden", "quiet"]);
    expect(parseTagList("a,b,c,d,e,f,g")).toHaveLength(6);
  });

  it("averages ratings to one decimal", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([4, 5, 4])).toBe(4.3);
  });
});

describe("summarizeCollectionComparison", () => {
  it("marks a home as liked by everyone only when every member rated it 4+", () => {
    const result = summarizeCollectionComparison(
      [{ property: home, evaluations: [evaluation("a", 5), evaluation("b", 4)] }],
      ["a", "b"],
    );
    expect(result.homes[0]?.everyoneLikes).toBe(true);
    expect(result.everyoneLikesCount).toBe(1);
  });

  it("does not treat a missing rating as agreement", () => {
    const result = summarizeCollectionComparison(
      [{ property: home, evaluations: [evaluation("a", 5)] }],
      ["a", "b"],
    );
    expect(result.homes[0]?.everyoneLikes).toBe(false);
  });

  it("flags a two-point spread as a disagreement", () => {
    const result = summarizeCollectionComparison(
      [{ property: home, evaluations: [evaluation("a", 5), evaluation("b", 3)] }],
      ["a", "b"],
    );
    expect(result.homes[0]?.disagreement).toBe(true);
    expect(result.disagreementCount).toBe(1);
  });

  it("keeps a one-point spread out of disagreements", () => {
    const result = summarizeCollectionComparison(
      [{ property: home, evaluations: [evaluation("a", 5), evaluation("b", 4)] }],
      ["a", "b"],
    );
    expect(result.homes[0]?.disagreement).toBe(false);
  });
});
