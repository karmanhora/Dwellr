"use client";

import posthog from "posthog-js";

type WaitlistEvent =
  | "waitlist_page_view"
  | "waitlist_form_start"
  | "waitlist_form_submit"
  | "waitlist_success"
  | "waitlist_referral_share_click"
  | "waitlist_survey_view"
  | "waitlist_survey_submit"
  | "waitlist_survey_skip";

/**
 * Only the product events we need. Form contents and identifiers are
 * deliberately not accepted here.
 */
export function trackWaitlistEvent(
  event: WaitlistEvent,
  properties: Record<string, string | number | boolean> = {},
): void {
  posthog.capture(event, { surface: "waitlist", ...properties });
}
