import {
  authorName,
  formatVideoDuration,
  postCategoryLabel,
  type PostCategory,
} from "@dwellr/core";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SaveButton } from "@/components/collections/save-button";
import { CollectionPicker } from "@/components/collections/collection-picker";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { PostComments } from "@/components/posts/post-comments";
import { ReportButton } from "@/components/social/report-button";
import { toggleLikeAction } from "@/app/social/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HeartIcon, MapPinIcon, PencilIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { getWritableCollections, isPropertySaved } from "@/lib/collections";
import { getPostById, getPostLikeSummaries } from "@/lib/posts";
import { getComments } from "@/lib/social";
import { avatarPublicUrl, postPhotoUrl, postVideoUrl } from "@/lib/storage";

type PostPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(query: Record<string, string | string[] | undefined>, key: string): string | null {
  const value = Array.isArray(query[key]) ? query[key][0] : query[key];
  return value ?? null;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return { title: "Post not found" };
  return {
    title: post.author ? `Post by ${authorName(post.author)}` : "Community post",
    description: post.caption.slice(0, 160) || "A post from the HausCrawl community.",
    robots: { index: true, follow: true },
  };
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  const user = await getCurrentUser();
  const isOwner = Boolean(user && post.author?.id === user.id);
  const [comments, likeSummaries, collections, saved] = await Promise.all([
    getComments("post", post.id),
    getPostLikeSummaries([post.id], user?.id ?? null),
    user ? getWritableCollections(user.id) : Promise.resolve([]),
    user && post.propertyId ? isPropertySaved(post.propertyId, user.id) : Promise.resolve(false),
  ]);
  const likes = likeSummaries.get(post.id) ?? { count: 0, likedByMe: false };
  const query = await searchParams;
  const created = param(query, "created") === "1";
  const updated = param(query, "updated") === "1";
  const deleteError = param(query, "deleteError") === "1";
  const commentError = param(query, "commentError") ?? undefined;
  const author = authorName(post.author);

  return (
    <Container className="py-8 sm:py-12">
      <Link href="/posts" className="text-body-sm text-stone hover:text-ink">
        ← Community posts
      </Link>

      {created ? (
        <p role="status" className="mt-4 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Your post is live.
        </p>
      ) : null}
      {updated ? (
        <p role="status" className="mt-4 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Your changes are saved.
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="mt-4 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          That post couldn&rsquo;t be deleted. Try again.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={post.author ? `/u/${post.author.username}` : "#"}>
            <Avatar
              name={author}
              src={avatarPublicUrl(post.author?.avatar_url ?? null)}
              size="md"
            />
          </Link>
          <div>
            <Link
              href={post.author ? `/u/${post.author.username}` : "#"}
              className="text-body font-medium hover:underline"
            >
              {author}
            </Link>
            <p className="text-caption text-stone">
              @{post.author?.username ?? "unknown"} ·{" "}
              {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
                new Date(post.createdAt),
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="community">Community post</Badge>
          {isOwner ? (
            <>
              <ButtonLink href={`/posts/${post.id}/edit`} variant="secondary" size="sm">
                <PencilIcon size={15} /> Edit
              </ButtonLink>
              <DeletePostButton postId={post.id} redirectTo={`/posts/${post.id}`} />
            </>
          ) : user ? (
            <ReportButton targetType="post" targetId={post.id} label="Report post" />
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-12">
        <div className="min-w-0">
          {post.kind === "video" && post.video ? (
            <div className="overflow-hidden rounded-panel bg-ink">
              <video
                src={postVideoUrl(post.video.storagePath)}
                poster={postPhotoUrl(post.video.posterPath)}
                controls
                playsInline
                preload="metadata"
                className="mx-auto max-h-[75vh] w-full object-contain"
              />
            </div>
          ) : post.photos.length > 0 ? (
            <ul className={`grid gap-2 ${post.photos.length === 1 ? "" : "sm:grid-cols-2"}`}>
              {post.photos.map((photo, index) => (
                <li
                  key={photo.id}
                  className={`relative overflow-hidden rounded-card bg-mist ${
                    post.photos.length === 1 ? "aspect-[4/3]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={postPhotoUrl(photo.storagePath)}
                    alt={photo.altText ?? `Photo ${index + 1} from this post`}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1024px) 100vw, 65vw"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {post.caption ? (
            <p className="mt-6 max-w-prose text-body leading-relaxed whitespace-pre-line text-ink/90">
              {post.caption}
            </p>
          ) : null}

          {post.video?.captions ? (
            <details className="mt-5 max-w-prose rounded-card border border-line p-4">
              <summary className="cursor-pointer text-body-sm font-medium">
                Captions / transcript
              </summary>
              <p className="mt-3 text-body-sm leading-relaxed whitespace-pre-line text-stone">
                {post.video.captions}
              </p>
            </details>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {post.categories.map((category: PostCategory) => (
              <Link
                key={category}
                href={`/posts?category=${category}`}
                className="inline-flex h-8 items-center rounded-full border border-line px-3 text-caption text-stone hover:border-ink hover:text-ink"
              >
                {postCategoryLabel(category)}
              </Link>
            ))}
            {post.neighborhood ? (
              <span className="inline-flex h-8 items-center gap-1 rounded-full bg-mist px-3 text-caption text-stone">
                <MapPinIcon size={13} />
                {post.neighborhood}
                {post.city ? `, ${post.city}` : ""}
              </span>
            ) : null}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28">
          <div className="rounded-card border border-line p-4">
            <div className="flex items-center gap-3">
              {user ? (
                <form action={toggleLikeAction}>
                  <input type="hidden" name="targetType" value="post" />
                  <input type="hidden" name="targetId" value={post.id} />
                  <input type="hidden" name="next" value={`/posts/${post.id}`} />
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
              ) : (
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3.5 text-body-sm text-stone">
                  <HeartIcon size={16} /> {likes.count}
                </span>
              )}
              <Link
                href="#comments"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-body-sm text-stone hover:bg-mist hover:text-ink"
              >
                {comments.length} comments
              </Link>
            </div>

            {post.property && post.propertyId ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-stone uppercase">
                  Tagged home
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ProvenanceBadge provenance={post.property.verification} />
                  <span className="text-caption text-stone">property profile</span>
                </div>
                <Link
                  href={`/p/${post.propertyId}`}
                  className="mt-2 block text-body-sm font-medium hover:underline"
                >
                  {post.property.title}
                </Link>
                <p className="text-caption text-stone">
                  {post.property.neighborhood}, {post.property.city}
                </p>
                <ButtonLink href={`/p/${post.propertyId}`} size="sm" className="mt-3 w-full">
                  View property
                </ButtonLink>
                {user ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SaveButton propertyId={post.propertyId} saved={saved} />
                    <CollectionPicker propertyId={post.propertyId} collections={collections} />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 border-t border-line pt-3 text-caption leading-relaxed text-stone">
                No property is tagged. This post is community content, not a property profile.
              </p>
            )}

            <p className="mt-4 border-t border-line pt-3 text-caption leading-relaxed text-stone">
              Video and photos are user-generated. A tag links to a property profile but does not
              verify anything in this post.
            </p>
          </div>

          {post.kind === "video" && post.video ? (
            <p className="text-caption text-stone">
              {formatVideoDuration(post.video.durationSeconds)} · {post.video.width}×
              {post.video.height}
            </p>
          ) : null}
        </aside>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <PostComments
          postId={post.id}
          comments={comments}
          viewerId={user?.id ?? null}
          commentError={commentError}
        />
      </div>
    </Container>
  );
}
