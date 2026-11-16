import {
  collectionRoleLabel,
  collectionSharePath,
  collectionVisibilityLabel,
  formatCollectionCount,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CollectionCreateForm } from "@/components/collections/collection-create-form";
import { PropertyCard } from "@/components/property/property-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { Tabs } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { getSavedProperties, getUserCollections } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Saved homes",
  robots: { index: false, follow: false },
};

type SavedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/saved");

  const [saved, collections, query] = await Promise.all([
    getSavedProperties(user.id),
    getUserCollections(user.id),
    searchParams,
  ]);

  const deleted = (Array.isArray(query.deleted) ? query.deleted[0] : query.deleted) === "1";

  return (
    <Container className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Your library</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em]">Saved homes</h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Saves are private to you. Collections are lists you can keep to yourself or publish with a
        share link.
      </p>

      {deleted ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Collection deleted. The homes are still on HausCrawl.
        </p>
      ) : null}

      <Tabs
        className="mt-8"
        label="Saved homes and collections"
        tabs={[
          {
            id: "homes",
            label: `Homes (${saved.length})`,
            content:
              saved.length === 0 ? (
                <EmptyState
                  title="Nothing saved yet"
                  description="Save a home from its page and it will wait here while you decide."
                  action={
                    <ButtonLink href="/explore" size="sm">
                      Explore homes
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {saved.map((property, index) => (
                    <li key={property.id}>
                      <PropertyCard property={property} priority={index < 3} />
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            id: "collections",
            label: `Collections (${collections.length})`,
            content: (
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div>
                  {collections.length === 0 ? (
                    <EmptyState
                      title="No collections yet"
                      description="Make a list for the homes you're touring, the ones to compare, or the ones to share."
                    />
                  ) : (
                    <ul className="divide-y divide-line border-y border-line">
                      {collections.map((collection) => (
                        <li key={collection.id}>
                          <Link
                            href={collectionSharePath(collection.shareSlug)}
                            className="group flex items-center justify-between gap-4 py-4 transition hover:bg-mist/60"
                          >
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-body font-medium text-ink">
                                  {collection.name}
                                </span>
                                <Badge tone={collection.isPublic ? "positive" : "quiet"}>
                                  {collectionVisibilityLabel(collection.isPublic)}
                                </Badge>
                                {collection.viewerRole && collection.viewerRole !== "owner" ? (
                                  <Badge tone="quiet">
                                    Shared · {collectionRoleLabel(collection.viewerRole)}
                                  </Badge>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-caption text-stone">
                                {formatCollectionCount(collection.itemCount)}
                              </span>
                            </span>
                            <ArrowUpRightIcon
                              size={18}
                              className="shrink-0 text-stone transition group-hover:text-ink"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <CollectionCreateForm />
              </div>
            ),
          },
        ]}
      />
    </Container>
  );
}
