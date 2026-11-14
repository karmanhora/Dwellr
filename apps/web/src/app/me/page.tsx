import { formatMemberSince, getDisplayName } from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/me/actions";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { CompassIcon, PlusIcon, SettingsIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/lib/auth";
import { getProfileById } from "@/lib/properties";
import { avatarPublicUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/me");

  const profile = await getProfileById(user.id);

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Your account</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em]">Your profile</h1>

      {profile ? (
        <section className="mt-8 rounded-panel border border-line p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar
              name={getDisplayName(profile)}
              src={avatarPublicUrl(profile.avatarUrl)}
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium">{getDisplayName(profile)}</h2>
              <p className="mt-0.5 text-body-sm text-stone">@{profile.username}</p>
              <p className="mt-1 text-caption text-stone">{formatMemberSince(profile.createdAt)}</p>
            </div>
            <div className="sm:ml-auto">
              <ButtonLink href={`/u/${profile.username}`} variant="secondary" size="sm">
                View public profile
              </ButtonLink>
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-6 border-t border-line pt-6 text-body leading-relaxed text-stone">
              {profile.bio}
            </p>
          ) : null}
        </section>
      ) : (
        <div className="mt-8">
          <ErrorState
            title="Your profile isn't ready yet"
            description="Your account exists but its public profile is missing. Sign out and back in; if it still doesn't appear, the sign-up trigger needs checking."
          />
        </div>
      )}

      <section aria-labelledby="next-heading" className="mt-10">
        <h2 id="next-heading" className="text-title font-medium">
          What next
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          <li>
            <Link
              href="/create"
              className="flex h-full flex-col gap-3 rounded-card border border-line p-5 transition hover:border-ink"
            >
              <PlusIcon className="text-ink" />
              <span className="text-body-sm font-medium text-ink">Post a home</span>
              <span className="text-caption leading-relaxed text-stone">
                Add photos and the details you know.
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/explore"
              className="flex h-full flex-col gap-3 rounded-card border border-line p-5 transition hover:border-ink"
            >
              <CompassIcon className="text-ink" />
              <span className="text-body-sm font-medium text-ink">Explore homes</span>
              <span className="text-caption leading-relaxed text-stone">
                See what the community has added.
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/settings/profile"
              className="flex h-full flex-col gap-3 rounded-card border border-line p-5 transition hover:border-ink"
            >
              <SettingsIcon className="text-ink" />
              <span className="text-body-sm font-medium text-ink">Profile settings</span>
              <span className="text-caption leading-relaxed text-stone">
                Display name, bio, and photo.
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <div className="mt-12 border-t border-line pt-8">
        <form
          action={signOutAction}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-body-sm text-stone">
            Signed in as <span className="text-ink">{user.email}</span>
          </p>
          <div className="sm:w-40">
            <SubmitButton variant="quiet" pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </div>
        </form>
      </div>
    </Container>
  );
}
