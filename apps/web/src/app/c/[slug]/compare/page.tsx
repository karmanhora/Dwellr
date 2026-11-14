import {
  formatCount,
  formatPrice,
  getDisplayName,
  summarizeCollectionComparison,
  type CollectionEvaluation,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { getCollectionBySlug } from "@/lib/collections";

type ComparePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Compare homes",
  robots: { index: false, follow: false },
};

function readHomes(value: string | string[] | undefined): string[] | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const ids = raw.split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  return ids.length > 0 ? ids.slice(0, 4) : null;
}

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const [result, query] = await Promise.all([
    getCollectionBySlug(slug, user?.id ?? null),
    searchParams,
  ]);

  if (result.status === "missing") notFound();
  if (result.status === "error") {
    return (
      <Container className="py-12">
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          We couldn&rsquo;t load this comparison. Try again.
        </p>
      </Container>
    );
  }

  const { collection, items, members, evaluations } = result;
  const requested = readHomes(query.homes);
  const selected = requested
    ? items.filter((item) => requested.includes(item.propertyId))
    : items.slice(0, 4);

  const comparison = summarizeCollectionComparison(
    selected.map((item) => ({
      property: item.property,
      evaluations: evaluations.filter((evaluation) => evaluation.propertyId === item.propertyId),
    })),
    members.map((member) => member.userId),
  );

  const ratingsFor = (propertyId: string, memberId: string): CollectionEvaluation | undefined =>
    evaluations.find(
      (evaluation) => evaluation.propertyId === propertyId && evaluation.userId === memberId,
    );

  return (
    <Container size="wide" className="py-10 sm:py-14">
      <Link
        href={`/c/${collection.shareSlug}`}
        className="inline-flex items-center gap-2 text-body-sm text-stone transition hover:text-ink"
      >
        <ArrowLeftIcon size={16} />
        {collection.name}
      </Link>

      <header className="mt-6 max-w-2xl">
        <p className="text-eyebrow text-stone uppercase">Side by side</p>
        <h1 className="mt-3 text-headline font-medium tracking-[-0.03em]">
          Compare {selected.length} {selected.length === 1 ? "home" : "homes"}
        </h1>
        <p className="mt-3 text-body leading-relaxed text-stone">
          Property facts come from the posts. Ratings and notes are each member&rsquo;s own
          opinion, never property facts.
        </p>
        <p className="mt-3 text-caption text-stone">
          {comparison.everyoneLikesCount} liked by everyone ·{" "}
          {comparison.disagreementCount} with a split opinion
        </p>
      </header>

      {selected.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing to compare yet"
            description="Add at least one home to this collection first."
            action={
              <ButtonLink href={`/c/${collection.shareSlug}`} size="sm">
                Back to collection
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">
              Homes side by side with property facts and each member&rsquo;s rating
            </caption>
            <thead>
              <tr className="border-b border-line bg-mist/60">
                <th scope="col" className="sticky left-0 z-10 bg-mist/60 px-4 py-4 text-caption text-stone">
                  Home
                </th>
                {selected.map((item) => (
                  <th key={item.propertyId} scope="col" className="min-w-48 px-4 py-4 align-top">
                    <Link
                      href={`/p/${item.propertyId}`}
                      className="text-body-sm font-medium text-ink hover:underline"
                    >
                      {item.property.title}
                    </Link>
                    <p className="mt-1 font-normal text-caption text-stone">
                      {item.property.neighborhood}, {item.property.city}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <th scope="row" className="sticky left-0 bg-paper px-4 py-3 text-body-sm font-medium">
                  Price
                </th>
                {selected.map((item) => (
                  <td key={item.propertyId} className="px-4 py-3 text-body-sm">
                    {formatPrice(item.property.priceCents, item.property.currency)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="sticky left-0 bg-paper px-4 py-3 text-body-sm font-medium">
                  Beds
                </th>
                {selected.map((item) => (
                  <td key={item.propertyId} className="px-4 py-3 text-body-sm">
                    {item.property.bedrooms === null ? "—" : formatCount(item.property.bedrooms)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="sticky left-0 bg-paper px-4 py-3 text-body-sm font-medium">
                  Baths
                </th>
                {selected.map((item) => (
                  <td key={item.propertyId} className="px-4 py-3 text-body-sm">
                    {item.property.bathrooms === null ? "—" : formatCount(item.property.bathrooms)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="sticky left-0 bg-paper px-4 py-3 text-body-sm font-medium">
                  Square feet
                </th>
                {selected.map((item) => (
                  <td key={item.propertyId} className="px-4 py-3 text-body-sm">
                    {item.property.squareFeet === null ? "—" : formatCount(item.property.squareFeet)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line bg-mist/40">
                <th scope="row" className="sticky left-0 bg-mist/40 px-4 py-3 text-body-sm font-medium">
                  Collection read
                </th>
                {comparison.homes.map((home) => (
                  <td key={home.property.id} className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {home.everyoneLikes ? <Badge tone="positive">Everyone likes</Badge> : null}
                      {home.disagreement ? <Badge tone="quiet">Split opinion</Badge> : null}
                      {!home.everyoneLikes && !home.disagreement ? (
                        <span className="text-caption text-stone">Still deciding</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-caption text-stone">
                      Average{" "}
                      {home.averageRating === null ? "not rated" : `${home.averageRating} / 5`}
                    </p>
                  </td>
                ))}
              </tr>

              {members.map((member) => (
                <tr key={member.userId} className="border-b border-line last:border-0">
                  <th scope="row" className="sticky left-0 bg-paper px-4 py-3 text-body-sm font-medium">
                    {member.displayName}
                    {user?.id === member.userId ? (
                      <span className="ml-1 font-normal text-stone">(you)</span>
                    ) : null}
                  </th>
                  {selected.map((item) => {
                    const rating = ratingsFor(item.propertyId, member.userId);
                    return (
                      <td key={item.propertyId} className="px-4 py-3 align-top text-body-sm">
                        {rating ? (
                          <>
                            <p className="font-medium">{rating.rating} / 5</p>
                            {rating.note ? (
                              <p className="mt-1 max-w-56 text-caption leading-relaxed text-stone">
                                {rating.note}
                              </p>
                            ) : null}
                            {rating.pros.length > 0 || rating.cons.length > 0 ? (
                              <p className="mt-1 max-w-56 text-caption text-stone">
                                {rating.pros.map((tag) => `+${tag}`).join(" · ")}
                                {rating.pros.length > 0 && rating.cons.length > 0 ? " · " : ""}
                                {rating.cons.map((tag) => `−${tag}`).join(" · ")}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-stone">Not rated</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-caption text-stone">
        Your collection is {collection.isPublic ? "public" : "private"}.{" "}
        {collection.isPublic
          ? "Anyone with the link can read this comparison; only members can rate."
          : "Only members can open this comparison."}
      </p>
      {result.owner ? (
        <p className="mt-1 text-caption text-stone">
          Shared by {getDisplayName(result.owner)}.
        </p>
      ) : null}
    </Container>
  );
}
