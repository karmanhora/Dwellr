import { describe, expect, it } from "vitest";

import {
  calculateWaitlistPositions,
  canCreditWaitlistReferral,
  confirmWaitlistSignup,
  waitlistSpotsGained,
  waitlistTier,
} from "./waitlist-position";

describe("calculateWaitlistPositions", () => {
  it("excludes unconfirmed entries and orders by confirmation time then id", () => {
    const positions = calculateWaitlistPositions([
      { id: "b", confirmedAt: "2026-11-16T10:01:00.000Z", confirmedReferrals: 0 },
      { id: "a", confirmedAt: "2026-11-16T10:00:00.000Z", confirmedReferrals: 0 },
      { id: "unconfirmed", confirmedAt: null, confirmedReferrals: 10 },
    ]);

    expect(positions.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(positions.map((entry) => entry.position)).toEqual([1, 2]);
    expect(positions.map((entry) => entry.queueOrder)).toEqual([1, 2]);
  });

  it("applies the five-spot bonus and caps it at ten referrals (50 spots)", () => {
    const capped = calculateWaitlistPositions([
      { id: "capped", confirmedAt: "2026-11-16T10:00:00.000Z", confirmedReferrals: 12 },
      { id: "ahead", confirmedAt: "2026-11-16T10:01:00.000Z", confirmedReferrals: 0 },
      { id: "ahead-2", confirmedAt: "2026-11-16T10:02:00.000Z", confirmedReferrals: 0 },
    ]);

    const cappedEntry = capped.find((entry) => entry.id === "capped");
    expect(cappedEntry?.effectiveRank).toBe(1 - 50);
    expect(cappedEntry?.position).toBe(1);
    expect(waitlistSpotsGained(12)).toBe(50);
  });

  it("breaks equal effective ranks by earlier queue order", () => {
    const entries = Array.from({ length: 6 }, (_, index) => ({
      id: `entry-${index + 1}`,
      confirmedAt: `2026-11-16T10:0${index}:00.000Z`,
      confirmedReferrals: 0,
    }));
    entries[5] = { ...entries[5]!, confirmedReferrals: 1 };

    const positions = calculateWaitlistPositions(entries);
    const first = positions.find((entry) => entry.id === "entry-1");
    const sixth = positions.find((entry) => entry.id === "entry-6");

    expect(first?.effectiveRank).toBe(1);
    expect(sixth?.effectiveRank).toBe(1);
    expect(first?.position).toBe(1);
    expect(sixth?.position).toBe(2);
  });
});

describe("waitlistTier", () => {
  it("returns the highest earned tier", () => {
    expect(waitlistTier(0)).toBeNull();
    expect(waitlistTier(1)).toBe("founding_members");
    expect(waitlistTier(3)).toBe("first_wave");
    expect(waitlistTier(10)).toBe("founding_member_badge");
  });
});

describe("canCreditWaitlistReferral", () => {
  const base = {
    referrerEmail: "referrer@example.com",
    referredEmail: "friend@example.com",
    referrerIpHash: "a".repeat(64),
    referredIpHash: "b".repeat(64),
    confirmedReferralsFromSameIpToday: 0,
  };

  it("accepts a normal referral", () => {
    expect(canCreditWaitlistReferral(base)).toBe(true);
  });

  it("blocks self-referral by email and by IP", () => {
    expect(canCreditWaitlistReferral({ ...base, referredEmail: "REFERRER@example.com" })).toBe(
      false,
    );
    expect(canCreditWaitlistReferral({ ...base, referredIpHash: base.referrerIpHash })).toBe(false);
  });

  it("stops crediting at the daily IP cap", () => {
    expect(canCreditWaitlistReferral({ ...base, confirmedReferralsFromSameIpToday: 2 })).toBe(true);
    expect(canCreditWaitlistReferral({ ...base, confirmedReferralsFromSameIpToday: 3 })).toBe(
      false,
    );
  });
});

describe("confirmWaitlistSignup", () => {
  it("sets confirmation once and is idempotent", () => {
    const first = confirmWaitlistSignup({ emailConfirmedAt: null }, "2026-11-16T10:00:00.000Z");
    const second = confirmWaitlistSignup(first, "2026-11-16T11:00:00.000Z");

    expect(first.emailConfirmedAt).toBe("2026-11-16T10:00:00.000Z");
    expect(second).toBe(first);
  });
});
