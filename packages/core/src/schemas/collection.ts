import { z } from "zod";

import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
  COLLECTION_NOTE_MAX_LENGTH,
  COLLECTION_SHARE_SLUG_PATTERN,
} from "../constants/collection";

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, "Give the collection a name.")
  .max(
    COLLECTION_NAME_MAX_LENGTH,
    `Names are ${COLLECTION_NAME_MAX_LENGTH} characters or fewer.`,
  );

export const collectionDescriptionSchema = optionalText(
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  `Descriptions are ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
);

export const collectionNoteSchema = optionalText(
  COLLECTION_NOTE_MAX_LENGTH,
  `Notes are ${COLLECTION_NOTE_MAX_LENGTH} characters or fewer.`,
);

export const collectionShareSlugSchema = z
  .string()
  .regex(COLLECTION_SHARE_SLUG_PATTERN, "That collection link is not valid.");

export const createCollectionSchema = z.object({
  name: collectionNameSchema,
  description: collectionDescriptionSchema,
  isPublic: z.boolean().default(false),
});

export const updateCollectionSchema = z.object({
  name: collectionNameSchema,
  description: collectionDescriptionSchema,
  isPublic: z.boolean(),
});

/** Membership writes are owner-only; `addedBy` is set by the server. */
export const addCollectionItemSchema = z.object({
  collectionId: z.uuid("That collection link is not valid."),
  propertyId: z.uuid("That property link is not valid."),
  note: collectionNoteSchema,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;
