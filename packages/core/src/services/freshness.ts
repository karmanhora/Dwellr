import {
  LISTING_STALE_AFTER_DAYS,
  PRICE_CUT_BADGE_MAX_AGE_DAYS,
} from "../constants/property";
import type {
  PriceCut,
  PropertyFreshness,
  PropertyPriceChangeRow,
} from "../types/property";

const DAY_MS = 86_400_000;

function daysAgo(iso: string, now: Date): number {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

function dayLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Public freshness copy. This describes what the poster said and when they said
 * it — it is deliberately not a verification claim.
 */
export function getListingFreshness(
  createdAt: string,
  lastConfirmedAt: string | null,
  now: Date = new Date(),
): PropertyFreshness {
  const daysSincePosted = daysAgo(createdAt, now);
  const daysSinceConfirmation =
    lastConfirmedAt === null ? null : daysAgo(lastConfirmedAt, now);
  const age = daysSinceConfirmation ?? daysSincePosted;

  return {
    stale: age >= LISTING_STALE_AFTER_DAYS,
    confirmedByPoster: lastConfirmedAt !== null,
    daysSincePosted,
    daysSinceConfirmation,
    label:
      lastConfirmedAt === null
        ? `Posted ${dayLabel(daysSincePosted)}`
        : `Poster confirmed ${dayLabel(daysSinceConfirmation ?? 0)}`,
  };
}

/**
 * A price cut needs an observed previous price and a lower current price, and
 * only counts while it is recent enough for a badge to be meaningful. A price
 * increase (or a price removed) never produces one.
 */
export function toPriceCut(
  change: Pick<
    PropertyPriceChangeRow,
    "price_cents" | "previous_price_cents" | "recorded_at"
  > | null,
  now: Date = new Date(),
): PriceCut | null {
  if (!change || change.previous_price_cents === null) return null;
  if (change.price_cents >= change.previous_price_cents) return null;

  const recorded = new Date(change.recorded_at).getTime();
  if (Number.isNaN(recorded)) return null;
  if (now.getTime() - recorded > PRICE_CUT_BADGE_MAX_AGE_DAYS * DAY_MS) return null;

  return {
    amountCents: change.previous_price_cents - change.price_cents,
    previousPriceCents: change.previous_price_cents,
    recordedAt: change.recorded_at,
  };
}
