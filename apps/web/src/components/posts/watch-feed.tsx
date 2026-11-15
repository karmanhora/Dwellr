"use client";

import {
  authorName,
  formatVideoDuration,
  postCategoriesLabel,
  postExcerpt,
  watchRelevanceLabel,
  WATCH_MUTE_STORAGE_KEY,
  type Collection,
  type WatchItem,
} from "@dwellr/core";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { toggleLikeAction } from "@/app/social/actions";
import { CollectionPicker } from "@/components/collections/collection-picker";
import { ReportButton } from "@/components/social/report-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  HeartIcon,
  MessageIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import { avatarPublicUrl, postPhotoUrl, postVideoUrl } from "@/lib/storage";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type SaveDataConnection = EventTarget & { saveData?: boolean };

function getConnection(): SaveDataConnection | undefined {
  return (navigator as Navigator & { connection?: SaveDataConnection }).connection;
}

function subscribeSaveData(onChange: () => void) {
  const connection = getConnection();
  connection?.addEventListener?.("change", onChange);
  return () => connection?.removeEventListener?.("change", onChange);
}

function getSaveData() {
  return Boolean(getConnection()?.saveData);
}

type WatchFeedProps = {
  initialItems: WatchItem[];
  initialCursor: string | null;
  failed: boolean;
  viewerId: string | null;
  collections: Collection[];
};

function WatchDetails({
  item,
  viewerId,
  collections,
}: {
  item: WatchItem;
  viewerId: string | null;
  collections: Collection[];
}) {
  const { post } = item;
  const author = authorName(post.author);
  const location = [post.neighborhood, post.city].filter(Boolean).join(", ");

  return (
    <div className="text-ink">
      <div className="flex items-start gap-3">
        <Link href={post.author ? `/u/${post.author.username}` : "#"} className="shrink-0">
          <Avatar
            name={author}
            src={avatarPublicUrl(post.author?.avatar_url ?? null)}
            size="sm"
          />
        </Link>
        <div className="min-w-0">
          <Link
            href={post.author ? `/u/${post.author.username}` : "#"}
            className="block truncate text-body-sm font-medium hover:underline"
          >
            {author}
          </Link>
          <p className="text-caption text-stone">Community video · {watchRelevanceLabel(item.relevance)}</p>
        </div>
      </div>

      {post.caption ? (
        <p className="mt-3 text-body-sm leading-relaxed whitespace-pre-line">
          {postExcerpt(post.caption, 260)}
        </p>
      ) : null}

      {post.categories.length > 0 ? (
        <p className="mt-2 text-caption text-stone">{postCategoriesLabel(post.categories)}</p>
      ) : null}

      {post.property && post.propertyId ? (
        <div className="mt-3 rounded-card border border-line bg-mist/70 p-3">
          <div className="flex items-center gap-2">
            <Badge tone={post.property.verification === "verified" ? "verified" : "community"}>
              {post.property.verification === "verified" ? "Verified home" : "Community home"}
            </Badge>
            <span className="text-caption text-stone">Property profile</span>
          </div>
          <p className="mt-2 text-body-sm font-medium">{post.property.title}</p>
          <p className="text-caption text-stone">
            {post.property.neighborhood}, {post.property.city}
          </p>
          <ButtonLink href={`/p/${post.propertyId}`} size="sm" className="mt-3 w-full">
            View property
          </ButtonLink>
        </div>
      ) : location ? (
        <p className="mt-2 text-caption text-stone">{location}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-2">
        {viewerId ? (
          <form action={toggleLikeAction}>
            <input type="hidden" name="targetType" value="post" />
            <input type="hidden" name="targetId" value={post.id} />
            <input type="hidden" name="next" value="/watch" />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              aria-pressed={item.likedByMe}
              aria-label={item.likedByMe ? "Unlike video" : "Like video"}
            >
              <HeartIcon size={16} filled={item.likedByMe} />
              {item.likeCount > 0 ? item.likeCount : "Like"}
            </Button>
          </form>
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 px-3 text-body-sm text-stone">
            <HeartIcon size={16} /> {item.likeCount}
          </span>
        )}

        <Link
          href={`/posts/${post.id}#comments`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-body-sm text-ink transition hover:bg-mist"
        >
          <MessageIcon size={16} />
          {item.commentCount > 0 ? item.commentCount : "Comment"}
        </Link>

        {viewerId && post.propertyId ? (
          <CollectionPicker propertyId={post.propertyId} collections={collections} />
        ) : null}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
        <ShareButton postId={post.id} caption={post.caption} />
        {viewerId ? <ReportButton targetType="post" targetId={post.id} label="Report" /> : null}
      </div>
    </div>
  );
}

function ShareButton({ postId, caption }: { postId: string; caption: string }) {
  const [message, setMessage] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/posts/${postId}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "A home video on dwellr", text: postExcerpt(caption, 100), url });
        setMessage("Shared.");
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied.");
      }
    } catch {
      // A cancelled share is not an error worth shouting about.
      setMessage("");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={share}>
        Share
      </Button>
      <span role="status" className="text-caption text-stone">
        {message}
      </span>
    </span>
  );
}

