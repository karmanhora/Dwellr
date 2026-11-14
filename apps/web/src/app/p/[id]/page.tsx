import {
  formatCount,
  formatMemberSince,
  formatPrice,
  getDisplayName,
  getPropertyVerification,
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type PropertyField,
} from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectionPicker } from "@/components/collections/collection-picker";
import { SaveButton } from "@/components/collections/save-button";
import { DeletePropertyButton } from "@/components/property/delete-property-button";
import { PropertyGallery } from "@/components/property/property-gallery";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ListingStatusBadge, ProvenanceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { ArrowLeftIcon, MapPinIcon, PencilIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { getUserCollections, isPropertySaved } from "@/lib/collections";
import { getPropertyDetail } from "@/lib/properties";
import { avatarPublicUrl, propertyPhotoUrl } from "@/lib/storage";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPropertyDetail(id);

  if (result.status !== "ok") {
    return { title: "Home not found" };
  }

  const property = result.property;
  const cover = property.photos[0]
    ? propertyPhotoUrl(property.photos[0].storagePath)
    : undefined;
  const description =
    property.description?.slice(0, 160) ??
    `A home in ${property.location.neighborhood}, ${property.location.city} on dwellr.`;

  return {
    title: property.title,
    description,
    openGraph: {
      title: property.title,
      description,
      type: "article",
      images: cover ? [{ url: cover, alt: property.photos[0]?.altText ?? property.title }] : undefined,
    },
    twitter: cover ? { card: "summary_large_image", images: [cover] } : undefined,
  };
}

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const { id } = await params;
  const result = await getPropertyDetail(id);

  if (result.status === "missing") notFound();

  if (result.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="This home didn't load"
          description="We couldn't read this property. Try again in a moment."
          action={
            <ButtonLink href="/explore" variant="secondary" size="sm">
              Back to explore
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const { property, creator } = result;
  const user = await getCurrentUser();
  const isOwner = Boolean(user && user.id === property.createdBy);
  const isSaved = user ? await isPropertySaved(property.id, user.id) : false;
  const collections = user ? await getUserCollections(user.id) : [];
  const paramsValue = await searchParams;
  const updated = (Array.isArray(paramsValue.updated) ? paramsValue.updated[0] : paramsValue.updated) === "1";

  const overallProvenance = getPropertyVerification(property.provenance);
  const location = [
    property.location.neighborhood,
    property.location.city,
    property.location.state,
  ]
    .filter(Boolean)
    .join(", ");

  const facts: { field: PropertyField; label: string; value: string }[] = [];
  if (property.bedrooms !== null) {
    facts.push({ field: "bedrooms", label: "Bedrooms", value: formatCount(property.bedrooms) });
  }
  if (property.bathrooms !== null) {
    facts.push({ field: "bathrooms", label: "Bathrooms", value: formatCount(property.bathrooms) });
  }
  if (property.squareFeet !== null) {
    facts.push({ field: "square_feet", label: "Square feet", value: formatCount(property.squareFeet) });
  }
  facts.push({
    field: "property_type",
    label: "Property type",
    value: PROPERTY_TYPE_LABELS[property.propertyType],
  });
  facts.push({
    field: "listing_status",
    label: "Listing status",
    value: LISTING_STATUS_LABELS[property.listingStatus],
  });

  const galleryPhotos = property.photos.map((photo) => ({
    id: photo.id,
    url: propertyPhotoUrl(photo.storagePath),
    alt: photo.altText,
  }));

  return (
    <Container className="py-8 sm:py-12">
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 text-body-sm text-stone transition hover:text-ink"
      >
        <ArrowLeftIcon size={16} />
        All homes
      </Link>

      {updated ? (
        <p role="status" className="mt-5 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Your changes are saved.
        </p>
      ) : null}

      {/** Mobile source order is gallery → summary → description so readers see
          the price before the long copy. `contents` lets those three items sit
          in one column on mobile while the gallery and description share a
          left column on desktop, where the summary sticks alongside. */}
      <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
        <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-10">
          <div className="order-1 lg:order-none">
            <PropertyGallery photos={galleryPhotos} title={property.title} />
          </div>

          <section
            aria-labelledby="about-heading"
            className="order-3 border-t border-line pt-8 lg:order-none lg:border-0 lg:pt-10"
          >
            <h2 id="about-heading" className="text-title font-medium">
              About this home
            </h2>
            {property.description ? (
              <p className="mt-4 max-w-prose text-body leading-relaxed whitespace-pre-line text-ink/85">
                {property.description}
              </p>
            ) : (
              <p className="mt-4 text-body-sm text-stone">
                The poster didn&rsquo;t add a description yet.
              </p>
            )}
          </section>
        </div>

        <aside
          aria-label="Home details"
          className="order-2 lg:sticky lg:top-28 lg:w-[22rem] lg:shrink-0 lg:self-start xl:w-[24rem]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <ListingStatusBadge status={property.listingStatus} />
            <ProvenanceBadge provenance={overallProvenance} />
          </div>

          <h1 className="mt-4 text-3xl leading-tight font-medium tracking-[-0.03em]">
            {property.title}
          </h1>

          <p className="mt-2 flex items-center gap-1.5 text-body-sm text-stone">
            <MapPinIcon size={16} className="shrink-0" />
            {location}
            {property.location.postalCode ? ` ${property.location.postalCode}` : ""}
          </p>

          <p className="mt-5 text-display font-medium tracking-[-0.03em]">
            {formatPrice(property.priceCents, property.currency)}
          </p>

          <dl className="mt-6 divide-y divide-line border-y border-line">
            {facts.map((fact) => (
              <div key={fact.field} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-body-sm text-stone">{fact.label}</dt>
                <dd className="flex items-center gap-2 text-body-sm font-medium text-ink">
                  {fact.value}
                  <span
                    className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${
                      property.provenance[fact.field] === "verified"
                        ? "text-moss"
                        : "text-stone-soft"
                    }`}
                  >
                    {property.provenance[fact.field] === "verified" ? "Verified" : "Community"}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          {property.location.latitude !== null && property.location.longitude !== null ? (
            <p className="mt-4 text-caption leading-relaxed text-stone">
              Approximate location only — rounded to about a kilometre. dwellr does not publish
              street addresses.
            </p>
          ) : null}

          {user ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <SaveButton propertyId={property.id} saved={isSaved} />
              <CollectionPicker propertyId={property.id} collections={collections} />
            </div>
          ) : null}

          {creator ? (
            <div className="mt-8 rounded-card border border-line p-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-stone uppercase">
                Posted by
              </p>
              <Link
                href={`/u/${creator.username}`}
                className="mt-3 flex items-center gap-3 rounded-lg transition hover:opacity-80"
              >
                <Avatar
                  name={getDisplayName(creator)}
                  src={avatarPublicUrl(creator.avatarUrl)}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium text-ink">
                    {getDisplayName(creator)}
                  </span>
                  <span className="block truncate text-caption text-stone">@{creator.username}</span>
                </span>
              </Link>
              <p className="mt-3 text-caption text-stone">{formatMemberSince(creator.createdAt)}</p>
            </div>
          ) : null}

          {isOwner ? (
            <div className="mt-4 flex gap-2">
              <ButtonLink href={`/p/${property.id}/edit`} variant="secondary" size="sm">
                <PencilIcon size={16} />
                Edit post
              </ButtonLink>
              <DeletePropertyButton propertyId={property.id} />
            </div>
          ) : null}

          <div className="mt-8 rounded-card bg-mist p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="verified">Verified</Badge>
              <Badge tone="community">Community</Badge>
            </div>
            <p className="mt-3 text-caption leading-relaxed text-stone">
              Community means the person who posted the home added it. Verified means dwellr
              confirmed it against a source. A post is only marked Verified when every fact is.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
