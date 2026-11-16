import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { getContactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What HausCrawl collects from the waitlist, why we collect it, how long we keep it, and how to ask us to delete it.",
  alternates: { canonical: "/privacy" },
};

const updated = "November 15, 2026";

export default function PrivacyPage() {
  const contact = getContactEmail();

  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
        Plain-language draft
      </p>
      <h1 className="mt-4 text-4xl leading-tight font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        Privacy
      </h1>
      <p className="mt-4 text-body-sm text-stone">Last updated {updated}</p>

      <div className="mt-10 space-y-9 text-[15px] leading-relaxed text-ink/85">
        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">The short version</h2>
          <p className="mt-3">
            We collect your email so we can tell you when HausCrawl opens in your area. Everything
            else on the form is optional. We do not sell or share your email for advertising, and
            we do not ask for a street address.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">What we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-ink">Your email address.</strong> This is
              required to join the waitlist.
            </li>
            <li>
              <strong className="font-medium text-ink">Optional details.</strong> What best
              describes you, who you are searching with, and a city or region. Please keep the
              city or region general; do not enter a street address.
            </li>
            <li>
              <strong className="font-medium text-ink">Source information.</strong> The page that
              referred you and campaign parameters such as utm_source, utm_medium, and
              utm_campaign, when present.
            </li>
            <li>
              <strong className="font-medium text-ink">A salted IP hash.</strong> We hash your IP
              address with a server-side salt before storing it. We use the hash only to limit
              abuse, not to identify you.
            </li>
            <li>
              <strong className="font-medium text-ink">A referral code and signup time.</strong>{" "}
              The code powers the share link and lets us understand referrals.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">What we do not collect</h2>
          <p className="mt-3">
            We do not ask for a phone number, payment details, or a home address. The waitlist form
            does not include a listing, a photo, or a street address. If you later use the HausCrawl
            product, its own privacy terms will apply to what you save there.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Why we use it</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>To send early-access updates and launch news about HausCrawl.</li>
            <li>To understand which areas and audiences are interested first.</li>
            <li>To keep the waitlist working and prevent spam or abuse.</li>
          </ul>
          <p className="mt-3">
            We do not use your email or optional answers for advertising, and we do not sell or
            share them with data brokers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Analytics</h2>
          <p className="mt-3">
            We use a small set of product events to understand whether the waitlist page works:
            page view, form start, form submit, successful signup, and referral share clicks.
            Analytics runs in cookieless, memory-only mode. We do not send your email, your
            optional answers, or form contents to analytics, and we do not record IP addresses in
            analytics.
          </p>
          <p className="mt-3">
            If you prefer not to be counted, a content blocker or browser privacy setting will stop
            the analytics request. The form continues to work.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">
            Who helps us run it
          </h2>
          <p className="mt-3">
            We use service providers for hosting, database storage, analytics, and—only if email
            notifications are enabled—sending waitlist email. They process data on our behalf. We
            do not authorize them to sell it. We may also disclose information if the law requires
            it or to protect the service from abuse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">How long we keep it</h2>
          <p className="mt-3">
            We keep waitlist details until the waitlist closes and for up to 12 months afterward,
            unless you ask us to delete them sooner. If you unsubscribe, we keep a minimal record
            that you opted out so we do not email you again. Aggregated counts may be kept longer
            because they no longer identify you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Your choices</h2>
          <p className="mt-3">
            Every waitlist email includes an unsubscribe link. You can also ask us to access,
            correct, or delete your waitlist details by emailing{" "}
            <a
              href={`mailto:${contact}`}
              className="font-medium text-ink underline underline-offset-2"
            >
              {contact}
            </a>
            . We may need to confirm that the request comes from the email address on the list.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Security</h2>
          <p className="mt-3">
            The waitlist database is not readable by the public website. Signups go through a
            narrow server function, and the browser never receives a service-role key. No system is
            perfectly secure, but we work to keep the data limited and protected.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Changes and contact</h2>
          <p className="mt-3">
            If this policy changes, we will update the date at the top. Questions? Email{" "}
            <a
              href={`mailto:${contact}`}
              className="font-medium text-ink underline underline-offset-2"
            >
              {contact}
            </a>
            . See also our{" "}
            <Link href="/terms" className="font-medium text-ink underline underline-offset-2">
              terms
            </Link>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
