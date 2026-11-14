import { describe, expect, it } from "vitest";

import { commentSchema, feedPreferencesSchema, reportSchema } from "./social";

const propertyId = "0d1f4b0a-1111-4000-8000-000000000001";
const commentId = "0d1f4b0a-1111-4000-8000-000000000002";

describe("commentSchema", () => {
  it("accepts a property comment and treats a blank parent as absent", () => {
    const result = commentSchema.safeParse({
      targetType: "property",
      targetId: propertyId,
      parentId: "",
      body: "  The light in the kitchen is lovely.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toBe("The light in the kitchen is lovely.");
      expect(result.data.parentId).toBeUndefined();
    }
  });

  it("accepts a one-level reply", () => {
    const result = commentSchema.safeParse({
      targetType: "property",
      targetId: propertyId,
      parentId: commentId,
      body: "Agreed.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects blank and overlong comments", () => {
    expect(
      commentSchema.safeParse({ targetType: "property", targetId: propertyId, body: "   " })
        .success,
    ).toBe(false);
    expect(
      commentSchema.safeParse({
        targetType: "property",
        targetId: propertyId,
        body: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("reportSchema", () => {
  it("accepts a valid reason and optional details", () => {
    const result = reportSchema.safeParse({
      targetType: "comment",
      targetId: commentId,
      reason: "harassment",
      details: "Repeated personal attacks.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown reason and non-UUID target", () => {
    expect(
      reportSchema.safeParse({ targetType: "property", targetId: propertyId, reason: "boring" })
        .success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({ targetType: "profile", targetId: "nope", reason: "spam" }).success,
    ).toBe(false);
  });

  it("caps details at 1000 characters", () => {
    expect(
      reportSchema.safeParse({
        targetType: "property",
        targetId: propertyId,
        reason: "spam",
        details: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("feedPreferencesSchema", () => {
  it("defaults to empty preferences", () => {
    const result = feedPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.neighborhoods).toEqual([]);
      expect(result.data.propertyTypes).toEqual([]);
    }
  });

  it("accepts explicit neighborhoods and styles", () => {
    const result = feedPreferencesSchema.safeParse({
      neighborhoods: ["Juniper Heights", "Alberta Arts"],
      propertyTypes: ["house", "condo"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects too many neighborhoods or styles", () => {
    expect(
      feedPreferencesSchema.safeParse({
        neighborhoods: Array.from({ length: 11 }, (_, index) => `Area ${index}`),
      }).success,
    ).toBe(false);
    expect(
      feedPreferencesSchema.safeParse({
        propertyTypes: [
          "house",
          "condo",
          "apartment",
          "townhouse",
          "multi_family",
          "land",
          "other",
          "house",
          "condo",
          "apartment",
          "townhouse",
        ],
      }).success,
    ).toBe(false);
  });
});
