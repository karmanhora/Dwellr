import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { getContactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "How the waitlist works",
  description:
    "How dwellr waitlist positions, email confirmation, referrals and referral rewards work.",
  alternates: { canonical: "/waitlist/how-it-works" },
};

export default function WaitlistHowItWorksPage() {
  const contact = getContactEmail();

  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">The details</p>
      <h1 className="mt-4 text-4xl leading-[1.03] font-medium tracking-[-0.045em] text-ink sm:text-5xl">
        How the waitlist works.
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
        A short, plain-language explanation of the queue, referrals, and what the rewards mean.
        Nothing here is a promise of a specific launch date.
      </p>

      <div className="mt-10 space-y-9 text-[15px] leading-relaxed text-ink/85">
        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">
            Only confirmed emails count
          </h2>
          <p className="mt-3">
            After you sign up, we send a confirmation email. Your place in line starts when you
            confirm. Until then you are not in the queue, and referrals made through your link do
            not count.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">How your place is set</h2>
          <p className="mt-3">
            The queue is ordered by when people confirmed their email. A confirmed referral moves
            you up five spots. Up to ten referrals count, for a maximum of fifty spots.
          </p>
          <p className="mt-3">
            If an effective rank ties, the person who confirmed earlier keeps the higher place.
            Positions are calculated from the live queue, so they can move as more people confirm.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Referrals</h2>
          <p className="mt-3">
            Your referral link is on your private status page. A referral counts only after the
            person you invited confirms their own email. Self-referrals do not count, and we limit
            how many referrals can be credited from the same network in a day. We may remove
            referrals that are fraudulent, automated, or created to game the queue.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">What you can unlock</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>1 confirmed referral: your name on the Founding Members list.</li>
            <li>3 confirmed referrals: a first-wave invite when early access opens.</li>
            <li>10 confirmed referrals: the Founding Member badge and a say in the roadmap.</li>
          </ul>
          <p className="mt-3">
            Rewards are priority access and status only. They have no cash value, and no purchase is
            necessary. They do not guarantee a particular launch date or product feature.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Changes and fairness</h2>
          <p className="mt-3">
            dwellr may adjust the waitlist program as it grows, including the referral rules. We may
            remove referrals that do not reflect a real person confirming their email. We do not
            show other people&apos;s positions or use countdowns or scarcity claims.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Your private link</h2>
          <p className="mt-3">
            Your status link is a bearer secret. Anyone with it can see your position and referral
            link, so do not forward it. If you need a new link, sign up again with the same email
            and we will send a status link to that address.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Questions</h2>
          <p className="mt-3">
            Email{" "}
            <a
              href={`mailto:${contact}`}
              className="font-medium text-ink underline underline-offset-2"
            >
              {contact}
            </a>{" "}
            if something looks wrong. See also our{" "}
            <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
              privacy policy
            </Link>
            .
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
        <Link
          href="/#join"
          className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-body-sm font-medium text-paper transition hover:bg-ink-soft"
        >
          Join the waitlist
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-line-strong bg-paper px-5 text-body-sm font-medium text-ink transition hover:border-ink hover:bg-mist"
        >
          Back to dwellr
        </Link>
      </div>
    </Container>
  );
}
