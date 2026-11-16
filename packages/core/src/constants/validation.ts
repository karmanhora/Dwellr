/**
 * Validation constants shared by every client (web now, Expo later).
 * Server validation must stay the source of truth; the UI reuses these limits
 * so users get the same feedback before a request is made.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const DISPLAY_NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;
export const AVATAR_URL_MAX_LENGTH = 2048;
export const PASSWORD_MIN_LENGTH = 8;
/** Supabase (bcrypt) ignores bytes beyond 72, so reject longer passwords. */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Names that would look like product-owned accounts or collide with routes.
 * Checked here so the UI fails fast; the database trigger also sanitises.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "about",
  "admin",
  "api",
  "hauscrawl",
  "help",
  "legal",
  "login",
  "me",
  "moderator",
  "privacy",
  "root",
  "settings",
  "signin",
  "signup",
  "staff",
  "support",
  "terms",
]);
