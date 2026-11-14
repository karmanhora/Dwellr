import type { Metadata } from "next";

import { acceptInviteAction, declineInviteAction } from "@/app/c/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Collection invite",
  robots: { index: false, follow: false },
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const [{ token }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const error = (Array.isArray(query.error) ? query.error[0] : query.error) === "1";

  return (
    <Container size="narrow" className="py-16 sm:py-24">
      <p className="text-eyebrow text-stone uppercase">Shared collection</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em]">
        You&rsquo;ve been invited to plan together.
      </h1>
      <p className="mt-4 max-w-prose text-body leading-relaxed text-stone">
        Joining lets you read the collection and, if the owner chose an editor role, add homes and
        leave your own ratings and notes. The invite expires and can be revoked.
      </p>

      {error ? (
        <div className="mt-6">
          <ErrorState
            title="This invite is no longer valid"
            description="It may have expired, been revoked, already been used, or belong to another account."
          />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <form action={acceptInviteAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Accept invite</Button>
        </form>
        <form action={declineInviteAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="secondary">
            Decline
          </Button>
        </form>
      </div>

      <p className="mt-6 text-caption text-stone">
        Signed in as <span className="text-ink">{user?.email ?? "your account"}</span>. Invites are
        tied to the account that accepts them.
      </p>
    </Container>
  );
}
