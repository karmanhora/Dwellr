import { describe, expect, it } from "vitest";

import { createCollectionSchema, updateCollectionSchema, addCollectionItemSchema } from "./collection";

const collectionId = "0d1f4b0a-1111-4000-8000-000000000001";
const propertyId = "0d1f4b0a-1111-4000-8000-000000000002";

describe("createCollectionSchema", () => {
  it("accepts a name only and defaults to private", () => {
    const result = createCollectionSchema.safeParse({ name: "  Weekend tours  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Weekend tours");
      expect(result.data.isPublic).toBe(false);
      expect(result.data.description).toBeUndefined();
    }
  });

  it("rejects a blank name", () => {
    expect(createCollectionSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name over 60 characters", () => {
    expect(createCollectionSchema.safeParse({ name: "a".repeat(61) }).success).toBe(false);
  });

  it("rejects a description over 500 characters", () => {
    expect(
      createCollectionSchema.safeParse({ name: "List", description: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("treats an empty description as absent", () => {
    const result = createCollectionSchema.safeParse({ name: "List", description: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it("accepts public collections", () => {
    const result = createCollectionSchema.safeParse({ name: "Shared", isPublic: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPublic).toBe(true);
  });
});

describe("updateCollectionSchema", () => {
  it("requires an explicit visibility decision on update", () => {
    expect(updateCollectionSchema.safeParse({ name: "List" }).success).toBe(false);
    expect(updateCollectionSchema.safeParse({ name: "List", isPublic: true }).success).toBe(true);
  });
});

describe("addCollectionItemSchema", () => {
  it("accepts a valid collection and property", () => {
    const result = addCollectionItemSchema.safeParse({ collectionId, propertyId });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID ids", () => {
    expect(
      addCollectionItemSchema.safeParse({ collectionId: "not-a-uuid", propertyId }).success,
    ).toBe(false);
  });

  it("rejects a note over 500 characters", () => {
    expect(
      addCollectionItemSchema.safeParse({ collectionId, propertyId, note: "a".repeat(501) }).success,
    ).toBe(false);
  });
});
