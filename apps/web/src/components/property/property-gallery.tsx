"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { HouseMark } from "@/components/brand/logo";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

export type GalleryPhoto = {
  id: string;
  url: string;
  alt: string | null;
};

/**
 * Keyboard (←/→/Home/End), touch swipe and thumbnail navigation. The container
 * is focusable so keyboard users can move through photos without tabbing
 * through every control.
 */
export function PropertyGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-panel bg-mist text-stone sm:aspect-[16/9]">
        <HouseMark className="h-12 w-12 opacity-25" />
        <p className="text-body-sm">No photos for this home yet.</p>
      </div>
    );
  }

  const count = photos.length;
  const current = photos[Math.min(index, count - 1)]!;

  const go = (delta: number) => setIndex((value) => (value + delta + count) % count);

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${title}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            setIndex(0);
          } else if (event.key === "End") {
            event.preventDefault();
            setIndex(count - 1);
          }
        }}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX ?? null;
          touchStart.current = null;
          if (start === null || end === null) return;
          if (Math.abs(end - start) < 48) return;
          go(end < start ? 1 : -1);
        }}
        className="relative aspect-[4/3] overflow-hidden rounded-panel bg-mist outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 sm:aspect-[16/9]"
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.alt ?? `${title} — photo ${index + 1}`}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="animate-fade-in object-cover"
        />

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft transition hover:bg-paper"
            >
              <span className="sr-only">Previous photo</span>
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft transition hover:bg-paper"
            >
              <span className="sr-only">Next photo</span>
              <ChevronRightIcon />
            </button>
            <p className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-medium text-paper">
              {index + 1} / {count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, photoIndex) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setIndex(photoIndex)}
                aria-current={photoIndex === index ? "true" : undefined}
                aria-label={`Show photo ${photoIndex + 1} of ${count}`}
                className={`relative block h-16 w-24 overflow-hidden rounded-xl border-2 transition ${
                  photoIndex === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
