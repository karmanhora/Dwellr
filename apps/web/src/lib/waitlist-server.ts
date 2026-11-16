import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { isUuid, WAITLIST_CONFIRMATION_TTL_SECONDS } from "@dwellr/core";

import { getContactEmail } from "@/lib/site";

/**
 * Server-only waitlist helpers. Never import this module from a client
 * component: it reads private signing material and the service-role client.
 */

const DEVELOPMENT_IP_SALT = "dwellr-development-waitlist-ip-salt";
const DEVELOPMENT_UNSUBSCRIBE_SECRET = "dwellr-development-unsubscribe-secret";
const DEVELOPMENT_CONFIRMATION_SECRET = "dwellr-development-confirmation-secret";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getConfirmationSecret(): string | null {
  const configured = process.env.WAITLIST_CONFIRMATION_SECRET?.trim();
  if (configured) return configured;
  return isProduction() ? null : DEVELOPMENT_CONFIRMATION_SECRET;
}

export function hashIp(ip: string): string {
  const salt = process.env.WAITLIST_IP_SALT;
  if (!salt && isProduction()) {
    throw new Error("WAITLIST_IP_SALT is not configured.");
  }

  return createHmac("sha256", salt ?? DEVELOPMENT_IP_SALT)
    .update(ip.trim() || "unknown")
    .digest("hex");
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function createUnsubscribeToken(email: string): string | null {
  const secret = process.env.WAITLIST_UNSUBSCRIBE_SECRET;
  if (!secret && isProduction()) return null;

  return createHmac("sha256", secret ?? DEVELOPMENT_UNSUBSCRIBE_SECRET)
    .update(email.trim().toLowerCase())
    .digest("base64url");
}

export function hashUnsubscribeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a short-lived, tamper-evident confirmation link payload. */
export function createWaitlistConfirmationToken(signupId: string): string | null {
  const secret = getConfirmationSecret();
  if (!secret || !isUuid(signupId)) return null;

  const payload = Buffer.from(
    JSON.stringify({
      sub: signupId,
      exp: Math.floor(Date.now() / 1000) + WAITLIST_CONFIRMATION_TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

/** Returns a signup id only when the signature and expiry are valid. */
export function verifyWaitlistConfirmationToken(token: string): string | null {
  const secret = getConfirmationSecret();
  if (!secret) return null;

  const [payload, suppliedSignature, ...rest] = token.split(".");
  if (!payload || !suppliedSignature || rest.length > 0) return null;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.sub !== "string" ||
      !isUuid(parsed.sub) ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed.sub;
  } catch {
    return null;
  }
}

export function isWaitlistEmailConfigured(): boolean {
  return (
    process.env.WAITLIST_EMAIL_ENABLED === "true" &&
    Boolean(process.env.RESEND_API_KEY?.trim()) &&
    Boolean(process.env.WAITLIST_EMAIL_FROM?.trim()) &&
    Boolean(getConfirmationSecret())
  );
}

type DomainCheck = { ok: boolean; checkedAt: number };
let domainCheck: DomainCheck | null = null;
const DOMAIN_CHECK_TTL_MS = 5 * 60 * 1000;

function senderDomain(): string | null {
  const from = process.env.WAITLIST_EMAIL_FROM?.trim();
  if (!from) return null;
  return from.match(/@([^>\s]+)/)?.[1] ?? null;
}

async function senderDomainVerified(): Promise<boolean> {
  const domain = senderDomain();
  if (!domain) return false;

  if (domainCheck && Date.now() - domainCheck.checkedAt < DOMAIN_CHECK_TTL_MS) {
    return domainCheck.ok;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.warn(
        "[waitlist] Resend domain check failed; position and referral UI are disabled for this request.",
      );
      domainCheck = { ok: false, checkedAt: Date.now() };
      return false;
    }

    const payload = (await response.json()) as {
      data?: Array<{ name?: unknown; status?: unknown }>;
    };
    const match = payload.data?.find((entry) => entry.name === domain);
    const ok = match?.status === "verified";
    if (!ok) {
      console.warn(
        "[waitlist] Resend sender domain is not verified; position and referral UI are disabled.",
      );
    }
    domainCheck = { ok, checkedAt: Date.now() };
    return ok;
  } catch {
    console.warn(
      "[waitlist] Resend domain check failed; position and referral UI are disabled for this request.",
    );
    domainCheck = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

export async function waitlistEmailReady(): Promise<boolean> {
  if (!isWaitlistEmailConfigured()) {
    console.warn(
      "[waitlist] Resend is not configured; the form still works, but position and referral UI are disabled.",
    );
    return false;
  }

  return senderDomainVerified();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendResendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WAITLIST_EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, html }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.error("[waitlist] email provider returned", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[waitlist] email send failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return false;
  }
}

function emailFooter(unsubscribeUrl: string | null): string {
  const contact = escapeHtml(getContactEmail());
  return unsubscribeUrl
    ? `<p style="margin-top:32px;font-size:13px;color:#6F7069">Questions? <a href="mailto:${contact}" style="color:#1F2422">${contact}</a><br /><a href="${escapeHtml(unsubscribeUrl)}" style="color:#6F7069">Unsubscribe from waitlist emails</a></p>`
    : `<p style="margin-top:32px;font-size:13px;color:#6F7069">Questions? <a href="mailto:${contact}" style="color:#1F2422">${contact}</a></p>`;
}

export async function sendWaitlistConfirmationEmail({
  to,
  confirmUrl,
  unsubscribeUrl,
}: {
  to: string;
  confirmUrl: string;
  unsubscribeUrl: string | null;
}): Promise<boolean> {
  if (!(await waitlistEmailReady())) return false;

  const safeConfirmUrl = escapeHtml(confirmUrl);
  const text = [
    "Confirm your email to join the dwellr waitlist.",
    "",
    "Only confirmed email addresses are in the queue. Confirming also gives you a status page and a referral link.",
    "",
    `Confirm: ${confirmUrl}`,
    "",
    "Referrals count after the person you refer confirms their own email.",
    "Rewards are priority access and status only. No purchase is necessary.",
    "",
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : "",
    `Questions? ${getContactEmail()}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return sendResendEmail({
    to,
    subject: "Confirm your dwellr waitlist email",
    text,
    html: [
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1F2422;line-height:1.6">',
      '<h1 style="font-size:28px;line-height:1.2;margin:0 0 20px">Confirm your email.</h1>',
      "<p>Only confirmed email addresses are in the dwellr waitlist queue. Confirming gives you a status page and a referral link.</p>",
      `<p style="margin:28px 0"><a href="${safeConfirmUrl}" style="display:inline-block;background:#1F2422;color:#FFFFFF;padding:14px 22px;border-radius:999px;text-decoration:none">Confirm my email</a></p>`,
      '<p style="font-size:13px;color:#6F7069">If the button does not work, copy this link into your browser:<br />',
      `${safeConfirmUrl}</p>`,
      "<p>Referrals count after the person you refer confirms their own email. Rewards are priority access and status only. No purchase is necessary.</p>",
      emailFooter(unsubscribeUrl),
      "</div>",
    ].join(""),
  });
}

export async function sendWaitlistStatusEmail({
  to,
  statusUrl,
  unsubscribeUrl,
}: {
  to: string;
  statusUrl: string;
  unsubscribeUrl: string | null;
}): Promise<boolean> {
  if (!(await waitlistEmailReady())) return false;

  const safeStatusUrl = escapeHtml(statusUrl);
  const text = [
    "Here is the status link for your dwellr waitlist signup.",
    "",
    `View your status: ${statusUrl}`,
    "",
    "This link is private. Do not forward it. Use the referral link on the status page to invite someone.",
    "",
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : "",
    `Questions? ${getContactEmail()}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return sendResendEmail({
    to,
    subject: "Your dwellr waitlist status",
    text,
    html: [
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1F2422;line-height:1.6">',
      '<h1 style="font-size:28px;line-height:1.2;margin:0 0 20px">Your waitlist status.</h1>',
      "<p>Use your private status link to see your place in line and your referral link.</p>",
      `<p style="margin:28px 0"><a href="${safeStatusUrl}" style="display:inline-block;background:#1F2422;color:#FFFFFF;padding:14px 22px;border-radius:999px;text-decoration:none">View my status</a></p>`,
      '<p style="font-size:13px;color:#6F7069">This link is private. Do not forward it. If the button does not work, copy this link into your browser:<br />',
      `${safeStatusUrl}</p>`,
      emailFooter(unsubscribeUrl),
      "</div>",
    ].join(""),
  });
}
