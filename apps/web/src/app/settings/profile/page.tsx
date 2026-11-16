import { getDisplayName } from "@hauscrawl/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { getCurrentUser } from "@/lib/auth";
import { getProfileById } from "@/lib/properties";
import { avatarPublicUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Profile settings",
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/settings/profile");

  const profile = await getProfileById(user.id);

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <ButtonLink href="/me" variant="ghost" size="sm" className="-ml-3">
        Back to your account
      </ButtonLink>

      <h1 className="mt-4 text-headline font-medium tracking-[-0.03em]">Profile settings</h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        This is what people see when they open one of your homes.
      </p>

      {profile ? (
        <>
          <p className="mt-6 text-body-sm text-stone">
            Username <span className="text-ink">@{profile.username}</span>{" "}
            <span className="text-caption">(usernames are permanent for now)</span>
          </p>
          <div className="mt-8">
            <ProfileForm
              userId={user.id}
              name={getDisplayName(profile)}
              avatarUrl={avatarPublicUrl(profile.avatarUrl)}
              displayName={profile.displayName}
              bio={profile.bio}
            />
          </div>
        </>
      ) : (
        <div className="mt-8">
          <ErrorState
            title="Your profile is missing"
            description="Your account exists but its profile row wasn't found. Sign out and back in; if it persists, the sign-up trigger needs checking."
          />
        </div>
      )}
    </Container>
  );
}
