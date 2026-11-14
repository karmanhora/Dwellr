import { describe, expect, it } from "vitest";

import { getListingFreshness, toPriceCut } from "./freshness";

const now = new Date("2026-11-14T12:00:00.000Z");

describe("getListingFreshness", () => {
  it("labels a fresh post that the poster has not reconfirmed", () => {
    const freshness = getListingFreshness("2026-11-12T12:00:00.000Z", null, now);
    expect(freshness).toMatchObject({
      stale: false,
      confirmedByPoster: false,
      daysSincePosted: 2,
      daysSinceConfirmation: null,
      label: "Posted 2 days ago",
    });
  });

  it("uses the latest confirmation when there is one", () => {
    const freshness = getListingFreshness(
      "2026-08-01T12:00:00.000Z",
      "2026-11-13T12:00:00.000Z",
      now,
    );
    expect(freshness).toMatchObject({
      stale: false,
      confirmedByPoster: true,
      daysSinceConfirmation: 1,
      label: "Poster confirmed 1 day ago",
    });
  });

  it("goes stale after 30 days without a confirmation", () => {
    expect(
      getListingFreshness("2026-10-15T12:00:00.000Z", null, now).stale,
    ).toBe(true);
  });

  it("does not go stale when the poster confirmed recently", () => {
    const freshness = getListingFreshness(
      "2026-01-01T12:00:00.000Z",
      "2026-11-01T12:00:00.000Z",
      now,
    );
    expect(freshness.stale).toBe(false);
    expect(freshness.daysSincePosted).toBeGreaterThan(300);
  });

  it("treats an unparseable confirmation date as today rather than stale", () => {
    const freshness = getListingFreshness("2026-01-01T12:00:00.000Z", "not-a-date", now);
    expect(freshness.daysSinceConfirmation).toBe(0);
    expect(freshness.stale).toBe(false);
  });

  it("says today instead of 0 days ago", () => {
    expect(getListingFreshness(now.toISOString(), null, now).label).toBe("Posted today");
  });
});

describe("toPriceCut", () => {
  const base = {
    price_cents: 51_000_000,
    previous_price_cents: 52_500_000,
    recorded_at: "2026-11-10T12:00:00.000Z",
  };

  it("reports an observed reduction", () => {
    expect(toPriceCut(base, now)).toEqual({
      amountCents: 1_500_000,
      previousPriceCents: 52_500_000,
      recordedAt: "2026-11-10T12:00:00.000Z",
    });
  });

  it("never reports an increase", () => {
    expect(
      toPriceCut({ ...base, price_cents: 53_000_000 }, now),
    ).toBeNull();
  });

  it("requires a previous price", () => {
    expect(toPriceCut({ ...base, previous_price_cents: null }, now)).toBeNull();
  });

  it("drops an old cut once the badge window has passed", () => {
    expect(
      toPriceCut({ ...base, recorded_at: "2026-07-01T12:00:00.000Z" }, now),
    ).toBeNull();
  });

  it("ignores missing history", () => {
    expect(toPriceCut(null, now)).toBeNull();
  });
});
