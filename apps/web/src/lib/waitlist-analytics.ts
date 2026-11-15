"use client";

type PostHogClient = typeof import("posthog-js")["default"];
type WaitlistEvent =
  | "waitlist_page_view"
  | "waitlist_form_start"
  | "waitlist_form_submit"
  | "waitlist_success"
  | "waitlist_referral_share_click";

let clientPromise: Promise<PostHogClient | null> | null = null;

function loadClient(): Promise<PostHogClient | null> {
  if (clientPromise) return clientPromise;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }

  clientPromise = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        cookieless_mode: "always",
        persistence: "memory",
        disable_persistence: true,
        disable_session_recording: true,
        person_profiles: "identified_only",
        cross_subdomain_cookie: false,
        disable_surveys: true,
        advanced_disable_feature_flags: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
      });

      return posthog;
    })
    .catch(() => null);

  return clientPromise;
}

/**
 * Only the five product events we need. Form contents and identifiers are
 * deliberately not accepted here.
 */
export function trackWaitlistEvent(
  event: WaitlistEvent,
  properties: Record<string, string | number | boolean> = {},
): void {
  void loadClient()
    .then((client) => {
      client?.capture(event, { surface: "waitlist", ...properties });
    })
    .catch(() => {
      // Analytics is best-effort and must never block the form.
    });
}
