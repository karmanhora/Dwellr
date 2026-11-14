import {
  collectionVisibilityLabel,
  formatCollectionCount,
  formatMemberSince,
  getDisplayName,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  removeFromCollectionAction,
  setCollectionVisibilityAction,
} from "@/app/saved/actions";
import { DeleteCollectionButton } from "@/components/collections/delete-collection-button";
import { PropertyCard } from "@/components/property/property-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { getCollectionBySlug } from "@/lib/collections";
import { avatarPublicUrl } from "@/lib/storage";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCollectionBySlug(slug);

  if (result.status !== "ok") return { title: "Collection not found" };

  return {
    title: result.collection.name,
    description:
      result.collection.description ??
      `A collection of homes${result.owner ? ` by ${getDisplayName(result.owner)}` : ""} on dwellr.`,
    robots: result.collection.isPublic ? undefined : { index: false, follow: false },
  };
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;
  const [result, user, query] = await Promise.all([
    getCollectionBySlug(slug),
    getCurrentUser(),
    searchParams,
  ]);

  if (result.status === "missing") notFound();

  if (result.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="This collection didn't load"
          description="We couldn't read this collection. Try again in a moment."
          action={
            <ButtonLink href="/saved" variant="secondary" size="sm">
              Back to saved
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const { collection, owner, items } = result;
  const isOwner = Boolean(user && user.id === collection.ownerId);
  const added = (Array.isArray(query.added) ? query.added[0] : query.added) === "1";
  const updated = (Array.isArray(query.updated) ? query.updated[0] : query.updated) === "1";
  const itemError =
    (Array.isArray(query.itemError) ? query.itemError[0] : query.itemError) === "1";

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href={isOwner ? "/saved" : "/explore"}
        className="inline-flex items-center gap-2 text-body-sm text-stone transition hover:text-ink"
      >
        <ArrowLeftIcon size={16} />
        {isOwner ? "Saved homes" : "All homes"}
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={collection.isPublic ? "positive" : "quiet"}>
            {collectionVisibilityLabel(collection.isPublic)}
          </Badge>
          <span className="text-caption text-stone">
            {formatCollectionCount(collection.itemCount)}
          </span>
        </div>

        <h1 className="mt-4 text-headline font-medium tracking-[-0.03em]">{collection.name}</h1>

        {collection.description ? (
          <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
            {collection.description}
          </p>
        ) : null}

        {owner ? (
          <Link
            href={`/u/${owner.username}`}
            className="mt-6 inline-flex items-center gap-3 rounded-lg transition hover:opacity-80"
          >
            <Avatar
              name={getDisplayName(owner)}
              src={avatarPublicUrl(owner.avatarUrl)}
              size="sm"
            />
            <span>
              <span className="block text-body-sm font-medium text-ink">
                {getDisplayName(owner)}
              </span>
              <span className="block text-caption text-stone">
                @{owner.username} · {formatMemberSince(owner.createdAt)}
              </span>
            </span>
          </Link>
        ) : null}

        {isOwner ? (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <form action={setCollectionVisibilityAction}>
              <input type="hidden" name="collectionId" value={collection.id} />
              <input type="hidden" name="slug" value={collection.shareSlug} />
              <input type="hidden" name="isPublic" value={String(!collection.isPublic)} />
              <Button type="submit" variant="secondary" size="sm">
                {collection.isPublic ? "Make private" : "Publish collection"}
              </Button>
            </form>
            <DeleteCollectionButton collectionId={collection.id} />
          </div>
        ) : null}

        {isOwner && collection.isPublic ? (
          <p className="mt-4 text-caption text-stone">
            Anyone with <span className="text-ink">/c/{collection.shareSlug}</span> can view this
            collection.
          </p>
        ) : null}
        {isOwner && !collection.isPublic ? (
          <p className="mt-4 text-caption text-stone">
            Only you can see this collection. Publish it to share a link.
          </p>
        ) : null}
      </header>

      {added ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Home added to this collection.
        </p>
      ) : null}
      {updated ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Collection updated.
        </p>
      ) : null}
      {itemError ? (
        <p role="alert" className="mt-6 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          The collection was created, but the home could not be added. Add it again from the home
          page.
        </p>
      ) : null}

      <section aria-labelledby="collection-homes" className="mt-10">
        <h2 id="collection-homes" className="sr-only">
          Homes in this collection
        </h2>

        {items.length === 0 ? (
          <EmptyState
            title="This collection is empty"
            description={
              isOwner
                ? "Open a home and choose “Add to collection” to put it here."
                : "The owner hasn't added any homes yet."
            }
            action={
              isOwner ? (
                <ButtonLink href="/explore" size="sm">
                  Explore homes
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <li key={item.propertyId}>
                <PropertyCard property={item.property} priority={index < 3} />
                {item.note ? (
                  <p className="mt-3 border-l-2 border-line pl-3 text-body-sm leading-relaxed text-stone">
                    {item.note}
                  </p>
                ) : null}
                {isOwner ? (
                  <form action={removeFromCollectionAction} className="mt-3">
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <input type="hidden" name="propertyId" value={item.propertyId} />
                    <input type="hidden" name="slug" value={collection.shareSlug} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove from collection
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
