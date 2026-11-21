import { z } from "zod";

import { WAITLIST_ROLES, WAITLIST_SEARCHING_WITH } from "../constants/waitlist";
import {
  WAITLIST_SURVEY_BROKERAGE_MAX_LENGTH,
  WAITLIST_SURVEY_CHANNEL_MAX_LENGTH,
  WAITLIST_SURVEY_CONTACT_METHODS,
  WAITLIST_SURVEY_CREATOR_FOCUS,
  WAITLIST_SURVEY_INTERESTS,
  WAITLIST_SURVEY_NAME_MAX_LENGTH,
  WAITLIST_SURVEY_NOTES_MAX_LENGTH,
  WAITLIST_SURVEY_PHONE_MAX_LENGTH,
  WAITLIST_SURVEY_REGION_MAX_LENGTH,
  WAITLIST_SURVEY_TIMELINES,
  WAITLIST_SURVEY_TOKEN_MAX_LENGTH,
  WAITLIST_SURVEY_USE_CASES,
} from "../constants/waitlist-survey";

function optionalLine(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine(
      (value) => value === undefined || !/[\r\n]/.test(value),
      "Use a single line without line breaks.",
    );
}

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

/**
 * A survey submission. Only the role is required: it is the routing question,
 * and an abandoned survey must still be able to save what the person answered.
 */
export const waitlistSurveyAnswersSchema = z.object({
  role: z.enum(WAITLIST_ROLES),
  searchingWith: z.enum(WAITLIST_SEARCHING_WITH).optional(),
  region: optionalLine(
    WAITLIST_SURVEY_REGION_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_REGION_MAX_LENGTH} characters or fewer for a city or region.`,
  ),
  timeline: z.enum(WAITLIST_SURVEY_TIMELINES).optional(),
  useCase: z.enum(WAITLIST_SURVEY_USE_CASES).optional(),
  displayName: optionalLine(
    WAITLIST_SURVEY_NAME_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_NAME_MAX_LENGTH} characters or fewer for a name.`,
  ),
  brokerage: optionalLine(
    WAITLIST_SURVEY_BROKERAGE_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_BROKERAGE_MAX_LENGTH} characters or fewer for a brokerage.`,
  ),
  workRegion: optionalLine(
    WAITLIST_SURVEY_REGION_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_REGION_MAX_LENGTH} characters or fewer for a city or region.`,
  ),
  contactMethod: z.enum(WAITLIST_SURVEY_CONTACT_METHODS).optional(),
  phone: optionalLine(
    WAITLIST_SURVEY_PHONE_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_PHONE_MAX_LENGTH} characters or fewer for a phone number.`,
  ),
  promoInterest: z.enum(WAITLIST_SURVEY_INTERESTS).optional(),
  creatorFocus: z.enum(WAITLIST_SURVEY_CREATOR_FOCUS).optional(),
  creatorChannel: optionalLine(
    WAITLIST_SURVEY_CHANNEL_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_CHANNEL_MAX_LENGTH} characters or fewer for a handle or link.`,
  ),
  notes: optionalText(
    WAITLIST_SURVEY_NOTES_MAX_LENGTH,
    `Use ${WAITLIST_SURVEY_NOTES_MAX_LENGTH} characters or fewer.`,
  ),
});

export type WaitlistSurveyAnswers = z.infer<typeof waitlistSurveyAnswersSchema>;

/** The request body for POST /api/waitlist/survey. */
export const waitlistSurveySubmissionSchema = z.object({
  ref: z.string().trim().min(1).max(WAITLIST_SURVEY_TOKEN_MAX_LENGTH),
  answers: waitlistSurveyAnswersSchema,
});

