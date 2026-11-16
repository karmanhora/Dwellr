import {
  WAITLIST_MAX_CREDITED_REFERRALS,
  WAITLIST_MAX_REFERRALS_PER_IP_PER_DAY,
  WAITLIST_REFERRAL_BONUS_SPOTS,
  type WaitlistTier,
} from "../constants/waitlist";

export interface WaitlistQueueEntry {
  id: string;
  confirmedAt: string | null;
  confirmedReferrals: number;
}

export interface WaitlistPosition {
  id: string;
  queueOrder: number;
  confirmedReferrals: number;
  effectiveRank: number;
  position: number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Mirrors the SQL queue: only confirmed entries, ordered by confirmation time
 * and then id. The effective rank gives confirmed referrals their five-spot
 * lift, capped at ten. Positions are assigned by effective rank and then queue
 * order, so a tie always favors the person who confirmed earlier.
 */
export function calculateWaitlistPositions(entries: WaitlistQueueEntry[]): WaitlistPosition[] {
  const queue = entries
    .filter((entry) => entry.confirmedAt !== null)
    .sort((left, right) => {
      const confirmedOrder = compareText(left.confirmedAt ?? "", right.confirmedAt ?? "");
      return confirmedOrder !== 0 ? confirmedOrder : compareText(left.id, right.id);
    })
    .map((entry, index) => {
      const queueOrder = index + 1;
      const creditedReferrals = Math.max(
        0,
        Math.min(entry.confirmedReferrals, WAITLIST_MAX_CREDITED_REFERRALS),
      );

      return {
        id: entry.id,
        queueOrder,
        confirmedReferrals: entry.confirmedReferrals,
        effectiveRank: queueOrder - WAITLIST_REFERRAL_BONUS_SPOTS * creditedReferrals,
      };
    });

  return queue
    .sort(
      (left, right) =>
        left.effectiveRank - right.effectiveRank || left.queueOrder - right.queueOrder,
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function waitlistSpotsGained(confirmedReferrals: number): number {
  const credited = Math.max(
    0,
    Math.min(Math.floor(confirmedReferrals), WAITLIST_MAX_CREDITED_REFERRALS),
  );
  return credited * WAITLIST_REFERRAL_BONUS_SPOTS;
}

export function waitlistTier(confirmedReferrals: number): WaitlistTier | null {
  if (confirmedReferrals >= 10) return "founding_member_badge";
  if (confirmedReferrals >= 3) return "first_wave";
  if (confirmedReferrals >= 1) return "founding_members";
  return null;
}

export interface WaitlistReferralContext {
  referrerEmail: string;
  referredEmail: string;
  referrerIpHash: string;
  referredIpHash: string;
  confirmedReferralsFromSameIpToday: number;
}

/**
 * A referral is only creditable when it is not self-referral and the referred
 * person has not already hit that IP's daily credit cap.
 */
export function canCreditWaitlistReferral(context: WaitlistReferralContext): boolean {
  const referrerEmail = context.referrerEmail.trim().toLowerCase();
  const referredEmail = context.referredEmail.trim().toLowerCase();

  if (!referrerEmail || !referredEmail || referrerEmail === referredEmail) return false;
  if (!context.referrerIpHash || !context.referredIpHash) return false;
  if (context.referrerIpHash === context.referredIpHash) return false;
  if (context.confirmedReferralsFromSameIpToday >= WAITLIST_MAX_REFERRALS_PER_IP_PER_DAY) {
    return false;
  }

  return true;
}

export interface WaitlistConfirmationState {
  emailConfirmedAt: string | null;
}

/** Confirming twice returns the original confirmation time. */
export function confirmWaitlistSignup(
  state: WaitlistConfirmationState,
  confirmedAt: string,
): WaitlistConfirmationState {
  return state.emailConfirmedAt === null ? { ...state, emailConfirmedAt: confirmedAt } : state;
}
