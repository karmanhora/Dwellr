import {
  isUuid,
  WAITLIST_REFERRAL_CODE_PATTERN,
  WAITLIST_STATUS_CODE_PATTERN,
} from "@hauscrawl/core";

import { createWaitlistAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type WaitlistStatus = {
  position: number | null;
  total: number | null;
  referral_count: number;
  tier: string | null;
};

export async function getWaitlistStatus(code: string): Promise<WaitlistStatus | null> {
  if (!WAITLIST_STATUS_CODE_PATTERN.test(code)) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_waitlist_status", { p_code: code });
    if (error) return null;
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Finds the signup behind an emailed status code so the status page can mint a
 * separate, short-lived survey capability. The status code itself is never put
 * in a survey URL. Service role only.
 */
export async function getWaitlistSurveySignupId(statusCode: string): Promise<string | null> {
  if (!WAITLIST_STATUS_CODE_PATTERN.test(statusCode)) return null;

  const admin = createWaitlistAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.rpc("waitlist_survey_signup_id", {
    p_status_code: statusCode,
  });
  if (error || typeof data !== "string") return null;

  return isUuid(data) ? data : null;
}

/** Reads the shareable referral code with the service role only. */
export async function getWaitlistReferralCode(statusCode: string): Promise<string | null> {
  if (!WAITLIST_STATUS_CODE_PATTERN.test(statusCode)) return null;

  const admin = createWaitlistAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.rpc("get_waitlist_referral_code", {
    p_status_code: statusCode,
  });
  if (error || typeof data !== "string") return null;

  return WAITLIST_REFERRAL_CODE_PATTERN.test(data) ? data : null;
}
