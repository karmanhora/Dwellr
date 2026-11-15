/** Waitlist contracts shared by the form, API route and database checks. */

export const WAITLIST_EMAIL_MAX_LENGTH = 254;
export const WAITLIST_REGION_MAX_LENGTH = 80;
export const WAITLIST_UTM_MAX_LENGTH = 200;
export const WAITLIST_REFERRER_MAX_LENGTH = 500;
export const WAITLIST_REFERRAL_CODE_LENGTH = 10;
export const WAITLIST_REFERRAL_CODE_PATTERN = /^[a-z0-9]{10}$/;
export const WAITLIST_COUNT_VISIBILITY_THRESHOLD = 25;
export const WAITLIST_IP_HASH_PATTERN = /^[0-9a-f]{64}$/;

export const WAITLIST_ROLES = [
  "planning_next_12_months",
  "actively_looking",
  "just_browsing",
  "agent_or_broker",
  "creator",
] as const;

export const WAITLIST_ROLE_LABELS: Record<(typeof WAITLIST_ROLES)[number], string> = {
  planning_next_12_months: "Planning to buy in the next 12 months",
  actively_looking: "Actively looking",
  just_browsing: "Just browsing",
  agent_or_broker: "Agent or broker",
  creator: "Creator",
};

export const WAITLIST_SEARCHING_WITH = ["on_my_own", "partner", "family_or_friends"] as const;

export const WAITLIST_SEARCHING_WITH_LABELS: Record<
  (typeof WAITLIST_SEARCHING_WITH)[number],
  string
> = {
  on_my_own: "On my own",
  partner: "Partner",
  family_or_friends: "Family or friends",
};
