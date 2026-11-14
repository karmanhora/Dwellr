import { z } from "zod";

import {
  AVATAR_URL_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "../constants/validation";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Trims, lowercases, validates the shape, then rejects reserved names. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, `Use at least ${USERNAME_MIN_LENGTH} characters.`)
  .max(USERNAME_MAX_LENGTH, `Usernames are ${USERNAME_MAX_LENGTH} characters or fewer.`)
  .regex(USERNAME_PATTERN, "Use lowercase letters, numbers, and underscores.")
  .refine((value) => !RESERVED_USERNAMES.has(value), "That username is reserved.");

export const displayNameSchema = z
  .string()
  .trim()
  .max(DISPLAY_NAME_MAX_LENGTH, `Display names are ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const bioSchema = z
  .string()
  .trim()
  .max(BIO_MAX_LENGTH, `Bios are ${BIO_MAX_LENGTH} characters or fewer.`)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const avatarUrlSchema = z
  .string()
  .trim()
  .max(AVATAR_URL_MAX_LENGTH, "That URL is too long.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => value === undefined || isHttpUrl(value), "Enter a valid http or https URL.");

/**
 * Only the owner can update their profile (enforced by RLS); this schema is
 * the shared contract for that write.
 */
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: displayNameSchema,
  bio: bioSchema,
  avatarUrl: avatarUrlSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
