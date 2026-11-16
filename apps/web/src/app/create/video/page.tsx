import { canPublishPost, formatBytes } from "@hauscrawl/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PostForm } from "@/components/posts/post-form";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth";
import { getMediaUsage, getPostingActivity } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Share a short video",
  robots: { index: false, follow: false },
};

export default async function CreateVideoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/create/video");

  const [activity, usage] = await Promise.all([
    getPostingActivity(user.id),
    getMediaUsage(user.id),
  ]);
  const allowance = canPublishPost({
    kind: "video",
    postsLastHour: activity.postsLastHour,
    videosLastDay: activity.videosLastDay,
  });

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <Link href="/create" className="text-body-sm text-stone hover:text-ink">
        ← Create
      </Link>
      <p className="mt-5 text-eyebrow text-stone uppercase">Share a video</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Show a home in motion.
      </h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Thirty seconds is enough for a walkthrough, a before-and-after, or the block around a home.
        Keep identifying details out of frame.
      </p>

      <div className="mt-5 rounded-card border border-line bg-mist/50 px-4 py-3 text-caption leading-relaxed text-stone">
        <p>
          Video storage used: <strong className="font-medium text-ink">{formatBytes(usage.videoBytes)}</strong>{" "}
          of {formatBytes(usage.videoQuotaBytes)}.
        </p>
        <p className="mt-1">
          {activity.videosLastDay} of 3 videos published in the last day.
        </p>
        {!allowance.ok ? (
          <p role="alert" className="mt-1 text-danger">
            {allowance.message}
          </p>
        ) : null}
      </div>

      <div className="mt-10">
        <PostForm mode="video" userId={user.id} />
      </div>
    </Container>
  );
}
