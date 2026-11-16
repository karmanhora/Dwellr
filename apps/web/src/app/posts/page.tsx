import { POST_CATEGORIES, POST_CATEGORY_LABELS } from "@hauscrawl/core";
import type { Metadata } from "next";
import Link from "next/link";

import { PostCard } from "@/components/posts/post-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getCurrentUser } from "@/lib/auth";
import { getPostSummaries } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Community posts",
  description:
    "Home tours, renovations, interiors, and neighborhood notes from the HausCrawl community.",
};

type PostsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(query: Record<string, string | string[] | undefined>, key: string): string | null {
  const value = Array.isArray(query[key]) ? query[key][0] : query[key];
  return value ?? null;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const query = await searchParams;
  const category = POST_CATEGORIES.find((value) => value === param(query, "category")) ?? null;
  const cursor = param(query, "cursor");
  const [result, user] = await Promise.all([
    getPostSummaries({ category: category ?? undefined, cursor }),
    getCurrentUser(),
  ]);

  const more = new URLSearchParams();
  if (category) more.set("category", category);
  if (result.nextCursor) more.set("cursor", result.nextCursor);

  return (
    <Container className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Community</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Notes from real homes.
      </h1>
      <p className="mt-3 max-w-2xl text-body leading-relaxed text-stone">
        Posts and videos are written by people in the HausCrawl community. They are never presented as
        verified property facts; tagged homes keep their own labels.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/posts"
          aria-current={!category ? "page" : undefined}
          className={`inline-flex h-8 items-center rounded-full border px-3 text-caption transition ${
            !category ? "border-ink bg-ink text-paper" : "border-line text-stone hover:border-ink hover:text-ink"
          }`}
        >
          All
        </Link>
        {POST_CATEGORIES.map((value) => (
          <Link
            key={value}
            href={`/posts?category=${value}`}
            aria-current={category === value ? "page" : undefined}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-caption transition ${
              category === value
                ? "border-ink bg-ink text-paper"
                : "border-line text-stone hover:border-ink hover:text-ink"
            }`}
          >
            {POST_CATEGORY_LABELS[value]}
          </Link>
        ))}
      </div>

      {result.failed ? (
        <div className="mt-10">
          <ErrorState
            title="Posts didn't load"
            description="We couldn't reach the post database. Try again."
            action={
              <ButtonLink href="/posts" variant="secondary" size="sm">
                Try again
              </ButtonLink>
            }
          />
        </div>
      ) : result.items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={category ? "No posts in this topic yet" : "No community posts yet"}
            description="Share a room, a renovation, a walkthrough, or a neighborhood observation."
            action={
              user ? (
                <ButtonLink href="/create/post" size="sm">
                  Share a post
                </ButtonLink>
              ) : (
                <ButtonLink href="/sign-up" size="sm">
                  Join HausCrawl
                </ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post, index) => (
              <li key={post.id}>
                <PostCard post={post} priority={index < 3} />
              </li>
            ))}
          </ul>
          {result.nextCursor ? (
            <div className="mt-12 flex justify-center">
              <ButtonLink href={`/posts?${more.toString()}`} variant="secondary">
                More posts
              </ButtonLink>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
