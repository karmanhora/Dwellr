import {
  authorName,
  formatVideoDuration,
  postCategoriesLabel,
  postExcerpt,
  type PostSummary,
} from "@hauscrawl/core";
import Image from "next/image";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { postPhotoUrl, avatarPublicUrl } from "@/lib/storage";

export function PostCard({
  post,
  priority = false,
}: {
  post: PostSummary;
  priority?: boolean;
}) {
  const coverPath =
    post.kind === "video" ? post.videoPosterPath : (post.coverPhoto?.storagePath ?? null);
  const coverUrl = coverPath ? postPhotoUrl(coverPath) : null;
  const author = authorName(post.author);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(post.createdAt));

  return (
    <article className="group">
      <Link
        href={`/posts/${post.id}`}
        className="block overflow-hidden rounded-panel bg-mist focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        aria-label={`Open ${post.kind} post by ${author}`}
      >
        {coverUrl ? (
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={coverUrl}
              alt={post.coverPhoto?.altText ?? post.caption ?? "Community post"}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            {post.kind === "video" ? (
              <span className="absolute right-3 bottom-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-paper">
                {formatVideoDuration(post.durationSeconds ?? 0)} · Video
              </span>
            ) : post.photoCount > 1 ? (
              <span className="absolute right-3 bottom-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold text-paper">
                {post.photoCount} photos
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col justify-between bg-sand p-5">
            <Badge tone="community">Community post</Badge>
            <p className="mt-8 line-clamp-6 text-title leading-snug font-medium">
              {postExcerpt(post.caption, 220)}
            </p>
          </div>
        )}
      </Link>

      <div className="mt-3 flex items-start gap-3">
        <Link href={post.author ? `/u/${post.author.username}` : "#"} className="shrink-0">
          <Avatar
            name={author}
            src={avatarPublicUrl(post.author?.avatar_url ?? null)}
            size="xs"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={post.author ? `/u/${post.author.username}` : "#"}
              className="truncate text-body-sm font-medium hover:underline"
            >
              {author}
            </Link>
            <span className="text-caption text-stone">{date}</span>
          </div>
          {post.categories.length > 0 ? (
            <p className="mt-0.5 truncate text-caption text-stone">
              {postCategoriesLabel(post.categories)}
            </p>
          ) : null}
          {post.caption && coverUrl ? (
            <p className="mt-1 line-clamp-2 text-body-sm leading-relaxed text-ink/80">
              {postExcerpt(post.caption, 140)}
            </p>
          ) : null}
          {post.propertyId && post.propertyTitle ? (
            <Link
              href={`/p/${post.propertyId}`}
              className="mt-1 inline-block truncate text-caption text-stone underline underline-offset-4 hover:text-ink"
            >
              Tagged home: {post.propertyTitle}
            </Link>
          ) : post.neighborhood ? (
            <p className="mt-1 text-caption text-stone">
              {post.neighborhood}
              {post.city ? `, ${post.city}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
