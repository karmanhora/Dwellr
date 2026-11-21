import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";

import {
  WAITLIST_COUNT_VISIBILITY_THRESHOLD,
  WAITLIST_TIER_LABELS,
  type WaitlistTier,
  waitlistShareUrl,
  waitlistSpotsGained,
  waitlistTier,
} from "@hauscrawl/core";

import { Container } from "@/components/ui/container";
import { WaitlistShare } from "@/components/waitlist/waitlist-share";
import { getSiteUrl } from "@/lib/site";
import {
  getWaitlistReferralCode,
  getWaitlistStatus,
  getWaitlistSurveySignupId,
} from "@/lib/waitlist-status";
import { createWaitlistSurveyToken } from "@/lib/waitlist-survey";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your waitlist status",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

const tierRows: Array<{
  key: WaitlistTier;
  at: number;
  description: string;
}> = [
  {
    key: "founding_members",
    at: 1,
    description: "Your name goes on the Founding Members list.",
  },
  {
    key: "first_wave",
    at: 3,
    description: "You get a first-wave invite when early access opens.",
  },
  {
    key: "founding_member_badge",
    at: 10,
    description: "You get the Founding Member badge and a say in the roadmap.",
  },
];

function StatusUnavailable() {
  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
        Private status link
      </p>
      <h1 className="mt-4 text-4xl leading-tight font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        This status link isn&apos;t ready.
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
        If you just signed up, confirm your email first. The confirmation email puts you in the
        queue and unlocks your private status page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/#join"
          className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-body-sm font-medium text-paper transition hover:bg-ink-soft"
        >
          Join the waitlist
        </Link>
        <Link
          href="/waitlist/how-it-works"
          className="inline-flex h-11 items-center rounded-full border border-line-strong bg-paper px-5 text-body-sm font-medium text-ink transition hover:border-ink hover:bg-mist"
        >
          How it works
        </Link>
      </div>
      <p className="mt-8 text-caption leading-relaxed text-stone">
        If a confirmation email did not arrive, check your spam folder or sign up again with the
        same address to request a new status link.
      </p>
    </Container>
  );
}

export default async function WaitlistStatusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const status = await getWaitlistStatus(code);

  if (!status || status.position === null) {
    return <StatusUnavailable />;
  }

  const position = status.position;
  const total = status.total;
  const referrals = status.referral_count;
  const spotsGained = waitlistSpotsGained(referrals);
  const currentTier = waitlistTier(referrals);
  const referralCode = await getWaitlistReferralCode(code);
  const referralUrl = referralCode ? waitlistShareUrl(getSiteUrl(), referralCode) : null;

  // The status code proves ownership, so this page can mint a separate, short-
  // lived survey capability. The status code itself never enters a survey URL.
  const surveySignupId = await getWaitlistSurveySignupId(code);
  const surveyToken = surveySignupId
    ? createWaitlistSurveyToken({
        signupId: surveySignupId,
        sessionId: randomUUID(),
        audience: "survey-verify",
      })
    : null;
  const surveyHref = surveyToken
    ? `/waitlist/survey?ref=${encodeURIComponent(surveyToken)}`
    : null;

  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
        Private status link
      </p>
      <h1 className="mt-4 text-4xl leading-[1.02] font-medium tracking-[-0.045em] text-ink sm:text-6xl">
        You&apos;re #{position}
        {total !== null && total >= WAITLIST_COUNT_VISIBILITY_THRESHOLD ? (
          <span className="text-stone"> of {total}</span>
        ) : null}
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
        Your place is based on when you confirmed your email and how many referrals you have
        confirmed. It changes as other people join and confirm their own emails.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.4rem] border border-line bg-paper p-5">
          <p className="text-caption tracking-[0.12em] text-stone uppercase">Confirmed referrals</p>
          <p
            data-testid="waitlist-referral-count"
            className="mt-2 text-3xl font-medium tracking-[-0.04em] text-ink"
          >
            {referrals}
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-line bg-paper p-5">
          <p className="text-caption tracking-[0.12em] text-stone uppercase">Spots gained</p>
          <p
            data-testid="waitlist-spots-gained"
            className="mt-2 text-3xl font-medium tracking-[-0.04em] text-ink"
          >
            {spotsGained}
          </p>
        </div>
      </div>

      <section aria-labelledby="waitlist-tiers-heading" className="mt-10 border-t border-line pt-6">
        <h2 id="waitlist-tiers-heading" className="text-lg font-medium tracking-[-0.02em] text-ink">
          What referrals unlock
        </h2>
        <div className="mt-4 space-y-3">
          {tierRows.map((row) => {
            const earned = referrals >= row.at;
            const isCurrent = currentTier === row.key;

            return (
              <div
                key={row.key}
                className={`rounded-[1.2rem] border p-4 ${
                  isCurrent ? "border-ink bg-mist" : "border-line bg-paper"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{WAITLIST_TIER_LABELS[row.key]}</p>
                  <p className="text-caption text-stone">
                    {earned
                      ? "Earned"
                      : `${row.at} confirmed ${row.at === 1 ? "referral" : "referrals"}`}
                  </p>
                </div>
                <p className="mt-1 text-body-sm leading-relaxed text-stone">{row.description}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-caption leading-relaxed text-stone">
          Rewards are priority access and status only. No purchase is necessary, and the rewards
          have no cash value.
        </p>
      </section>

      {referralUrl ? (
        <div className="mt-10">
          <WaitlistShare referralUrl={referralUrl} />
        </div>
      ) : (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">Invite someone</h2>
          <p className="mt-2 text-body-sm leading-relaxed text-stone">
            Your referral link is unavailable right now. Try this page again later.
          </p>
        </section>
      )}

      {surveyHref ? (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">
            Tell us about your search
          </h2>
          <p className="mt-2 text-body-sm leading-relaxed text-stone">
            A few optional questions help us shape early access. Your answers stay private, and
            you can change them from this page whenever your search moves.
          </p>
          <Link
            href={surveyHref}
            className="mt-4 inline-flex h-11 items-center rounded-full bg-moss px-5 text-body-sm font-medium text-cream transition hover:bg-moss/90"
          >
            Answer a few questions
          </Link>
        </section>
      ) : null}

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">
          How your place is calculated
        </h2>
        <div className="mt-3 space-y-3 text-body-sm leading-relaxed text-stone">
          <p>
            Only confirmed email addresses are in the queue. Your queue order is the order people
            confirmed, with ties broken by signup id. A confirmed referral moves you up five spots,
            and up to ten referrals count (at most fifty spots).
          </p>
          <p>
            A referral counts only after the person you invited confirms their own email. If two
            people end up with the same effective rank, the person who confirmed earlier keeps the
            higher place.
          </p>
          <p>
            Positions are never stored. They are calculated from the current queue, so they move
            when someone else confirms. HausCrawl may remove fraudulent referrals.
          </p>
        </div>
        <Link
          href="/waitlist/how-it-works"
          className="mt-5 inline-flex text-body-sm font-medium text-ink underline underline-offset-2 hover:text-stone"
        >
          Read the full waitlist rules
        </Link>
      </section>
    </Container>
  );
}
