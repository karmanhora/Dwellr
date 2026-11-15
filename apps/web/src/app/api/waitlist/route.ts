import {
  createReferralCode,
  WAITLIST_IP_HASH_PATTERN,
  WAITLIST_REFERRAL_CODE_PATTERN,
  waitlistShareUrl,
  waitlistSignupSchema,
} from "@dwellr/core";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  createUnsubscribeToken,
  emailNotificationsEnabled,
  getClientIp,
  hashIp,
  hashUnsubscribeToken,
  sendWaitlistWelcomeEmail,
} from "@/lib/waitlist-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_192;
const NO_STORE = { "Cache-Control": "no-store" };

type SignupResult = { ok?: boolean; referral_code?: string };

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: NO_STORE });
}

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

function readReferralCode(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as SignupResult;
  if (result.ok !== true || typeof result.referral_code !== "string") return null;
  return WAITLIST_REFERRAL_CODE_PATTERN.test(result.referral_code)
    ? result.referral_code
    : null;
}

function resolveSiteUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured && configured.length > 0 ? configured : new URL(request.url).origin).replace(
    /\/$/,
    "",
  );
}

function successResponse(referralCode: string, siteUrl: string) {
  return NextResponse.json(
    {
      ok: true,
      // The body deliberately contains nothing about whether the address was
      // new. New and duplicate signups get the same shape.
      referralCode,
      shareUrl: waitlistShareUrl(siteUrl, referralCode),
    },
    { headers: NO_STORE },
  );
}

function parseSignup(body: Record<string, unknown>) {
  const parsed = waitlistSignupSchema.safeParse({
    email: readString(body, "email"),
    role: readString(body, "role") || undefined,
    searchingWith: readString(body, "searchingWith") || undefined,
    region: readString(body, "region") || undefined,
    utmSource: readString(body, "utmSource") || undefined,
    utmMedium: readString(body, "utmMedium") || undefined,
    utmCampaign: readString(body, "utmCampaign") || undefined,
    referrer: readString(body, "referrer") || undefined,
    ref: readString(body, "ref") || undefined,
  });

  return parsed;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return jsonError(413, "That request is too large.");
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError(400, "Check your details and try again.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(400, "Check your details and try again.");
  }

  const siteUrl = resolveSiteUrl(request);

  // A filled hidden field means a bot. Return the normal success shape without
  // writing anything, so the bot has no signal that it was caught.
  const honeypot = readString(body, "website");
  if (honeypot && honeypot.trim().length > 0) {
    return successResponse(createReferralCode(), siteUrl);
  }

  const parsed = parseSignup(body);
  if (!parsed.success) {
    return jsonError(400, "Enter a valid email address and try again.");
  }

  const input = parsed.data;

  let ipHash: string;
  try {
    ipHash = hashIp(getClientIp(request.headers));
  } catch {
    console.error("[waitlist] IP hashing is not configured.");
    return jsonError(503, "The waitlist is temporarily unavailable. Try again later.");
  }

  if (!WAITLIST_IP_HASH_PATTERN.test(ipHash)) {
    return jsonError(500, "The waitlist is temporarily unavailable. Try again later.");
  }

  const unsubscribeToken = createUnsubscribeToken(input.email);
  const unsubscribeHash = unsubscribeToken
    ? hashUnsubscribeToken(unsubscribeToken)
    : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_waitlist", {
    p_email: input.email,
    p_role: input.role ?? null,
    p_searching_with: input.searchingWith ?? null,
    p_region: input.region ?? null,
    p_utm_source: input.utmSource ?? null,
    p_utm_medium: input.utmMedium ?? null,
    p_utm_campaign: input.utmCampaign ?? null,
    p_referrer: input.referrer ?? null,
    p_referral_code: input.ref ?? null,
    p_ip_hash: ipHash,
    p_unsubscribe_token_hash: unsubscribeHash,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate_limited")) {
      return jsonError(429, "Too many signups from this connection. Try again later.");
    }
    if (message.includes("invalid_input")) {
      return jsonError(400, "Check your email and try again.");
    }

    // Never surface database details or a stack trace to the browser.
    console.error("[waitlist] join failed:", error.code ?? "unknown");
    return jsonError(500, "We couldn't add you just now. Try again.");
  }

  const referralCode = readReferralCode(data);
  if (!referralCode) {
    console.error("[waitlist] join returned an unexpected result.");
    return jsonError(500, "We couldn't add you just now. Try again.");
  }

  // The claim is one-time per token, so duplicate submits do not resend email.
  if (emailNotificationsEnabled() && unsubscribeToken && unsubscribeHash) {
    const { data: claimed } = await supabase.rpc("claim_waitlist_notification", {
      p_token_hash: unsubscribeHash,
    });

    if (claimed === true) {
      const unsubscribeUrl = new URL("/unsubscribe", `${siteUrl}/`);
      unsubscribeUrl.searchParams.set("token", unsubscribeToken);
      await sendWaitlistWelcomeEmail({
        to: input.email,
        unsubscribeUrl: unsubscribeUrl.toString(),
      });
    }
  }

  return successResponse(referralCode, siteUrl);
}
