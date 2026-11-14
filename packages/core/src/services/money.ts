import { PROPERTY_MAX_PRICE_CENTS } from "../constants/property";

/**
 * Parses a price typed by a person ("450,000", "$1,250,000.50") into integer
 * cents. Returns null for blank or malformed input so callers can decide
 * whether that means "no price" or a validation error.
 */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[,\s$]/g, "");
  if (cleaned.length === 0) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(cents)) return null;
  if (cents < 0 || cents > PROPERTY_MAX_PRICE_CENTS) return null;

  return cents;
}

/** Formats cents for an editable price field, without trailing ".00". */
export function centsToDollarInput(cents: number | null): string {
  if (cents === null) return "";
  const dollars = (cents / 100).toFixed(2);
  return dollars.endsWith(".00") ? dollars.slice(0, -3) : dollars;
}

/** Parses an optional non-negative number typed into a form field. */
export function parseOptionalNumber(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned.length === 0) return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
