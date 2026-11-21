import type { WaitlistSurveyAnswers } from "../schemas/waitlist-survey";

/**
 * Structural shape shared by validated answers and callers that only filled in
 * some questions. Optional fields are genuinely optional: an unanswered
 * question maps to null rather than a guess.
 */
export interface WaitlistSurveyAnswerFields {
  role: WaitlistSurveyAnswers["role"];
  searchingWith?: string | undefined;
  region?: string | undefined;
  timeline?: string | undefined;
  useCase?: string | undefined;
  displayName?: string | undefined;
  brokerage?: string | undefined;
  workRegion?: string | undefined;
  contactMethod?: string | undefined;
  phone?: string | undefined;
  promoInterest?: string | undefined;
  creatorFocus?: string | undefined;
  creatorChannel?: string | undefined;
  notes?: string | undefined;
}

/**
 * Maps validated survey answers to the snake_case payload the
 * security-definer RPCs accept. Missing answers stay null so the database
 * constraints, not the client, decide what is stored.
 */
export function toWaitlistSurveyAnswersPayload(answers: WaitlistSurveyAnswerFields) {
  return {
    role: answers.role,
    searching_with: answers.searchingWith ?? null,
    region: answers.region ?? null,
    timeline: answers.timeline ?? null,
    use_case: answers.useCase ?? null,
    display_name: answers.displayName ?? null,
    brokerage: answers.brokerage ?? null,
    work_region: answers.workRegion ?? null,
    contact_method: answers.contactMethod ?? null,
    phone: answers.phone ?? null,
    promo_interest: answers.promoInterest ?? null,
    creator_focus: answers.creatorFocus ?? null,
    creator_channel: answers.creatorChannel ?? null,
    notes: answers.notes ?? null,
  };
}

/** Branch routing shared by the page and tests: the role picks the questions. */
export function waitlistSurveyBranch(
  role: WaitlistSurveyAnswers["role"],
): "hunter" | "agent" | "creator" {
  if (role === "agent_or_broker") return "agent";
  if (role === "creator") return "creator";
  return "hunter";
}
