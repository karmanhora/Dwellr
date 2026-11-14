/**
 * Same-origin redirect safety.
 *
 * Lives in core because Expo deep links need the same rule: never send a user
 * to a destination derived from attacker-controlled input unless it is a plain
 * absolute path on our own origin.
 */

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * A safe destination starts with exactly one "/" and contains no backslash and
 * no control characters. Backslashes matter because browsers and proxies treat
 * "\" like "/", so "/\evil.com" becomes protocol-relative "//evil.com".
 */
function isSafePath(candidate: string): boolean {
  if (!candidate.startsWith("/")) return false;
  if (candidate.startsWith("//")) return false;
  if (candidate.includes("\\")) return false;
  if (CONTROL_CHARACTERS.test(candidate)) return false;
  return true;
}

/**
 * Returns `value` only when it is a safe, same-origin path; otherwise returns
 * `fallback`.
 *
 * The value is validated twice — as sent and after one percent-decode — so
 * encoded variants such as "/%5Cevil.com" and "/%2F%2Fevil.com" cannot slip
 * through. Malformed encoding is rejected rather than repaired.
 */
export function safeRedirectPath(value: unknown, fallback = "/me"): string {
  if (typeof value !== "string") return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (!isSafePath(value) || !isSafePath(decoded)) return fallback;

  return value;
}
