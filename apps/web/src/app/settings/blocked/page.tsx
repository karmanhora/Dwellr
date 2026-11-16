import { formatMemberSince, getDisplayName } from "@hauscrawl/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { unblockUserAction } from "@/app/social/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { getBlockedProfiles } from "@/lib/social";
import { avatarPublicUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Blocked accounts",
  robots: { index: false, follow: false },
};

export default async function BlockedAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/settings/blocked");

  const blocked = await getBlockedProfiles(user.id);

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Trust and safety</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em]">Blocked accounts</h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Blocked accounts cannot comment on your homes or follow you, and their content is hidden
        from you in both directions. Unblocking restores normal visibility.
      </p>

      {blocked.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No blocked accounts"
            description="When you block someone from their profile, they will appear here so you can reverse it."
            action={
              <ButtonLink href="/explore" size="sm">
                Explore homes
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {blocked.map((profile) => (
            <li key={profile.id} className="flex items-center gap-3 py-4">
              <Avatar
                name={getDisplayName(profile)}
                src={avatarPublicUrl(profile.avatarUrl)}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${profile.username}`}
                  className="block truncate text-body-sm font-medium hover:underline"
                >
                  {getDisplayName(profile)}
                </Link>
                <p className="truncate text-caption text-stone">
                  @{profile.username} · {formatMemberSince(profile.createdAt)}
                </p>
              </div>
              <form action={unblockUserAction}>
                <input type="hidden" name="targetId" value={profile.id} />
                <input type="hidden" name="next" value="/settings/blocked" />
                <Button type="submit" variant="secondary" size="sm">
                  Unblock
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-body-sm text-stone">
        <Link href="/settings/profile" className="text-ink underline underline-offset-4">
          Back to profile settings
        </Link>
      </p>
    </Container>
  );
}
