import {
  formatMemberSince,
  getDisplayName,
  type Profile,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  blockUserAction,
  followUserAction,
  unfollowUserAction,
} from "@/app/social/actions";
import { PostCard } from "@/components/posts/post-card";
import { PropertyCard } from "@/components/property/property-card";
import { ReportButton } from "@/components/social/report-button";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { getPostSummaries } from "@/lib/posts";
import { getProfileByUsername, getPropertiesByCreator } from "@/lib/properties";
import {
  getBlockState,
  getFollowCounts,
  getFollowerProfiles,
  getFollowingProfiles,
  getFollowState,
} from "@/lib/social";
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

  const user = await getCurrentUser();
  const [homes, communityPage, query, counts, following, followers, blocked] = await Promise.all([
    getPropertiesByCreator(profile.id),
    getPostSummaries({ authorId: profile.id, limit: 9 }),
    searchParams,
    getFollowCounts(profile.id),
    getFollowingProfiles(profile.id),
    getFollowerProfiles(profile.id),
    getBlockState(user?.id ?? null, profile.id),
  ]);
  const isFollowing = user ? await getFollowState(user.id, profile.id) : false;

  const isOwner = Boolean(user && user.id === profile.id);
  const updated = (Array.isArray(query.updated) ? query.updated[0] : query.updated) === "1";
  const followed = (Array.isArray(query.followed) ? query.followed[0] : query.followed) === "1";
  const postDeleted =
    (Array.isArray(query.postDeleted) ? query.postDeleted[0] : query.postDeleted) === "1";

  return (
    <Container className="py-10 sm:py-14">
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        followerCount={counts.followerCount}
        followingCount={counts.followingCount}
      />

      {updated ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Profile saved.
        </p>
      ) : null}
      {followed ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          You are following {profile.displayName ?? profile.username}.
        </p>
      ) : null}
      {postDeleted ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          That post and its media were deleted.
        </p>
      ) : null}

      {!isOwner && user ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <form action={isFollowing ? unfollowUserAction : followUserAction}>
            <input type="hidden" name="targetId" value={profile.id} />
            <input type="hidden" name="next" value={`/u/${profile.username}`} />
            <Button type="submit" variant={isFollowing ? "secondary" : "primary"} size="sm">
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </form>
          <ReportButton targetType="profile" targetId={profile.id} label="Report profile" />
          <form action={blockUserAction}>
            <input type="hidden" name="targetId" value={profile.id} />
            <Button type="submit" variant="ghost" size="sm">
              Block
            </Button>
          </form>
        </div>
      ) : null}

      {blocked.blockedByMe || blocked.blocksMe ? (
        <p className="mt-4 text-body-sm text-stone">
          This profile is hidden while a block is in place.
        </p>
      ) : null}

      <section aria-labelledby="posts-heading" className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="posts-heading" className="text-title font-medium">
            Homes posted
          </h2>
          <span className="text-caption text-stone">
            {homes.length} {homes.length === 1 ? "home" : "homes"}
          </span>
        </div>

        {homes.length === 0 ? (
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
                  <ButtonLink href="/create/home" size="sm">
                    List a home
                  </ButtonLink>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {homes.map((property, index) => (
              <li key={property.id}>
                <PropertyCard property={property} priority={index < 3} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="community-posts-heading" className="mt-14 border-t border-line pt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="community-posts-heading" className="text-title font-medium">
            Community posts
          </h2>
          <span className="text-caption text-stone">
            {communityPage.items.length} {communityPage.items.length === 1 ? "post" : "posts"}
          </span>
        </div>
        <p className="mt-1 text-caption text-stone">
          Written by {getDisplayName(profile)}. Not verified property facts.
        </p>

        {communityPage.failed ? (
          <p role="alert" className="mt-5 text-body-sm text-danger">
            Community posts didn&rsquo;t load.
          </p>
        ) : communityPage.items.length === 0 ? (
          <p className="mt-5 rounded-card border border-dashed border-line-strong bg-mist/40 px-4 py-6 text-body-sm text-stone">
            {isOwner
              ? "You haven't shared a post yet. Photos, notes, and short videos will appear here."
              : "No community posts yet."}
          </p>
        ) : (
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {communityPage.items.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}

        {isOwner ? (
          <div className="mt-5">
            <ButtonLink href="/create/post" variant="secondary" size="sm">
              Share a post
            </ButtonLink>
          </div>
        ) : null}
      </section>

      <div className="mt-14 grid gap-10 border-t border-line pt-10 sm:grid-cols-2">
        <PeopleList
          id="followers"
          title={`Followers (${counts.followerCount})`}
          people={followers}
          empty="No followers yet."
        />
        <PeopleList
          id="following"
          title={`Following (${counts.followingCount})`}
          people={following}
          empty="Not following anyone yet."
        />
      </div>
    </Container>
  );
}

function ProfileHeader({
  profile,
  isOwner,
  followerCount,
  followingCount,
}: {
  profile: Profile;
  isOwner: boolean;
  followerCount: number;
  followingCount: number;
}) {
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
            <div className="mt-3 flex gap-4 text-body-sm text-stone">
              <a href="#followers" className="hover:text-ink">
                <span className="font-medium text-ink">{followerCount}</span> followers
              </a>
              <a href="#following" className="hover:text-ink">
                <span className="font-medium text-ink">{followingCount}</span> following
              </a>
            </div>
          </div>
        </div>

        {isOwner ? (
          <div className="flex gap-2">
            <ButtonLink href="/settings/profile" variant="secondary" size="sm">
              Edit profile
            </ButtonLink>
            <ButtonLink href="/create" size="sm">
              Create
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

function PeopleList({
  id,
  title,
  people,
  empty,
}: {
  id: string;
  title: string;
  people: Profile[];
  empty: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-title font-medium">
        {title}
      </h2>
      {people.length === 0 ? (
        <p className="mt-2 text-body-sm text-stone">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/u/${person.username}`}
                className="flex items-center gap-3 py-3 transition hover:bg-mist/50"
              >
                <Avatar
                  name={getDisplayName(person)}
                  src={avatarPublicUrl(person.avatarUrl)}
                  size="xs"
                />
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium">
                    {getDisplayName(person)}
                  </span>
                  <span className="block truncate text-caption text-stone">@{person.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
