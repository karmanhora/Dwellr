import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  type ListingStatus,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";

import { PropertyCard } from "@/components/property/property-card";
import { SearchForm } from "@/components/search-form";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";
import { getPropertyFeed } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Explore homes",
  description:
    "Browse homes posted by the dwellr community — with every detail labelled as verified or community-added.",
};

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const status = LISTING_STATUSES.find((value) => value === readParam(params.status)) ?? null;
  const query = readParam(params.q)?.slice(0, 80) ?? null;
  const cursor = readParam(params.cursor);

  const [{ items, nextCursor, failed }, user] = await Promise.all([
    getPropertyFeed({ cursor, status, query }),
    getCurrentUser(),
  ]);

  const isFiltered = Boolean(query || status);
  const deleted = readParam(params.deleted) === "1";

  const moreParams = new URLSearchParams();
  if (query) moreParams.set("q", query);
  if (status) moreParams.set("status", status);
  if (nextCursor) moreParams.set("cursor", nextCursor);

  return (
    <Container className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Discover</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Homes worth a closer look.
      </h1>
      <p className="mt-3 max-w-xl text-body leading-relaxed text-stone">
        Every post is written by a person, not scraped from a listing site. Facts are labelled by
        where they came from.
      </p>

      <form
        action="/explore"
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
        role="search"
      >
        <SearchForm defaultValue={query ?? ""} className="flex-1" />
        <div className="flex gap-3">
          <label htmlFor="status-filter" className="sr-only">
            Listing status
          </label>
          <Select id="status-filter" name="status" defaultValue={status ?? ""} className="w-40">
            <option value="">Any status</option>
            {LISTING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LISTING_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-5 text-body-sm font-medium text-paper transition hover:bg-ink-soft"
          >
            Filter
          </button>
        </div>
      </form>

      {isFiltered ? (
        <p className="mt-4 text-caption text-stone">
          Showing {status ? LISTING_STATUS_LABELS[status as ListingStatus].toLowerCase() : "all"}{" "}
          homes{query ? ` matching “${query}”` : ""}.{" "}
          <Link href="/explore" className="text-ink underline underline-offset-4">
            Clear filters
          </Link>
        </p>
      ) : null}

      {deleted ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          That post and its photos were deleted.
        </p>
      ) : null}

      {failed ? (
        <div className="mt-10">
          <ErrorState
            title="The feed didn't load"
            description="We couldn't reach the property database. Your session is fine — try again."
            action={
              <ButtonLink href="/explore" variant="secondary" size="sm">
                Try again
              </ButtonLink>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={isFiltered ? "Nothing matched those filters." : "No homes yet. Be the first to post one."}
            description={
              isFiltered
                ? "Try a different neighborhood, city, or status."
                : "dwellr has no invented listings. The first home here will be posted by a person."
            }
            action={
              user ? (
                <ButtonLink href="/create" size="sm">
                  Post a home
                </ButtonLink>
              ) : (
                <ButtonLink href="/sign-up" size="sm">
                  Create an account
                </ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>

          {nextCursor ? (
            <div className="mt-14 flex justify-center">
              <ButtonLink href={`/explore?${moreParams.toString()}`} variant="secondary">
                Load more homes
              </ButtonLink>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
