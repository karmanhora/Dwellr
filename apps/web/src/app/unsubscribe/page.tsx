import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { UnsubscribeForm } from "@/components/waitlist/unsubscribe-form";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Unsubscribe from HausCrawl waitlist emails.",
  robots: { index: false, follow: false },
};

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const validToken = typeof token === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(token);

  return (
    <Container size="narrow" className="py-16 sm:py-24">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">Waitlist</p>
      <h1 className="mt-4 text-4xl leading-tight font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        Unsubscribe
      </h1>

      {validToken ? (
        <>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
            This will remove you from HausCrawl waitlist emails. You can still join again later with
            the same email address.
          </p>
          <div className="mt-8">
            <UnsubscribeForm token={token} />
          </div>
        </>
      ) : (
        <div className="mt-5 max-w-xl space-y-4 text-[15px] leading-relaxed text-stone">
          <p>
            This unsubscribe link is missing its token. Use the link at the bottom of a HausCrawl
            waitlist email, or email us and we will remove you manually.
          </p>
          <Link href="/" className="inline-block font-medium text-ink underline underline-offset-2">
            Back to HausCrawl
          </Link>
        </div>
      )}
    </Container>
  );
}
