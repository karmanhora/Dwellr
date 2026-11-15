import { canPublishPost, formatBytes } from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth";
import { getMediaUsage, getPostingActivity } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Share a post",
  robots: { index: false, follow: false },
};

export default async function CreatePostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/create/post");

  const [activity, usage] = await Promise.all([
    getPostingActivity(user.id),
    getMediaUsage(user.id),
  ]);
  const allowance = canPublishPost({
    kind: "photo",
    postsLastHour: activity.postsLastHour,
    videosLastDay: activity.videosLastDay,
  });

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <Link href="/create" className="text-body-sm text-stone hover:text-ink">
        ← Create
      </Link>
      <p className="mt-5 text-eyebrow text-stone uppercase">Share a post</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        What caught your eye?
      </h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Text or photos, with optional topics, a home, and a neighborhood. Your words are your own —
        not a property listing.
      </p>

      <div className="mt-5 rounded-card border border-line bg-mist/50 px-4 py-3 text-caption leading-relaxed text-stone">
        <p>
          Photo storage used: <strong className="font-medium text-ink">{formatBytes(usage.photoBytes)}</strong>{" "}
          of {formatBytes(usage.photoQuotaBytes)}.
        </p>
        {!allowance.ok ? (
          <p role="alert" className="mt-1 text-danger">
            {allowance.message}
          </p>
        ) : null}
      </div>

      <div className="mt-10">
        <PostForm mode="post" userId={user.id} />
      </div>
    </Container>
  );
}
