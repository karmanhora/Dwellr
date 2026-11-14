import { describe, expect, it } from "vitest";

import {
  collectionEvaluationSchema,
  createCollectionInviteLinkSchema,
  createCollectionInviteSchema,
} from "./collection";

const collectionId = "0d1f4b0a-1111-4000-8000-000000000001";
const propertyId = "0d1f4b0a-1111-4000-8000-000000000002";

describe("createCollectionInviteSchema", () => {
  it("defaults to a seven-day, single-use viewer invite", () => {
    const result = createCollectionInviteSchema.safeParse({
      collectionId,
      username: "  Mina_1 ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("mina_1");
      expect(result.data.role).toBe("viewer");
      expect(result.data.expiresInDays).toBe(7);
      expect(result.data.maxUses).toBe(1);
    }
  });

  it("rejects an owner invite role", () => {
    expect(
      createCollectionInviteSchema.safeParse({
        collectionId,
        username: "mina",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("rejects an invite longer than 30 days or with too many uses", () => {
    expect(
      createCollectionInviteSchema.safeParse({
        collectionId,
        username: "mina",
        expiresInDays: 31,
      }).success,
    ).toBe(false);
    expect(
      createCollectionInviteSchema.safeParse({
        collectionId,
        username: "mina",
        maxUses: 51,
      }).success,
    ).toBe(false);
  });
});

describe("createCollectionInviteLinkSchema", () => {
  it("accepts a multi-use editor link", () => {
    const result = createCollectionInviteLinkSchema.safeParse({
      collectionId,
      role: "editor",
      maxUses: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.maxUses).toBe(10);
  });
});

describe("collectionEvaluationSchema", () => {
  it("coerces a form rating and trims tags", () => {
    const result = collectionEvaluationSchema.safeParse({
      collectionId,
      propertyId,
      rating: "4",
      note: "  Great light.  ",
      pros: [" light "],
      cons: [" street noise "],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBe(4);
      expect(result.data.note).toBe("Great light.");
      expect(result.data.pros).toEqual(["light"]);
    }
  });

  it("rejects ratings outside 1–5 and more than six tags", () => {
    for (const rating of [0, 6, 2.5]) {
      expect(
        collectionEvaluationSchema.safeParse({ collectionId, propertyId, rating }).success,
      ).toBe(false);
    }

    expect(
      collectionEvaluationSchema.safeParse({
        collectionId,
        propertyId,
        rating: 3,
        pros: ["a", "b", "c", "d", "e", "f", "g"],
      }).success,
    ).toBe(false);
  });

  it("caps notes at 500 characters", () => {
    expect(
      collectionEvaluationSchema.safeParse({
        collectionId,
        propertyId,
        rating: 3,
        note: "a".repeat(501),
      }).success,
    ).toBe(false);
  });
});
