import {
  formatCount,
  formatMemberSince,
  formatPrice,
  getDisplayName,
  getListingFreshness,
  getPropertyVerification,
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type Comment,
  type PropertyField,
} from "@hauscrawl/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectionPicker } from "@/components/collections/collection-picker";
import { SaveButton } from "@/components/collections/save-button";
import { reconfirmPropertyAction } from "@/app/p/[id]/actions";
import {
  createCommentAction,
  deleteCommentAction,
  toggleLikeAction,
} from "@/app/social/actions";
import { PostCard } from "@/components/posts/post-card";
import { ReportButton } from "@/components/social/report-button";
import { DeletePropertyButton } from "@/components/property/delete-property-button";
import { PropertyGallery } from "@/components/property/property-gallery";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ListingStatusBadge, ProvenanceBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { ArrowLeftIcon, HeartIcon, MapPinIcon, PencilIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";
import { getWritableCollections, isPropertySaved } from "@/lib/collections";
import { getPostSummaries } from "@/lib/posts";
import { getPropertyDetail } from "@/lib/properties";
import { getComments, getLikeSummaries } from "@/lib/social";
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
    `A home in ${property.location.neighborhood}, ${property.location.city} on HausCrawl.`;

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

  const { property, creator, priceCut, lastConfirmedAt } = result;
  const freshness = getListingFreshness(property.createdAt, lastConfirmedAt);
  const user = await getCurrentUser();
  const isOwner = Boolean(user && user.id === property.createdBy);
  const [isSaved, collections, likeSummaries, comments, communityPosts] = await Promise.all([
    user ? isPropertySaved(property.id, user.id) : Promise.resolve(false),
    user ? getWritableCollections(user.id) : Promise.resolve([]),
    getLikeSummaries([property.id], user?.id ?? null),
    getComments("property", property.id),
    getPostSummaries({ propertyId: property.id, limit: 6 }),
  ]);
  const likes = likeSummaries.get(property.id) ?? { count: 0, likedByMe: false };
  const paramsValue = await searchParams;
  const commentError = (Array.isArray(paramsValue.commentError)
    ? paramsValue.commentError[0]
    : paramsValue.commentError) as string | undefined;
  const updated = (Array.isArray(paramsValue.updated) ? paramsValue.updated[0] : paramsValue.updated) === "1";
  const confirmed =
    (Array.isArray(paramsValue.confirmed) ? paramsValue.confirmed[0] : paramsValue.confirmed) === "1";

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

      {confirmed ? (
        <p role="status" className="mt-5 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Listing freshness updated. Thanks for keeping it current.
        </p>
      ) : null}

      {isOwner ? (
        <section
          aria-label="Listing freshness"
          className={`mt-5 rounded-card border p-4 ${
            freshness.stale ? "border-ink/25 bg-sand" : "border-line bg-mist/60"
          }`}
        >
          <p className="text-body-sm font-medium text-ink">
            {freshness.stale ? "Is this listing still accurate?" : "Keep this listing current"}
          </p>
          <p className="mt-1 text-caption leading-relaxed text-stone">
            {freshness.stale
              ? `${freshness.label}. Reconfirm it so buyers know the home is still available and the details still hold.`
              : `${freshness.label}. You can reconfirm at any time.`}
          </p>
          <form action={reconfirmPropertyAction} className="mt-3">
            <input type="hidden" name="propertyId" value={property.id} />
            <Button type="submit" size="sm" variant={freshness.stale ? "primary" : "secondary"}>
              Confirm listing is accurate
            </Button>
          </form>
        </section>
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

          <section
            aria-labelledby="community-posts-heading"
            className="order-4 border-t border-line pt-8 lg:order-none lg:border-0 lg:pt-10"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="community-posts-heading" className="text-title font-medium">
                Community posts
              </h2>
              <span className="text-caption text-stone">
                {communityPosts.items.length}{" "}
                {communityPosts.items.length === 1 ? "post" : "posts"}
              </span>
            </div>
            <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-stone">
              These posts were written by people and tagged to this home. They are user content,
              not verified property facts, and do not change this home&rsquo;s labels.
            </p>

            {communityPosts.failed ? (
              <p role="alert" className="mt-4 text-body-sm text-danger">
                Community posts didn&rsquo;t load.
              </p>
            ) : communityPosts.items.length === 0 ? (
              <p className="mt-5 rounded-card border border-dashed border-line-strong bg-mist/40 px-4 py-6 text-body-sm text-stone">
                No community posts have tagged this home yet.
              </p>
            ) : (
              <ul className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2">
                {communityPosts.items.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            id="comments"
            aria-labelledby="comments-heading"
            className="order-5 border-t border-line pt-8 lg:order-none lg:border-0 lg:pt-10"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="comments-heading" className="text-title font-medium">
                Conversation
              </h2>
              <span className="text-caption text-stone">
                {comments.length} {comments.length === 1 ? "thread" : "threads"}
              </span>
            </div>
            <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-stone">
              Comments are written by people. They are never property facts and never change a
              Verified or Community label.
            </p>

            {commentError ? (
              <p role="alert" className="mt-4 rounded-card bg-danger-soft px-3 py-2 text-body-sm text-danger">
                {commentError === "rate"
                  ? "You are commenting too quickly. Wait a minute and try again."
                  : "That comment didn't send. Try again."}
              </p>
            ) : null}

            {comments.length === 0 ? (
              <p className="mt-5 rounded-card border border-dashed border-line-strong bg-mist/40 px-4 py-6 text-body-sm text-stone">
                No comments yet. Ask the poster a question or leave what you noticed.
              </p>
            ) : (
              <ol className="mt-6 space-y-5">
                {comments.map((comment) => (
                  <li key={comment.id}>
                    <CommentItem
                      comment={comment}
                      propertyId={property.id}
                      userId={user?.id ?? null}
                      canModerate={isOwner}
                    />
                  </li>
                ))}
              </ol>
            )}

            {user ? (
              <form action={createCommentAction} className="mt-6 rounded-card border border-line p-4">
                <input type="hidden" name="targetType" value="property" />
                <input type="hidden" name="targetId" value={property.id} />
                <input type="hidden" name="next" value={`/p/${property.id}#comments`} />
                <label htmlFor="comment-body" className="text-body-sm font-medium">
                  Add a comment
                </label>
                <Textarea
                  id="comment-body"
                  name="body"
                  required
                  maxLength={1000}
                  rows={3}
                  className="mt-2"
                  placeholder="What did you notice? Keep it useful and civil."
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-caption text-stone">Up to 1000 characters.</span>
                  <Button type="submit" size="sm">
                    Post comment
                  </Button>
                </div>
              </form>
            ) : (
              <p className="mt-5 text-body-sm text-stone">
                <Link href={`/sign-in?next=/p/${property.id}`} className="text-ink underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to join the conversation.
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

          <p className="mt-2 text-caption text-stone">
            {freshness.label}
            {freshness.stale ? " · not recently confirmed" : ""}
          </p>

          <p className="mt-5 text-display font-medium tracking-[-0.03em]">
            {formatPrice(property.priceCents, property.currency)}
          </p>

          {priceCut ? (
            <p className="mt-2 text-body-sm font-medium text-moss">
              Price reduced {formatPrice(priceCut.amountCents, property.currency)}
              <span className="font-normal text-stone">
                {" "}
                · observed{" "}
                {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                  new Date(priceCut.recordedAt),
                )}
              </span>
            </p>
          ) : null}

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
              Approximate location only — rounded to about a kilometre. HausCrawl does not publish
              street addresses.
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {user ? (
              <form action={toggleLikeAction}>
                <input type="hidden" name="targetType" value="property" />
                <input type="hidden" name="targetId" value={property.id} />
                <input type="hidden" name="next" value={`/p/${property.id}#comments`} />
                <Button
                  type="submit"
                  variant={likes.likedByMe ? "secondary" : "primary"}
                  size="sm"
                  aria-pressed={likes.likedByMe}
                >
                  <HeartIcon size={16} filled={likes.likedByMe} />
                  {likes.likedByMe ? "Liked" : "Like"}
                  {likes.count > 0 ? ` · ${likes.count}` : ""}
                </Button>
              </form>
            ) : likes.count > 0 ? (
              <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3.5 text-body-sm text-stone">
                <HeartIcon size={16} /> {likes.count}
              </span>
            ) : null}

            {user ? (
              <>
                <SaveButton propertyId={property.id} saved={isSaved} />
                <CollectionPicker propertyId={property.id} collections={collections} />
              </>
            ) : null}
          </div>

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
          ) : user ? (
            <div className="mt-4">
              <ReportButton targetType="property" targetId={property.id} label="Report this home" />
            </div>
          ) : null}

          <div className="mt-8 rounded-card bg-mist p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="verified">Verified</Badge>
              <Badge tone="community">Community</Badge>
            </div>
            <p className="mt-3 text-caption leading-relaxed text-stone">
              Community means the person who posted the home added it. Verified means HausCrawl
              confirmed it against a source. A post is only marked Verified when every fact is.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function CommentItem({
  comment,
  propertyId,
  userId,
  canModerate,
}: {
  comment: Comment;
  propertyId: string;
  userId: string | null;
  canModerate: boolean;
}) {
  const authorName = comment.author?.display_name ?? comment.author?.username ?? "Someone";
  const canDelete = Boolean(
    userId && (userId === comment.author?.id || canModerate),
  );

  return (
    <article id={`comment-${comment.id}`} className="rounded-card border border-line p-4">
      <div className="flex items-center gap-3">
        <Avatar
          name={authorName}
          src={avatarPublicUrl(comment.author?.avatar_url ?? null)}
          size="xs"
        />
        <div className="min-w-0">
          {comment.author ? (
            <Link
              href={`/u/${comment.author.username}`}
              className="text-body-sm font-medium hover:underline"
            >
              {authorName}
            </Link>
          ) : (
            <span className="text-body-sm font-medium">Former member</span>
          )}
          <p className="text-caption text-stone">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(comment.createdAt))}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-stone uppercase">
          Comment
        </span>
      </div>

      {comment.deleted ? (
        <p className="mt-3 text-body-sm text-stone italic">This comment was deleted.</p>
      ) : (
        <p className="mt-3 text-body-sm leading-relaxed whitespace-pre-line text-ink/85">
          {comment.body}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {!comment.deleted && comment.parentId === null && userId ? (
          <details className="w-full">
            <summary className="cursor-pointer text-caption font-medium text-stone hover:text-ink">
              Reply
            </summary>
            <form action={createCommentAction} className="mt-3">
              <input type="hidden" name="targetType" value="property" />
              <input type="hidden" name="targetId" value={propertyId} />
              <input type="hidden" name="parentId" value={comment.id} />
              <input type="hidden" name="next" value={`/p/${propertyId}#comments`} />
              <label htmlFor={`reply-${comment.id}`} className="sr-only">
                Reply to {authorName}
              </label>
              <Textarea
                id={`reply-${comment.id}`}
                name="body"
                required
                maxLength={1000}
                rows={2}
                placeholder={`Reply to ${authorName}`}
                className="min-h-20"
              />
              <Button type="submit" size="sm" className="mt-2">
                Post reply
              </Button>
            </form>
          </details>
        ) : null}

        {userId ? (
          <ReportButton targetType="comment" targetId={comment.id} label="Report" />
        ) : null}

        {canDelete && !comment.deleted ? (
          <form action={deleteCommentAction}>
            <input type="hidden" name="commentId" value={comment.id} />
            <input type="hidden" name="targetId" value={propertyId} />
            <input type="hidden" name="next" value={`/p/${propertyId}#comments`} />
            <Button type="submit" variant="ghost" size="sm">
              Delete
            </Button>
          </form>
        ) : null}
      </div>

      {comment.replies.length > 0 ? (
        <ol className="mt-4 space-y-4 border-l border-line pl-4">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentItem
                comment={reply}
                propertyId={propertyId}
                userId={userId}
                canModerate={canModerate}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}
