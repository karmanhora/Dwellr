import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { WaitlistSurveyForm } from "@/components/waitlist/waitlist-survey-form";
import { verifyWaitlistSurveyToken } from "@/lib/waitlist-survey";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A few quick questions",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
  // The survey reference is a capability in the URL. Never send it onward in a
  // Referer header when the page links out.
  referrer: "no-referrer",
};

function SurveyUnavailable() {
  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">Waitlist questions</p>
      <h1 className="mt-4 text-4xl leading-tight font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        This survey link isn&apos;t ready.
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
        Survey links expire after a while. Join the waitlist again with the same email to start a
        fresh one, or open your private status page to pick up where you left off.
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
    </Container>
  );
}

export default async function WaitlistSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.ref) ? params.ref[0] : params.ref;

  if (!raw) return <SurveyUnavailable />;

  const reference = verifyWaitlistSurveyToken(raw);
  if (!reference) return <SurveyUnavailable />;

  const verified = reference.audience === "survey-verify";

  return (
    <Container size="narrow" className="py-10 sm:py-16">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
        Waitlist questions
      </p>
      <h1 className="mt-4 font-serif text-[2.1rem] leading-[1.05] font-medium tracking-[-0.045em] text-ink sm:text-5xl">
        So early access fits the way you search.
      </h1>
      <p className="mt-4 max-w-xl text-body leading-relaxed text-stone">
        {verified
          ? "Update what you told us whenever your search changes. You can come back to this page from your status link."
          : "Your email is already saved. A few short questions help us decide what to build first — skip anything you'd rather not answer."}
      </p>

      <WaitlistSurveyForm surveyRef={raw} mode={verified ? "verify" : "stage"} />
    </Container>
  );
}
