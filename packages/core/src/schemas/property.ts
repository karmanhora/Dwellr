import { z } from "zod";

import {
  LISTING_STATUSES,
  PROPERTY_CITY_MAX_LENGTH,
  PROPERTY_DESCRIPTION_MAX_LENGTH,
  PROPERTY_MAX_BATHROOMS,
  PROPERTY_MAX_BEDROOMS,
  PROPERTY_MAX_PHOTOS,
  PROPERTY_MAX_PRICE_CENTS,
  PROPERTY_MAX_SQUARE_FEET,
  PROPERTY_MIN_PRICE_CENTS,
  PROPERTY_MIN_SQUARE_FEET,
  PROPERTY_NEIGHBORHOOD_MAX_LENGTH,
  PROPERTY_PHOTO_ALT_MAX_LENGTH,
  PROPERTY_PHOTO_MAX_DIMENSION,
  PROPERTY_POSTAL_CODE_MAX_LENGTH,
  PROPERTY_STATE_MAX_LENGTH,
  PROPERTY_TITLE_MAX_LENGTH,
  PROPERTY_TITLE_MIN_LENGTH,
  PROPERTY_TYPES,
} from "../constants/property";

export const listingStatusSchema = z.enum(LISTING_STATUSES);
export const propertyTypeSchema = z.enum(PROPERTY_TYPES);

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const propertyTitleSchema = z
  .string()
  .trim()
  .min(PROPERTY_TITLE_MIN_LENGTH, `Titles need at least ${PROPERTY_TITLE_MIN_LENGTH} characters.`)
  .max(PROPERTY_TITLE_MAX_LENGTH, `Titles are ${PROPERTY_TITLE_MAX_LENGTH} characters or fewer.`);

export const propertyDescriptionSchema = optionalText(
  PROPERTY_DESCRIPTION_MAX_LENGTH,
  `Descriptions are ${PROPERTY_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
);

export const neighborhoodSchema = z
  .string()
  .trim()
  .min(1, "Add a neighborhood.")
  .max(PROPERTY_NEIGHBORHOOD_MAX_LENGTH, `Neighborhoods are ${PROPERTY_NEIGHBORHOOD_MAX_LENGTH} characters or fewer.`);

export const citySchema = z
  .string()
  .trim()
  .min(1, "Add a city.")
  .max(PROPERTY_CITY_MAX_LENGTH, `Cities are ${PROPERTY_CITY_MAX_LENGTH} characters or fewer.`);

export const stateSchema = optionalText(
  PROPERTY_STATE_MAX_LENGTH,
  `States are ${PROPERTY_STATE_MAX_LENGTH} characters or fewer.`,
);

export const postalCodeSchema = z
  .string()
  .trim()
  .max(PROPERTY_POSTAL_CODE_MAX_LENGTH, "That postal code is too long.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => value === undefined || /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/.test(value),
    "Enter a valid postal code.",
  );

export const priceCentsSchema = z
  .number()
  .int("Prices are entered in whole cents.")
  .min(PROPERTY_MIN_PRICE_CENTS, "Price cannot be negative.")
  .max(PROPERTY_MAX_PRICE_CENTS, "That price is too high.")
  .nullable();

export const bedroomsSchema = z
  .number()
  .min(0, "Bedrooms cannot be negative.")
  .max(PROPERTY_MAX_BEDROOMS, `Bedrooms are capped at ${PROPERTY_MAX_BEDROOMS}.`)
  .nullable();

export const bathroomsSchema = z
  .number()
  .min(0, "Bathrooms cannot be negative.")
  .max(PROPERTY_MAX_BATHROOMS, `Bathrooms are capped at ${PROPERTY_MAX_BATHROOMS}.`)
  .nullable();

export const squareFeetSchema = z
  .number()
  .int("Square feet must be a whole number.")
  .min(PROPERTY_MIN_SQUARE_FEET, "Square feet must be at least 1.")
  .max(PROPERTY_MAX_SQUARE_FEET, `Square feet are capped at ${PROPERTY_MAX_SQUARE_FEET}.`)
  .nullable();

export const latitudeSchema = z.number().min(-90).max(90).nullable();
export const longitudeSchema = z.number().min(-180).max(180).nullable();

/** Storage keys are generated server-side from the uploader's id and a UUID. */
export const photoStoragePathSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i,
    "That photo reference is not valid.",
  );

export const propertyPhotoInputSchema = z.object({
  storagePath: photoStoragePathSchema,
  altText: optionalText(
    PROPERTY_PHOTO_ALT_MAX_LENGTH,
    `Alt text is ${PROPERTY_PHOTO_ALT_MAX_LENGTH} characters or fewer.`,
  ),
  width: z.number().int().min(1).max(PROPERTY_PHOTO_MAX_DIMENSION).optional(),
  height: z.number().int().min(1).max(PROPERTY_PHOTO_MAX_DIMENSION).optional(),
});

/** Everything a poster can write. Photos are uploaded separately, then linked. */
export const propertyFieldsSchema = z.object({
  title: propertyTitleSchema,
  description: propertyDescriptionSchema,
  listingStatus: listingStatusSchema.default("unknown"),
  priceCents: priceCentsSchema.default(null),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code.").default("USD"),
  bedrooms: bedroomsSchema.default(null),
  bathrooms: bathroomsSchema.default(null),
  squareFeet: squareFeetSchema.default(null),
  propertyType: propertyTypeSchema.default("house"),
  neighborhood: neighborhoodSchema,
  city: citySchema,
  state: stateSchema,
  postalCode: postalCodeSchema,
  latitude: latitudeSchema.default(null),
  longitude: longitudeSchema.default(null),
});

const coordinatesArePaired = (value: { latitude: number | null; longitude: number | null }) =>
  (value.latitude === null) === (value.longitude === null);

export const createPropertySchema = propertyFieldsSchema
  .extend({
    photos: z
      .array(propertyPhotoInputSchema)
      .min(1, "Add at least one photo.")
      .max(PROPERTY_MAX_PHOTOS, `Add at most ${PROPERTY_MAX_PHOTOS} photos.`),
  })
  .refine(coordinatesArePaired, {
    message: "Add both coordinates or neither.",
    path: ["latitude"],
  });

export const updatePropertySchema = propertyFieldsSchema.refine(coordinatesArePaired, {
  message: "Add both coordinates or neither.",
  path: ["latitude"],
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyPhotoInput = z.infer<typeof propertyPhotoInputSchema>;
