/**
 * Small, server-safe site configuration helpers. These values are read at
 * runtime, so the same build can run in preview and production.
 */
export const SITE_NAME = "dwellr";
export const SITE_DESCRIPTION =
  "Find a home together. Rate, compare, and decide on homes with your partner or family, privately. Early access starts in Seattle / King County.";

export function isWaitlistOnly(): boolean {
  return process.env.WAITLIST_ONLY === "true";
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return (configured && configured.length > 0 ? configured : "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "privacy@example.com";
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
