import { createHmac, timingSafeEqual } from "node:crypto";

import {
  isUuid,
  WAITLIST_SURVEY_STAGE_TTL_SECONDS,
  WAITLIST_SURVEY_TOKEN_AUDIENCES,
  WAITLIST_SURVEY_TOKEN_MAX_LENGTH,
  WAITLIST_SURVEY_VERIFY_TTL_SECONDS,
  type WaitlistSurveyAudience,
} from "@hauscrawl/core";

/**
 * Server-only survey capabilities. These are new, purpose-built tokens: they
 * are not the status code, the confirmation token or the unsubscribe token, and
 * they grant exactly one thing — the ability to write answers for one signup.
 */

const DEVELOPMENT_SURVEY_SECRET = "HausCrawl-development-survey-secret";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSurveySecret(): string | null {
  const configured = process.env.WAITLIST_SURVEY_SECRET?.trim();
  if (configured) return configured;
  return isProduction() ? null : DEVELOPMENT_SURVEY_SECRET;
}

type SurveyClaims = {
  aud: WaitlistSurveyAudience;
  sub: string;
  sid: string;
  exp: number;
};

export type WaitlistSurveyReference = {
  signupId: string;
  sessionId: string;
  audience: WaitlistSurveyAudience;
};

function ttlFor(audience: WaitlistSurveyAudience): number {
  return audience === "survey-verify"
    ? WAITLIST_SURVEY_VERIFY_TTL_SECONDS
    : WAITLIST_SURVEY_STAGE_TTL_SECONDS;
}

export function createWaitlistSurveyToken({
  signupId,
  sessionId,
  audience,
}: {
  signupId: string;
  sessionId: string;
  audience: WaitlistSurveyAudience;
}): string | null {
  const secret = getSurveySecret();
  if (!secret || !isUuid(signupId) || !isUuid(sessionId)) return null;

  const payload = Buffer.from(
    JSON.stringify({
      aud: audience,
      sub: signupId,
      sid: sessionId,
      exp: Math.floor(Date.now() / 1000) + ttlFor(audience),
    } satisfies SurveyClaims),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

/** Returns the claims only when the signature, audience and expiry all check out. */
export function verifyWaitlistSurveyToken(token: string): WaitlistSurveyReference | null {
  if (!token || token.length > WAITLIST_SURVEY_TOKEN_MAX_LENGTH) return null;

  const secret = getSurveySecret();
  if (!secret) return null;

  const [payload, suppliedSignature, ...rest] = token.split(".");
  if (!payload || !suppliedSignature || rest.length > 0) return null;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<
      SurveyClaims
    >;

    if (
      typeof parsed.aud !== "string" ||
      !WAITLIST_SURVEY_TOKEN_AUDIENCES.includes(parsed.aud as WaitlistSurveyAudience) ||
      typeof parsed.sub !== "string" ||
      !isUuid(parsed.sub) ||
      typeof parsed.sid !== "string" ||
      !isUuid(parsed.sid) ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      signupId: parsed.sub,
      sessionId: parsed.sid,
      audience: parsed.aud as WaitlistSurveyAudience,
    };
  } catch {
    return null;
  }
}
