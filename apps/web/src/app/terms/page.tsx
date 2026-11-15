import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { getContactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for joining the dwellr waitlist, including email consent, acceptable use, and the limits of the service.",
  alternates: { canonical: "/terms" },
};

const updated = "November 15, 2026";

export default function TermsPage() {
  const contact = getContactEmail();

  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
        Plain-language draft
      </p>
      <h1 className="mt-4 text-4xl leading-tight font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        Terms
      </h1>
      <p className="mt-4 text-body-sm text-stone">Last updated {updated}</p>

      <div className="mt-10 space-y-9 text-[15px] leading-relaxed text-ink/85">
        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">This is a waitlist</h2>
          <p className="mt-3">
            The dwellr waitlist lets you ask to hear about early access. Joining does not create an
            account, guarantee access, or promise that dwellr will launch in your area on a
            particular date. We may change, pause, or close the waitlist.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Your email</h2>
          <p className="mt-3">
            By joining, you agree that we may email you about early access and launch updates for
            dwellr. You can unsubscribe at any time using the link in an email or by contacting us.
            Please use an email address you are allowed to use. Do not sign up someone else.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Acceptable use</h2>
          <p className="mt-3">
            Do not use the waitlist to spam, scrape, probe, overload, or attempt to access data
            that is not yours. Do not submit false information or another person&apos;s details. We
            may block requests or remove entries that appear abusive.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">
            What the waitlist is not
          </h2>
          <p className="mt-3">
            The waitlist does not provide listings, prices, legal advice, financial advice, or a
            brokerage service. Any illustrative interface on this site is an example, not a real
            property. Always verify property details with the appropriate source before making a
            decision.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Privacy</h2>
          <p className="mt-3">
            Our{" "}
            <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
              privacy policy
            </Link>{" "}
            explains what we collect and how to ask us to delete it. It is part of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">
            Availability and changes
          </h2>
          <p className="mt-3">
            The waitlist is provided as-is while we build. We do not promise uninterrupted
            availability or that email delivery will always succeed. We may update these terms;
            the date at the top will change when we do. If a change is material, we will try to let
            the list know.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Contact</h2>
          <p className="mt-3">
            Questions about these terms? Email{" "}
            <a
              href={`mailto:${contact}`}
              className="font-medium text-ink underline underline-offset-2"
            >
              {contact}
            </a>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
