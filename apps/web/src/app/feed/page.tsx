import {
  feedRelevanceLabel,
  formatMemberSince,
  getDisplayName,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type Profile,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  followUserAction,
  saveFeedPreferencesAction,
} from "@/app/social/actions";
import { PostCard } from "@/components/posts/post-card";
import { PropertyCard } from "@/components/property/property-card";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getCurrentUser } from "@/lib/auth";
import { getPostSummaries } from "@/lib/posts";
import {
  getFeedPreferences,
  getPersonalizedFeed,
  getSuggestedPeople,
} from "@/lib/social";
import { avatarPublicUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Your feed",
  robots: { index: false, follow: false },
};

type FeedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const value = Array.isArray(query[key]) ? query[key][0] : query[key];
  return value ?? null;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/feed");

  const query = await searchParams;
  const cursor = param(query, "cursor");
  const [preferences, result, suggested, community] = await Promise.all([
    getFeedPreferences(user.id),
    getPersonalizedFeed({ userId: user.id, cursor }),
    getSuggestedPeople(user.id),
    getPostSummaries({ limit: 4 }),
  ]);

  const hasPreferences =
    preferences.neighborhoods.length > 0 || preferences.propertyTypes.length > 0;
  const saved = param(query, "saved") === "1";
  const preferencesError = param(query, "preferencesError") === "1";

  const more = new URLSearchParams();
  if (result.nextCursor) more.set("cursor", result.nextCursor);

  return (
    <Container className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">For you</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Your feed.
      </h1>
      <p className="mt-3 max-w-2xl text-body leading-relaxed text-stone">
        Homes from people you follow, plus recent homes in the neighborhoods and styles you chose.
        The order is simple: followed first, then preference matches, then newest.
      </p>

      {saved ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Feed preferences saved.
        </p>
      ) : null}
      {preferencesError ? (
        <p role="alert" className="mt-6 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          Those preferences didn&rsquo;t save. Choose up to ten neighborhoods and styles.
        </p>
      ) : null}

      {community.items.length > 0 ? (
        <section aria-labelledby="community-feed-heading" className="mt-10 border-b border-line pb-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="community-feed-heading" className="text-title font-medium">
                Community posts
              </h2>
              <p className="mt-1 text-caption text-stone">
                Photos, notes, and videos from people on dwellr. User content, not verified facts.
              </p>
            </div>
            <ButtonLink href="/posts" variant="secondary" size="sm">
              See all
            </ButtonLink>
          </div>
          <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
            {community.items.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {result.failed ? (
            <ErrorState
              title="Your feed didn't load"
              description="We couldn't reach the property database. Try again."
              action={
                <ButtonLink href="/feed" variant="secondary" size="sm">
                  Try again
                </ButtonLink>
              }
            />
          ) : result.items.length === 0 ? (
            <div>
              <EmptyState
                title="Your feed is quiet for now"
                description={
                  hasPreferences
                    ? "No recent homes match your neighborhoods and styles yet. Explore everything, or follow a few people so their homes show up here."
                    : "Choose a few neighborhoods and styles, or follow people whose homes you want to see."
                }
                action={
                  <ButtonLink href="/explore" size="sm">
                    Explore all homes
                  </ButtonLink>
                }
              />

              {suggested.length > 0 ? (
                <section aria-labelledby="suggested-heading" className="mt-10">
                  <h2 id="suggested-heading" className="text-title font-medium">
                    People to follow
                  </h2>
                  <p className="mt-1 text-body-sm text-stone">
                    Following adds their new homes to this feed.
                  </p>
                  <ul className="mt-4 divide-y divide-line border-y border-line">
                    {suggested.map((profile) => (
                      <SuggestedPerson key={profile.id} profile={profile} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
                {result.items.map((item, index) => (
                  <li key={item.property.id}>
                    <PropertyCard property={item.property} priority={index < 2} />
                    <p className="mt-2 text-caption text-stone">
                      {feedRelevanceLabel(item.relevance)}
                    </p>
                  </li>
                ))}
              </ul>

              {result.nextCursor ? (
                <div className="mt-12 flex justify-center">
                  <ButtonLink href={`/feed?${more.toString()}`} variant="secondary">
                    More homes
                  </ButtonLink>
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="preferences-heading" className="rounded-card border border-line p-4">
            <h2 id="preferences-heading" className="text-title font-medium">
              Your preferences
            </h2>
            <p className="mt-1 text-caption leading-relaxed text-stone">
              Only these explicit choices feed the ranking. Nothing is inferred from clicks.
            </p>

            <form action={saveFeedPreferencesAction} className="mt-4 space-y-4">
              <div>
                <label htmlFor="feed-neighborhoods" className="text-body-sm font-medium">
                  Neighborhoods
                </label>
                <textarea
                  id="feed-neighborhoods"
                  name="neighborhoods"
                  rows={2}
                  defaultValue={preferences.neighborhoods.join(", ")}
                  placeholder="Juniper Heights, Alberta Arts"
                  className="mt-1.5 min-h-20 w-full resize-y rounded-control border border-line bg-paper px-3.5 py-3 text-body leading-relaxed outline-none placeholder:text-stone-soft focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
                <p className="mt-1 text-caption text-stone">Comma separated, up to ten.</p>
              </div>

              <fieldset>
                <legend className="text-body-sm font-medium">Styles</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PROPERTY_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-body-sm text-ink">
                      <input
                        type="checkbox"
                        name="propertyTypes"
                        value={type}
                        defaultChecked={preferences.propertyTypes.includes(type)}
                        className="h-4 w-4 rounded border-line text-ink"
                      />
                      {PROPERTY_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" size="sm">
                Save preferences
              </Button>
            </form>
          </section>

          {suggested.length > 0 && result.items.length > 0 ? (
            <section aria-labelledby="people-heading" className="rounded-card border border-line p-4">
              <h2 id="people-heading" className="text-title font-medium">
                People to follow
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {suggested.slice(0, 4).map((profile) => (
                  <SuggestedPerson key={profile.id} profile={profile} compact />
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}

function SuggestedPerson({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  return (
    <li className={compact ? "py-3 first:pt-0 last:pb-0" : "py-4 first:pt-0 last:pb-0"}>
      <div className="flex items-center gap-3">
        <Avatar
          name={getDisplayName(profile)}
          src={avatarPublicUrl(profile.avatarUrl)}
          size="xs"
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
        <form action={followUserAction}>
          <input type="hidden" name="targetId" value={profile.id} />
          <input type="hidden" name="next" value="/feed" />
          <Button type="submit" variant="secondary" size="sm">
            Follow
          </Button>
        </form>
      </div>
    </li>
  );
}
