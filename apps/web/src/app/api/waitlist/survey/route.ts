import {
  toWaitlistSurveyAnswersPayload,
  WAITLIST_SURVEY_TOKEN_MAX_LENGTH,
  waitlistSurveySubmissionSchema,
} from "@hauscrawl/core";
import { NextResponse } from "next/server";

import { createWaitlistAdminClient } from "@/lib/supabase/admin";
import { getClientIp, hashIp } from "@/lib/waitlist-server";
import { verifyWaitlistSurveyToken } from "@/lib/waitlist-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_192;
const NO_STORE = { "Cache-Control": "no-store" };

const ANSWER_KEYS = [
  "role",
  "searchingWith",
  "region",
  "timeline",
  "useCase",
  "displayName",
  "brokerage",
  "workRegion",
  "contactMethod",
  "phone",
  "promoInterest",
  "creatorFocus",
  "creatorChannel",
  "notes",
] as const;

type SurveyResult = {
  ok?: boolean;
  state?: string;
  promoted?: boolean;
};

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: NO_STORE });
}

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * The client omits unanswered questions, but a form control can still send an
 * empty string. Enums reject those, and an empty answer means "not answered",
 * so normalize before validation instead of turning it into a field error.
 */
function readAnswers(body: Record<string, unknown>): Record<string, unknown> {
  const raw = body.answers;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};

  const answers: Record<string, unknown> = {};
  for (const key of ANSWER_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    if (value.trim().length === 0) continue;
    answers[key] = value;
  }
  return answers;
}

function isMissingSurveyFunctionError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function .*waitlist_survey/i.test(error.message ?? "") ||
    /function .*waitlist_survey.* does not exist/i.test(error.message ?? "")
  );
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
      return jsonError(400, "Check your answers and try again.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(400, "Check your answers and try again.");
  }

  // A filled hidden field means a bot. Return the normal success shape without
  // writing anything, so the bot has no signal that it was caught.
  const honeypot = readString(body, "website");
  if (honeypot && honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true, state: "staged" }, { headers: NO_STORE });
  }

  const referenceInput = readString(body, "ref")?.trim();
  if (!referenceInput || referenceInput.length > WAITLIST_SURVEY_TOKEN_MAX_LENGTH) {
    return jsonError(400, "This survey link is not valid. Start from the waitlist form again.");
  }

  const reference = verifyWaitlistSurveyToken(referenceInput);
  if (!reference) {
    return jsonError(400, "This survey link is invalid or has expired.");
  }

  const parsed = waitlistSurveySubmissionSchema.safeParse({
    ref: referenceInput,
    answers: readAnswers(body),
  });
  if (!parsed.success) {
    return jsonError(400, "Check your answers and try again.");
  }

  let ipHash: string;
  try {
    ipHash = hashIp(getClientIp(request.headers));
  } catch {
    console.error("[waitlist] survey IP hashing is not configured.");
    return jsonError(503, "The survey is temporarily unavailable. Try again later.");
  }

  const admin = createWaitlistAdminClient();
  if (!admin) {
    console.error("[waitlist] SUPABASE_SERVICE_ROLE_KEY is required for the waitlist survey.");
    return jsonError(503, "The survey is temporarily unavailable. Try again later.");
  }

  const answers = toWaitlistSurveyAnswersPayload(parsed.data.answers);

  const { data, error } =
    reference.audience === "survey-verify"
      ? await admin.rpc("save_verified_waitlist_survey", {
          p_signup_id: reference.signupId,
          p_ip_hash: ipHash,
          p_answers: answers,
        })
      : await admin.rpc("stage_waitlist_survey", {
          p_signup_id: reference.signupId,
          p_session_id: reference.sessionId,
          p_ip_hash: ipHash,
          p_answers: answers,
        });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate_limited")) {
      return jsonError(429, "Too many survey submissions from this connection. Try again later.");
    }
    if (message.includes("invalid_input")) {
      return jsonError(400, "Check your answers and try again.");
    }
    if (isMissingSurveyFunctionError(error)) {
      console.error(
        "[waitlist] survey functions are missing; apply 20261121120000_waitlist_survey.sql.",
      );
      return jsonError(503, "The survey is temporarily unavailable. Try again later.");
    }

    console.error("[waitlist] survey write failed:", error.code ?? "unknown");
    return jsonError(500, "We couldn't save your answers just now. Try again.");
  }

  const result = data as SurveyResult | null;
  if (!result || result.ok !== true) {
    if (result?.state === "unverified") {
      return jsonError(409, "Confirm your email first, then finish the survey.");
    }
    return jsonError(404, "We couldn't find that signup. Join the waitlist again to start over.");
  }

  return NextResponse.json(
    { ok: true, state: result.state === "verified" ? "verified" : "staged" },
    { headers: NO_STORE },
  );
}
