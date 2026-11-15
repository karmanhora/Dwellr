import { createHash, createHmac } from "node:crypto";

import { getContactEmail } from "@/lib/site";

/**
 * Server-only waitlist helpers. Never import this module from a client
 * component: it reads private signing material.
 */

const DEVELOPMENT_IP_SALT = "dwellr-development-waitlist-ip-salt";
const DEVELOPMENT_UNSUBSCRIBE_SECRET = "dwellr-development-unsubscribe-secret";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
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

export function emailNotificationsEnabled(): boolean {
  return (
    process.env.WAITLIST_EMAIL_ENABLED === "true" &&
    Boolean(process.env.RESEND_API_KEY) &&
    Boolean(process.env.WAITLIST_EMAIL_FROM)
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Sends the one optional welcome email through Resend's HTTP API. The form
 * never depends on this succeeding; failures are logged without the address.
 */
export async function sendWaitlistWelcomeEmail({
  to,
  unsubscribeUrl,
}: {
  to: string;
  unsubscribeUrl: string;
}): Promise<boolean> {
  if (!emailNotificationsEnabled()) return false;

  const contact = escapeHtml(getContactEmail());
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_EMAIL_FROM;

  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "You're on the dwellr waitlist",
        text: [
          "You're on the list for early access to dwellr in Seattle / King County.",
          "",
          "dwellr is a private place to rate, compare, and decide on homes with your partner or family.",
          "",
          `Unsubscribe: ${unsubscribeUrl}`,
          `Questions? ${getContactEmail()}`,
        ].join("\n"),
        html: [
          '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1F2422;line-height:1.6">',
          "<h1 style=\"font-size:28px;line-height:1.2;margin:0 0 20px\">You're on the list.</h1>",
          "<p>Early access to dwellr starts in Seattle / King County. We'll email you when it opens.</p>",
          "<p>dwellr is a private place to rate, compare, and decide on homes with your partner or family.</p>",
          `<p style=\"margin-top:32px;font-size:13px;color:#6F7069\">Questions? <a href=\"mailto:${contact}\" style=\"color:#1F2422\">${contact}</a><br />`,
          `<a href="${safeUnsubscribeUrl}" style="color:#6F7069\">Unsubscribe from waitlist emails</a></p>`,
          "</div>",
        ].join(""),
      }),
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
