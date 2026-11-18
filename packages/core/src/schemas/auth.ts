import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../constants/validation";
import { displayNameSchema, usernameSchema } from "./profile";

/**
 * Email is normalized (trimmed + lowercased) before validation so that
 * "Karman@Example.com " and "karman@example.com" are the same account.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`)
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // Same rules as the profile contract, so the two can never drift.
  username: usernameSchema,
  displayName: displayNameSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