export function WatchFeed({
  initialItems,
  initialCursor,
  failed: initiallyFailed,
  viewerId,
  collections,
}: WatchFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [failed, setFailed] = useState(initiallyFailed);
  const [loadingMore, setLoadingMore] = useState(false);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const saveData = useSyncExternalStore(subscribeSaveData, getSaveData, () => false);
  const [announcement, setAnnouncement] = useState("");
  const articles = useRef<(HTMLElement | null)[]>([]);
  const videos = useRef(new Map<number, HTMLVideoElement>());

  useEffect(() => {
    // Deferred so hydration matches the server-rendered muted default first.
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(WATCH_MUTE_STORAGE_KEY);
        if (stored === "false") setMuted(false);
      } catch {
        // Storage can be unavailable in private modes; muted remains the default.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isInteger(index)) setActive(index);
        }
      },
      { threshold: 0.6 },
    );
    for (const article of articles.current) if (article) observer.observe(article);
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    videos.current.forEach((video, index) => {
      video.muted = muted;
      if (index !== active) {
        video.pause();
        return;
      }
      if (reducedMotion || saveData) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        // Autoplay can still be refused; the play button is visible.
      });
    });
  }, [active, muted, reducedMotion, saveData, items.length]);

  function toggleMute() {
    setMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(WATCH_MUTE_STORAGE_KEY, String(next));
      } catch {
        // Preference persistence is best-effort.
      }
      return next;
    });
    setAnnouncement(muted ? "Sound on" : "Muted");
  }

  function togglePlay(index: number) {
    const video = videos.current.get(index);
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setAnnouncement("Playing");
    } else {
      video.pause();
      setAnnouncement("Paused");
    }
  }

  function move(direction: 1 | -1) {
    const next = Math.min(Math.max(active + direction, 0), items.length - 1);
    articles.current[next]?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    setActive(next);
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/watch?cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const body = (await response.json()) as {
        items: WatchItem[];
        nextCursor: string | null;
      };
      setItems((current) => {
        const seen = new Set(current.map((item) => item.post.id));
        return [...current, ...body.items.filter((item) => !seen.has(item.post.id))];
      });
      setCursor(body.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (failed && items.length === 0) {
    return (
      <ErrorState
        title="Videos didn't load"
        description="We couldn't reach the video feed. Your session is fine — try again."
        action={
          <ButtonLink href="/watch" variant="secondary" size="sm">
            Try again
          </ButtonLink>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No home videos yet"
        description="Walkthroughs, renovations, and neighborhood tours will appear here. Be the first to share one."
        action={
          viewerId ? (
            <ButtonLink href="/create/video" size="sm">
              Share a video
            </ButtonLink>
          ) : (
            <ButtonLink href="/sign-up" size="sm">
              Join dwellr
            </ButtonLink>
          )
        }
      />
    );
  }

  return (
    <div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div
        className="mx-auto max-w-6xl"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
          }
          if (event.key === "ArrowDown" || event.key === "PageDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowUp" || event.key === "PageUp") {
            event.preventDefault();
            move(-1);
          } else if (event.key === " " || event.key === "k") {
            event.preventDefault();
            togglePlay(active);
          } else if (event.key.toLowerCase() === "m") {
            event.preventDefault();
            toggleMute();
          }
        }}
        aria-label="Vertical video feed. Use the up and down arrow keys to move, space to play or pause, and M to mute."
      >
        {items.map((item, index) => {
          const { post } = item;
          const author = authorName(post.author);
          const posterPath = post.video?.posterPath ?? null;
          const videoPath = post.video?.storagePath ?? null;
          const isNear = Math.abs(index - active) <= 1;

          return (
            <article
              key={post.id}
              ref={(node) => {
                articles.current[index] = node;
              }}
              data-index={index}
              aria-label={`Video by ${author}: ${postExcerpt(post.caption, 80) || "untitled"}`}
              className="flex min-h-[calc(100dvh-8rem)] snap-start snap-always flex-col justify-center py-3 md:min-h-[calc(100dvh-5rem)] md:py-5"
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-center md:justify-center lg:grid-cols-[minmax(0,24rem)_24rem]">
                <div className="relative mx-auto aspect-[9/16] max-h-[calc(100dvh-10rem)] w-full max-w-[22rem] overflow-hidden rounded-panel bg-ink shadow-lift md:max-h-[calc(100dvh-7rem)]">
                  {videoPath && posterPath ? (
                    <>
                      <video
                        ref={(node) => {
                          if (node) videos.current.set(index, node);
                          else videos.current.delete(index);
                        }}
                        src={postVideoUrl(videoPath)}
                        poster={postPhotoUrl(posterPath)}
                        muted={muted}
                        loop={false}
                        playsInline
                        preload={isNear ? "metadata" : "none"}
                        className="h-full w-full object-contain"
                        aria-label={`Video: ${postExcerpt(post.caption, 100) || "untitled"}`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePlay(index)}
                        className="absolute inset-0 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-paper"
                        aria-label="Tap to play or pause"
                      >
                        <span className="sr-only">Play or pause</span>
                      </button>
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={toggleMute}
                          aria-pressed={!muted}
                          className="bg-paper/90 backdrop-blur"
                        >
                          {muted ? "Sound off" : "Sound on"}
                        </Button>
                      </div>
                      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-paper">
                        {formatVideoDuration(post.video?.durationSeconds ?? 0)}
                      </span>

                      <div className="absolute inset-x-2 bottom-2 md:hidden">
                        <div className="max-h-[45%] overflow-y-auto rounded-card bg-paper/95 p-3 shadow-lift backdrop-blur">
                          <WatchDetails item={item} viewerId={viewerId} collections={collections} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-paper">
                      This video is unavailable.
                    </div>
                  )}
                </div>

                <div className="hidden rounded-panel bg-paper p-5 shadow-soft md:block">
                  <WatchDetails item={item} viewerId={viewerId} collections={collections} />
                  {post.video?.captions ? (
                    <details className="mt-4 border-t border-line pt-3">
                      <summary className="cursor-pointer text-body-sm font-medium">
                        Captions / transcript
                      </summary>
                      <p className="mt-2 max-h-40 overflow-y-auto text-caption leading-relaxed whitespace-pre-line text-stone">
                        {post.video.captions}
                      </p>
                    </details>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 py-8">
        {failed ? (
          <p role="alert" className="text-body-sm text-danger">
            More videos couldn&rsquo;t load.
          </p>
        ) : null}
        {cursor ? (
          <Button type="button" variant="secondary" onClick={loadMore} loading={loadingMore}>
            {loadingMore ? (
              <>
                <SpinnerIcon size={14} /> Loading…
              </>
            ) : (
              "Load more videos"
            )}
          </Button>
        ) : (
          <p className="text-caption text-stone">You&rsquo;re all caught up.</p>
        )}
        <Link href="/posts" className="text-caption text-stone underline underline-offset-4 hover:text-ink">
          Browse community posts instead
        </Link>
      </div>
    </div>
  );
}
