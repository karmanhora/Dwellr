import {
  WAITLIST_REFERRAL_CODE_LENGTH,
  WAITLIST_REFERRAL_CODE_PATTERN,
} from "../constants/waitlist";

/**
 * 32 unambiguous lowercase characters (no l, 0 or 1). 256 is divisible by 32,
 * so reducing random bytes modulo the alphabet length is unbiased.
 */
const REFERRAL_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export type RandomBytes = (size: number) => Uint8Array;

function secureRandomBytes(size: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

/** Generates a referral code with an injectable byte source for deterministic tests. */
export function createReferralCode(randomBytes: RandomBytes = secureRandomBytes): string {
  const bytes = randomBytes(WAITLIST_REFERRAL_CODE_LENGTH);
  let code = "";

  for (let index = 0; index < WAITLIST_REFERRAL_CODE_LENGTH; index += 1) {
    const byte = bytes[index] ?? 0;
    code += REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length];
  }

  return code;
}

export function waitlistShareUrl(baseUrl: string, referralCode: string): string {
  if (!WAITLIST_REFERRAL_CODE_PATTERN.test(referralCode)) {
    throw new Error("Invalid referral code.");
  }

  const url = new URL("/", baseUrl);
  url.searchParams.set("ref", referralCode);
  return url.toString();
}
