/**
 * Waitlist survey contracts shared by the survey page, the submit route and the
 * database check constraints. Question wording lives in the labels so the page
 * and the database stay in agreement about the allowed values.
 */

export const WAITLIST_SURVEY_TIMELINES = [
  "asap",
  "next_3_months",
  "next_6_12_months",
  "just_exploring",
] as const;

export const WAITLIST_SURVEY_TIMELINE_LABELS: Record<
  (typeof WAITLIST_SURVEY_TIMELINES)[number],
  string
> = {
  asap: "As soon as possible",
  next_3_months: "In the next 3 months",
  next_6_12_months: "In 6 to 12 months",
  just_exploring: "Just exploring for now",
};

export const WAITLIST_SURVEY_USE_CASES = [
  "find_a_home",
  "compare_neighborhoods",
  "follow_listings",
  "share_with_partner",
] as const;

export const WAITLIST_SURVEY_USE_CASE_LABELS: Record<
  (typeof WAITLIST_SURVEY_USE_CASES)[number],
  string
> = {
  find_a_home: "Find a home",
  compare_neighborhoods: "Compare neighborhoods",
  follow_listings: "Follow listings over time",
  share_with_partner: "Share homes with someone",
};

export const WAITLIST_SURVEY_CONTACT_METHODS = ["email", "phone", "text"] as const;

export const WAITLIST_SURVEY_CONTACT_METHOD_LABELS: Record<
  (typeof WAITLIST_SURVEY_CONTACT_METHODS)[number],
  string
> = {
  email: "Email",
  phone: "Phone call",
  text: "Text message",
};

export const WAITLIST_SURVEY_INTERESTS = ["yes", "no", "maybe"] as const;

export const WAITLIST_SURVEY_INTEREST_LABELS: Record<
  (typeof WAITLIST_SURVEY_INTERESTS)[number],
  string
> = {
  yes: "Yes, I'm interested",
  no: "Not right now",
  maybe: "Maybe — tell me more",
};

export const WAITLIST_SURVEY_CREATOR_FOCUS = [
  "listing_videos",
  "neighborhood_content",
  "interior_design",
  "other",
] as const;

export const WAITLIST_SURVEY_CREATOR_FOCUS_LABELS: Record<
  (typeof WAITLIST_SURVEY_CREATOR_FOCUS)[number],
  string
> = {
  listing_videos: "Listing walkthrough videos",
  neighborhood_content: "Neighborhood and city content",
  interior_design: "Interior design and renovation",
  other: "Something else",
};

export const WAITLIST_SURVEY_NAME_MAX_LENGTH = 80;
export const WAITLIST_SURVEY_BROKERAGE_MAX_LENGTH = 120;
export const WAITLIST_SURVEY_REGION_MAX_LENGTH = 80;
export const WAITLIST_SURVEY_PHONE_MAX_LENGTH = 32;
export const WAITLIST_SURVEY_CHANNEL_MAX_LENGTH = 200;
export const WAITLIST_SURVEY_NOTES_MAX_LENGTH = 500;

export const WAITLIST_SURVEY_STAGE_TTL_SECONDS = 30 * 24 * 60 * 60;
export const WAITLIST_SURVEY_VERIFY_TTL_SECONDS = 60 * 60;
export const WAITLIST_SURVEY_TOKEN_MAX_LENGTH = 512;

/**
 * Stage tokens come from the join flow and only ever write unverified answers.
 * Verify tokens are minted by the private status page and may overwrite.
 */
export const WAITLIST_SURVEY_TOKEN_AUDIENCES = ["survey-stage", "survey-verify"] as const;

export type WaitlistSurveyAudience = (typeof WAITLIST_SURVEY_TOKEN_AUDIENCES)[number];
