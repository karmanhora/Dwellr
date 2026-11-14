import { z } from "zod";

import {
  COMMENT_MAX_LENGTH,
  FEED_NEIGHBORHOOD_MAX,
  FEED_STYLE_MAX,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  SOCIAL_TARGET_TYPES,
} from "../constants/social";
import { propertyTypeSchema } from "./property";

export const socialTargetTypeSchema = z.enum(SOCIAL_TARGET_TYPES);
export const reportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);
export const reportReasonSchema = z.enum(REPORT_REASONS);

export const commentSchema = z.object({
  targetType: socialTargetTypeSchema,
  targetId: z.uuid("That content link is not valid."),
  parentId: z
    .union([z.uuid("That reply link is not valid."), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(COMMENT_MAX_LENGTH, `Comments are ${COMMENT_MAX_LENGTH} characters or fewer.`),
});

export const reportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.uuid("That content link is not valid."),
  reason: reportReasonSchema,
  details: z
    .string()
    .trim()
    .max(REPORT_DETAILS_MAX_LENGTH, `Details are ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const feedPreferencesSchema = z.object({
  neighborhoods: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Neighborhoods cannot be empty.")
        .max(80, "Neighborhoods are 80 characters or fewer."),
    )
    .max(FEED_NEIGHBORHOOD_MAX, `Choose at most ${FEED_NEIGHBORHOOD_MAX} neighborhoods.`)
    .default([]),
  propertyTypes: z
    .array(propertyTypeSchema)
    .max(FEED_STYLE_MAX, `Choose at most ${FEED_STYLE_MAX} home styles.`)
    .default([]),
});

export type CommentInput = z.infer<typeof commentSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type FeedPreferencesInput = z.infer<typeof feedPreferencesSchema>;
