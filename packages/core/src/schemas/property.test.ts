import { describe, expect, it } from "vitest";

import { PROPERTY_MAX_PHOTOS } from "../constants/property";
import { createPropertySchema, updatePropertySchema } from "./property";

const storagePath =
  "3f2b1c4d-0000-4000-8000-000000000001/9a7b6c5d-0000-4000-8000-000000000002.webp";

const validProperty = {
  title: "Sunlit two-bed by the park",
  description: "Quiet street, west-facing windows.",
  listingStatus: "for_sale" as const,
  priceCents: 68_500_000,
  currency: "USD",
  bedrooms: 2,
  bathrooms: 1.5,
  squareFeet: 980,
  propertyType: "condo" as const,
  neighborhood: "Juniper Heights",
  city: "Portland",
  state: "OR",
  postalCode: "97212",
  latitude: 45.55,
  longitude: -122.6,
  photos: [
    { storagePath, width: 1600, height: 1067, altText: "Living room with west light" },
  ],
};

describe("createPropertySchema", () => {
  it("accepts a complete property", () => {
    const result = createPropertySchema.safeParse(validProperty);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photos).toHaveLength(1);
      expect(result.data.priceCents).toBe(68_500_000);
    }
  });

  it("fills defaults for optional facts", () => {
    const minimal = {
      title: "A home",
      neighborhood: "Old Town",
      city: "Portland",
      photos: [{ storagePath }],
    };
    const result = createPropertySchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.listingStatus).toBe("unknown");
      expect(result.data.propertyType).toBe("house");
      expect(result.data.priceCents).toBeNull();
      expect(result.data.bedrooms).toBeNull();
      expect(result.data.currency).toBe("USD");
      expect(result.data.description).toBeUndefined();
    }
  });

  it.each([
    ["too short", "Ab"],
    ["too long", "A".repeat(121)],
    ["blank", "   "],
  ])("rejects a title that is %s", (_label, title) => {
    expect(createPropertySchema.safeParse({ ...validProperty, title }).success).toBe(false);
  });

  it("requires a neighborhood and a city", () => {
    expect(
      createPropertySchema.safeParse({ ...validProperty, neighborhood: "  " }).success,
    ).toBe(false);
    expect(createPropertySchema.safeParse({ ...validProperty, city: "" }).success).toBe(false);
  });

  it.each([
    ["negative", -1],
    ["fractional cents", 100.5],
    ["above the cap", 100_000_000_001],
  ])("rejects a price that is %s", (_label, priceCents) => {
    expect(createPropertySchema.safeParse({ ...validProperty, priceCents }).success).toBe(false);
  });

  it("accepts a null price", () => {
    expect(createPropertySchema.safeParse({ ...validProperty, priceCents: null }).success).toBe(
      true,
    );
  });

  it.each([
    ["bedrooms above the cap", { bedrooms: 51 }],
    ["negative bedrooms", { bedrooms: -1 }],
    ["bathrooms above the cap", { bathrooms: 51 }],
    ["negative bathrooms", { bathrooms: -0.5 }],
    ["fractional square feet", { squareFeet: 980.5 }],
    ["zero square feet", { squareFeet: 0 }],
    ["square feet above the cap", { squareFeet: 100_001 }],
  ])("rejects %s", (_label, override) => {
    expect(createPropertySchema.safeParse({ ...validProperty, ...override }).success).toBe(false);
  });

  it("rejects a malformed postal code", () => {
    expect(
      createPropertySchema.safeParse({ ...validProperty, postalCode: "!!" }).success,
    ).toBe(false);
  });

  it("accepts an empty postal code as not provided", () => {
    const result = createPropertySchema.safeParse({ ...validProperty, postalCode: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.postalCode).toBeUndefined();
  });

  it("requires coordinates to be paired", () => {
    expect(
      createPropertySchema.safeParse({ ...validProperty, latitude: 45.55, longitude: null }).success,
    ).toBe(false);
    expect(
      createPropertySchema.safeParse({ ...validProperty, latitude: null, longitude: -122.6 })
        .success,
    ).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      createPropertySchema.safeParse({ ...validProperty, latitude: 91, longitude: 0 }).success,
    ).toBe(false);
    expect(
      createPropertySchema.safeParse({ ...validProperty, latitude: 0, longitude: 181 }).success,
    ).toBe(false);
  });

  it("requires at least one photo", () => {
    expect(createPropertySchema.safeParse({ ...validProperty, photos: [] }).success).toBe(false);
  });

  it("caps the number of photos", () => {
    const photos = Array.from({ length: PROPERTY_MAX_PHOTOS + 1 }, (_, index) => ({
      storagePath: storagePath.replace(
        "9a7b6c5d-0000-4000-8000-000000000002",
        `9a7b6c5d-0000-4000-8000-00000000000${index}`,
      ),
    }));
    expect(createPropertySchema.safeParse({ ...validProperty, photos }).success).toBe(false);
  });

  it("rejects client-authored storage paths", () => {
    // A path outside the uploader's own prefix, or a made-up file name, is not a
    // valid reference: the server only accepts generated keys.
    expect(
      createPropertySchema.safeParse({
        ...validProperty,
        photos: [{ storagePath: "someone-else/photo.webp" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a photo path with a disallowed extension", () => {
    expect(
      createPropertySchema.safeParse({
        ...validProperty,
        photos: [{ storagePath: storagePath.replace(".webp", ".gif") }],
      }).success,
    ).toBe(false);
  });
});

describe("updatePropertySchema", () => {
  it("does not require photos when editing facts", () => {
    const { photos: _photos, ...fields } = validProperty;
    expect(updatePropertySchema.safeParse(fields).success).toBe(true);
  });

  it("still enforces ranges", () => {
    expect(updatePropertySchema.safeParse({ ...validProperty, bedrooms: 99 }).success).toBe(false);
  });
});
