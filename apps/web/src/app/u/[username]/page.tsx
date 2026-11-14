import {
  formatMemberSince,
  getDisplayName,
  type Profile,
} from "@dwellr/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropertyCard } from "@/components/property/property-card";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { getProfileByUsername, getPropertiesByCreator } from "@/lib/properties";
import { avatarPublicUrl } from "@/lib/storage";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) return { title: "Profile not found" };

  return {
    title: getDisplayName(profile),
    description: profile.bio ?? `@${profile.username} on dwellr.`,
  };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [posts, user, query] = await Promise.all([
    getPropertiesByCreator(profile.id),
    getCurrentUser(),
    searchParams,
  ]);

  const isOwner = Boolean(user && user.id === profile.id);
  const updated = (Array.isArray(query.updated) ? query.updated[0] : query.updated) === "1";

  return (
    <Container className="py-10 sm:py-14">
      <ProfileHeader profile={profile} isOwner={isOwner} />

      {updated ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Profile saved.
        </p>
      ) : null}

      <section aria-labelledby="posts-heading" className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="posts-heading" className="text-title font-medium">
            Homes posted
          </h2>
          <span className="text-caption text-stone">
            {posts.length} {posts.length === 1 ? "home" : "homes"}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={isOwner ? "You haven't posted a home yet." : "No homes posted yet."}
              description={
                isOwner
                  ? "Post the first home you're considering and it will appear here."
                  : "When this person posts a home, it will show up here."
              }
              action={
                isOwner ? (
                  <ButtonLink href="/create" size="sm">
                    Post a home
                  </ButtonLink>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((property, index) => (
              <li key={property.id}>
                <PropertyCard property={property} priority={index < 3} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

function ProfileHeader({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  return (
    <header className="border-b border-line pb-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            name={getDisplayName(profile)}
            src={avatarPublicUrl(profile.avatarUrl)}
            size="xl"
          />
          <div>
            <h1 className="text-headline font-medium tracking-[-0.03em]">
              {getDisplayName(profile)}
            </h1>
            <p className="mt-1 text-body-sm text-stone">@{profile.username}</p>
            <p className="mt-2 text-caption text-stone">{formatMemberSince(profile.createdAt)}</p>
          </div>
        </div>

        {isOwner ? (
          <div className="flex gap-2">
            <ButtonLink href="/settings/profile" variant="secondary" size="sm">
              Edit profile
            </ButtonLink>
            <ButtonLink href="/create" size="sm">
              Post a home
            </ButtonLink>
          </div>
        ) : null}
      </div>

      {profile.bio ? (
        <p className="mt-6 max-w-prose text-body leading-relaxed text-stone">{profile.bio}</p>
      ) : null}
    </header>
  );
}
