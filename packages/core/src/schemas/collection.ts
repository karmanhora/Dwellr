import { z } from "zod";

import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_EVALUATION_MAX_TAGS,
  COLLECTION_EVALUATION_NOTE_MAX_LENGTH,
  COLLECTION_EVALUATION_TAG_MAX_LENGTH,
  COLLECTION_INVITE_DEFAULT_DAYS,
  COLLECTION_INVITE_MAX_DAYS,
  COLLECTION_INVITE_MAX_USES,
  COLLECTION_INVITE_ROLES,
  COLLECTION_NAME_MAX_LENGTH,
  COLLECTION_NOTE_MAX_LENGTH,
  COLLECTION_SHARE_SLUG_PATTERN,
} from "../constants/collection";
import { usernameSchema } from "./profile";

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

export const collectionRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const collectionInviteRoleSchema = z.enum(COLLECTION_INVITE_ROLES);

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

const inviteExpirySchema = z.coerce
  .number()
  .int()
  .min(1, "Invites must last at least one day.")
  .max(COLLECTION_INVITE_MAX_DAYS, `Invites last at most ${COLLECTION_INVITE_MAX_DAYS} days.`)
  .default(COLLECTION_INVITE_DEFAULT_DAYS);

const inviteUsesSchema = z.coerce
  .number()
  .int()
  .min(1, "An invite needs at least one use.")
  .max(COLLECTION_INVITE_MAX_USES, `Invites allow at most ${COLLECTION_INVITE_MAX_USES} uses.`)
  .default(1);

export const createCollectionInviteSchema = z.object({
  collectionId: z.uuid("That collection link is not valid."),
  username: usernameSchema,
  role: collectionInviteRoleSchema.default("viewer"),
  expiresInDays: inviteExpirySchema,
  maxUses: inviteUsesSchema,
});

export const createCollectionInviteLinkSchema = z.object({
  collectionId: z.uuid("That collection link is not valid."),
  role: collectionInviteRoleSchema.default("viewer"),
  expiresInDays: inviteExpirySchema,
  maxUses: inviteUsesSchema,
});

const evaluationTagSchema = z
  .string()
  .trim()
  .min(1, "Tags cannot be empty.")
  .max(
    COLLECTION_EVALUATION_TAG_MAX_LENGTH,
    `Tags are ${COLLECTION_EVALUATION_TAG_MAX_LENGTH} characters or fewer.`,
  );

export const collectionEvaluationSchema = z.object({
  collectionId: z.uuid("That collection link is not valid."),
  propertyId: z.uuid("That home link is not valid."),
  rating: z.coerce
    .number()
    .int("Choose a whole rating.")
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  note: z
    .string()
    .trim()
    .max(
      COLLECTION_EVALUATION_NOTE_MAX_LENGTH,
      `Evaluation notes are ${COLLECTION_EVALUATION_NOTE_MAX_LENGTH} characters or fewer.`,
    )
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  pros: z
    .array(evaluationTagSchema)
    .max(COLLECTION_EVALUATION_MAX_TAGS, `Add at most ${COLLECTION_EVALUATION_MAX_TAGS} pros.`)
    .default([]),
  cons: z
    .array(evaluationTagSchema)
    .max(COLLECTION_EVALUATION_MAX_TAGS, `Add at most ${COLLECTION_EVALUATION_MAX_TAGS} cons.`)
    .default([]),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;
export type CreateCollectionInviteInput = z.infer<typeof createCollectionInviteSchema>;
export type CreateCollectionInviteLinkInput = z.infer<typeof createCollectionInviteLinkSchema>;
export type CollectionEvaluationInput = z.infer<typeof collectionEvaluationSchema>;
