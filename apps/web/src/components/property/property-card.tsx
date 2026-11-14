import {
  formatCount,
  formatPrice,
  LISTING_STATUS_LABELS,
  type PropertySummary,
} from "@dwellr/core";
import Image from "next/image";
import Link from "next/link";

import { HouseMark } from "@/components/brand/logo";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { MapPinIcon } from "@/components/ui/icons";
import { propertyPhotoUrl } from "@/lib/storage";

/**
 * Photography first: fixed 4:3 frame so images never shift the grid, then the
 * facts people scan for (price, beds, baths, size, place) and the provenance
 * tag — which is always present, never decorative.
 */
export function PropertyCard({
  property,
  priority = false,
}: {
  property: PropertySummary;
  /** First row of a grid: load eagerly so it can be the LCP image. */
  priority?: boolean;
}) {
  const cover = property.coverPhoto ? propertyPhotoUrl(property.coverPhoto.storagePath) : null;
  const alt = property.coverPhoto?.altText ?? `${property.title} in ${property.city}`;

  return (
    <article className="group relative">
      <Link
        href={`/p/${property.id}`}
        className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-mist">
          {cover ? (
            <Image
              src={cover}
              alt={alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading={priority ? "eager" : "lazy"}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-stone">
              <HouseMark className="h-10 w-10 opacity-30" />
              <span className="text-caption">No photo yet</span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge
              tone={property.listingStatus === "for_sale" ? "positive" : "neutral"}
              className="backdrop-blur-none"
            >
              {LISTING_STATUS_LABELS[property.listingStatus]}
            </Badge>
            {property.priceCut ? <Badge tone="positive">Price cut</Badge> : null}
          </div>

          {property.photoCount > 1 ? (
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] font-medium tracking-wide text-paper">
              {property.photoCount} photos
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lead font-medium text-ink">{formatPrice(property.priceCents, property.currency)}</p>
            <ProvenanceBadge provenance={property.verification} />
          </div>

          <h2 className="mt-1.5 truncate text-body font-medium text-ink group-hover:underline group-hover:underline-offset-4">
            {property.title}
          </h2>

          <p className="mt-1 flex items-center gap-1 text-body-sm text-stone">
            <MapPinIcon size={14} className="shrink-0" />
            <span className="truncate">
              {property.neighborhood}, {property.city}
              {property.state ? `, ${property.state}` : ""}
            </span>
          </p>

          <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-stone">
            {property.bedrooms !== null ? <li>{formatCount(property.bedrooms)} beds</li> : null}
            {property.bathrooms !== null ? <li>{formatCount(property.bathrooms)} baths</li> : null}
            {property.squareFeet !== null ? (
              <li>{formatCount(property.squareFeet)} sq ft</li>
            ) : null}
          </ul>
        </div>
      </Link>
    </article>
  );
}
