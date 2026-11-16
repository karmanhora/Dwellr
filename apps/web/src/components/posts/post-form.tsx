"use client";

import {
  POST_CAPTION_MAX_LENGTH,
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  POST_CATEGORY_MAX,
  POST_MAX_PHOTOS,
  POST_PHOTO_ALT_MAX_LENGTH,
  POST_PHOTO_MAX_BYTES,
  POST_PHOTO_MAX_EDGE,
  POST_PHOTOS_BUCKET,
  type PostCategory,
} from "@hauscrawl/core";
import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { createPostAction } from "@/app/posts/actions";
import { Button } from "@/components/ui/button";
import { ImageIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/image";
import type { PostFormState } from "@/lib/post-form";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { inspectVideo, type VideoMetadata } from "@/lib/video";
import { SupabaseVideoProvider } from "@/lib/video-provider";

type PropertyOption = {
  id: string;
  title: string;
  neighborhood: string;
  city: string;
};

type PhotoItem = {
  id: string;
  status: "uploading" | "ready" | "error";
  previewUrl: string;
  storagePath?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  altText: string;
  error?: string;
};

type VideoItem = {
  file: File;
  previewUrl: string;
  posterBlob: Blob;
  posterPreviewUrl: string;
  metadata: VideoMetadata;
  status: "idle" | "uploading" | "ready" | "error";
  progress: number;
  storagePath?: string;
  posterPath?: string;
  error?: string;
};

const inputClass =
  "mt-1.5 w-full rounded-control border border-line bg-paper px-3.5 py-3 text-body leading-relaxed outline-none placeholder:text-stone-soft focus:border-ink focus:ring-2 focus:ring-ink/10";

function PropertyPicker({
  initial,
  disabled = false,
}: {
  initial?: PropertyOption | null;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PropertyOption[]>([]);
  const [selected, setSelected] = useState<PropertyOption | null>(initial ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected || disabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/properties/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const body = (await response.json()) as { results: PropertyOption[] };
        setResults(body.results);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selected, disabled]);

  return (
    <div>
      <span className="text-body-sm font-medium">Tag a home</span>
      <p className="mt-1 text-caption leading-relaxed text-stone">
        Optional. The post stays community content; the home keeps its own Verified or Community
        labels.
      </p>
      <input type="hidden" name="propertyId" value={selected?.id ?? ""} />

      {selected ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-card border border-line bg-mist/60 px-3 py-2.5">
          <span className="min-w-0">
            <span className="block truncate text-body-sm font-medium">{selected.title}</span>
            <span className="block truncate text-caption text-stone">
              {selected.neighborhood}, {selected.city}
            </span>
          </span>
          {disabled ? null : (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 text-caption font-medium text-stone underline underline-offset-4 hover:text-ink"
            >
              Remove
            </button>
          )}
        </div>
      ) : disabled ? (
        <p className="mt-2 text-body-sm text-stone">No home tagged.</p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your saved homes by title, neighborhood, or city"
            aria-label="Search homes to tag"
            className={inputClass}
          />
          <div aria-live="polite" className="mt-2">
            {loading ? (
              <p className="flex items-center gap-2 text-caption text-stone">
                <SpinnerIcon size={14} /> Searching…
              </p>
            ) : results.length === 0 ? (
              <p className="text-caption text-stone">
                {query ? "No matching homes. You can post without a tag." : "No homes available to tag yet."}
              </p>
            ) : (
              <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-card border border-line">
                {results.map((property) => (
                  <li key={property.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(property)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-mist"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-body-sm font-medium">
                          {property.title}
                        </span>
                        <span className="block truncate text-caption text-stone">
                          {property.neighborhood}, {property.city}
                        </span>
                      </span>
                      <span className="shrink-0 text-caption font-medium text-stone">Tag</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function PostForm({
  mode,
  userId,
  initialProperty = null,
}: {
  mode: "post" | "video";
  userId: string;
  initialProperty?: PropertyOption | null;
}) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(createPostAction, {
    status: "idle",
  });
  const [kind, setKind] = useState<"text" | "photo">("photo");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [captions, setCaptions] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const readyPhotos = photos.filter((item) => item.status === "ready");
  const photoBusy = photos.some((item) => item.status === "uploading");
  const photoFailed = photos.some((item) => item.status === "error");
  const isVideo = mode === "video";
  const videoReady = Boolean(video?.status === "ready" && video.storagePath && video.posterPath);

  const photosJson = JSON.stringify(
    readyPhotos.map((item) => ({
      storagePath: item.storagePath,
      width: item.width,
      height: item.height,
      sizeBytes: item.sizeBytes,
      altText: item.altText.trim() || undefined,
    })),
  );

  const videoJson = videoReady
    ? JSON.stringify({
        storagePath: video?.storagePath,
        posterPath: video?.posterPath,
        durationSeconds: video?.metadata.durationSeconds,
        width: video?.metadata.width,
        height: video?.metadata.height,
        sizeBytes: video?.metadata.sizeBytes,
        mimeType: video?.metadata.mimeType,
        captions: captions.trim() || undefined,
      })
    : "";

  const canSubmit =
    !pending &&
    !photoBusy &&
    !photoFailed &&
    !uploading &&
    (isVideo
      ? videoReady
      : kind === "text"
        ? true
        : readyPhotos.length > 0 && readyPhotos.length <= POST_MAX_PHOTOS);

  function toggleCategory(category: PostCategory) {
    setCategories((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      if (current.length >= POST_CATEGORY_MAX) return current;
      return [...current, category];
    });
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setPhotoError(null);

    const room = POST_MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setPhotoError(`A post can carry up to ${POST_MAX_PHOTOS} photos.`);
      return;
    }
    if (files.length > room) {
      setPhotoError(`Only ${room} more photo${room === 1 ? "" : "s"} can be added.`);
    }

    for (const file of files.slice(0, room)) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((current) => [
        ...current,
        { id, status: "uploading", previewUrl, altText: "" },
      ]);

      try {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Use a JPG, PNG, or WebP image.");
        }
        const compressed = await compressImage(file, { maxEdge: POST_PHOTO_MAX_EDGE });
        if (compressed.blob.size > POST_PHOTO_MAX_BYTES) {
          throw new Error("That photo is still over 5 MB after resizing.");
        }

        const storagePath = `${userId}/${crypto.randomUUID()}.webp`;
        const supabase = createBrowserClient();
        const { error } = await supabase.storage.from(POST_PHOTOS_BUCKET).upload(
          storagePath,
          compressed.blob,
          { contentType: "image/webp", cacheControl: "3600", upsert: false },
        );
        if (error) {
          throw new Error(
            error.message.toLowerCase().includes("row-level security") ||
              error.message.toLowerCase().includes("unauthorized")
              ? "Your session expired before the upload finished. Sign in and try again."
              : "That photo couldn't be uploaded. Check your connection and try again.",
          );
        }

        setPhotos((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "ready",
                  storagePath,
                  width: compressed.width,
                  height: compressed.height,
                  sizeBytes: compressed.blob.size,
                }
              : item,
          ),
        );
      } catch (error) {
        setPhotos((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed.",
                }
              : item,
          ),
        );
      }
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  }

  async function handleVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (video) {
      URL.revokeObjectURL(video.previewUrl);
      URL.revokeObjectURL(video.posterPreviewUrl);
    }
    setVideo(null);
    setCaptions("");

    try {
      const inspection = await inspectVideo(file);
      setVideo({
        file,
        previewUrl: inspection.previewUrl,
        posterBlob: inspection.posterBlob,
        posterPreviewUrl: inspection.posterPreviewUrl,
        metadata: {
          durationSeconds: inspection.durationSeconds,
          width: inspection.width,
          height: inspection.height,
          mimeType: inspection.mimeType,
          sizeBytes: inspection.sizeBytes,
        },
        status: "idle",
        progress: 0,
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "That video couldn't be read.");
    }
  }

  async function uploadVideo() {
    if (!video || video.status === "uploading" || video.status === "ready") return;
    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    setVideo((current) =>
      current ? { ...current, status: "uploading", progress: 0, error: undefined } : current,
    );

    const provider = new SupabaseVideoProvider();
    const extension = video.metadata.mimeType === "video/webm" ? "webm" : "mp4";
    const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    let posterPath: string | null = null;

    try {
      await provider.upload({
        path: storagePath,
        file: video.file,
        contentType: video.metadata.mimeType,
        signal: controller.signal,
        onProgress: (progress) =>
          setVideo((current) => (current ? { ...current, progress } : current)),
      });

      posterPath = `${userId}/${crypto.randomUUID()}.webp`;
      const supabase = createBrowserClient();
      const { error } = await supabase.storage
        .from(POST_PHOTOS_BUCKET)
        .upload(posterPath, video.posterBlob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw new Error("The poster frame couldn't be uploaded. Try again.");

      setVideo((current) =>
        current
          ? {
              ...current,
              status: "ready",
              progress: 100,
              storagePath,
              posterPath: posterPath ?? undefined,
              error: undefined,
            }
          : current,
      );
    } catch (error) {
      if (posterPath) {
        await createBrowserClient().storage.from(POST_PHOTOS_BUCKET).remove([posterPath]);
      }
      await provider.remove(storagePath).catch(() => undefined);
      setVideo((current) =>
        current
          ? {
              ...current,
              status: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "That video couldn't be uploaded. Try again.",
            }
          : current,
      );
    } finally {
      abortRef.current = null;
      setUploading(false);
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  function guardSubmit(event: FormEvent<HTMLFormElement>) {
    if (isVideo && !videoReady) {
      event.preventDefault();
      return;
    }
  }

  return (
    <form action={formAction} onSubmit={guardSubmit} className="space-y-10">
      <input type="hidden" name="kind" value={isVideo ? "video" : kind} />
      <input type="hidden" name="photos" value={kind === "photo" ? photosJson : "[]"} />
      <input type="hidden" name="video" value={videoJson} />

      {state.message ? (
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          {state.message}
        </p>
      ) : null}

      {!isVideo ? (
        <fieldset>
          <legend className="text-body-sm font-medium">What are you sharing?</legend>
          <div className="mt-2 flex gap-2">
            {(["text", "photo"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                aria-pressed={kind === option}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-body-sm font-medium transition ${
                  kind === option
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper text-ink hover:bg-mist"
                }`}
              >
                {option === "text" ? "Text" : "Photos"}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {isVideo ? (
        <section aria-labelledby="video-heading">
          <h2 id="video-heading" className="text-title font-medium">
            Your short video
          </h2>
          <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-stone">
            30 seconds or shorter, 25 MB or smaller. MP4 (H.264) or WebM. Record on your phone or
            choose a clip; we generate the poster frame in your browser.
          </p>

          <div className="mt-4 rounded-card border border-ink/20 bg-sand px-4 py-3">
            <p className="text-body-sm font-medium text-ink">Before you upload</p>
            <p className="mt-1 text-caption leading-relaxed text-stone">
              Don&rsquo;t show house numbers, license plates, mail, or anything that identifies
              where someone lives. HausCrawl cannot remove video metadata yet — the original file
              keeps what your camera recorded.
            </p>
          </div>

          <input
            ref={videoInput}
            id="video-input"
            type="file"
            accept="video/mp4,video/webm"
            capture="environment"
            className="sr-only"
            onChange={handleVideo}
          />
          <label
            htmlFor="video-input"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong bg-mist/50 px-6 py-8 text-center transition hover:border-ink hover:bg-mist"
          >
            <span className="text-body-sm font-medium text-ink">
              {video ? "Choose a different video" : "Record or choose a video"}
            </span>
            <span className="text-caption text-stone">MP4 or WebM · up to 30 seconds</span>
          </label>

          {video ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-card bg-ink">
                <Image
                  src={video.posterPreviewUrl}
                  alt="Poster frame from your video"
                  fill
                  unoptimized
                  className="object-cover"
                />
                {video.status === "uploading" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 text-paper">
                    <SpinnerIcon />
                    <span className="text-caption">{video.progress}%</span>
                  </div>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium">{video.file.name}</p>
                <p className="mt-1 text-caption text-stone">
                  {video.metadata.durationSeconds.toFixed(1)}s ·{" "}
                  {video.metadata.width}×{video.metadata.height} ·{" "}
                  {(video.metadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                </p>

                {video.status === "uploading" ? (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-ink transition-all"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={cancelUpload}>
                      Cancel upload
                    </Button>
                  </div>
                ) : video.status === "ready" ? (
                  <p role="status" className="mt-3 rounded-card bg-moss-soft px-3 py-2 text-body-sm text-moss">
                    Video uploaded. Add a caption and publish.
                  </p>
                ) : (
                  <div className="mt-3">
                    {video.status === "error" && video.error ? (
                      <p role="alert" className="mb-2 text-caption text-danger">
                        {video.error}
                      </p>
                    ) : null}
                    <Button type="button" size="sm" loading={uploading} onClick={uploadVideo}>
                      Upload video
                    </Button>
                  </div>
                )}

                <div className="mt-4">
                  <label htmlFor="video-captions" className="text-body-sm font-medium">
                    Captions or transcript <span className="font-normal text-stone">(optional)</span>
                  </label>
                  <Textarea
                    id="video-captions"
                    value={captions}
                    onChange={(event) => setCaptions(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="mt-1.5"
                    placeholder="Describe what is said or shown. This helps people who can't hear the audio."
                  />
                </div>
              </div>
            </div>
          ) : null}

          {photoError ? (
            <p role="alert" className="mt-3 text-caption text-danger">
              {photoError}
            </p>
          ) : null}
          {state.fieldErrors?.video ? (
            <p role="alert" className="mt-3 text-caption text-danger">
              {state.fieldErrors.video}
            </p>
          ) : null}
        </section>
      ) : kind === "photo" ? (
        <section aria-labelledby="photos-heading">
          <h2 id="photos-heading" className="text-title font-medium">
            Photos
          </h2>
          <p className="mt-2 text-body-sm leading-relaxed text-stone">
            Up to eight. The first is the cover. Images are resized and re-encoded in your browser
            before upload, which strips EXIF and GPS data.
          </p>

          <input
            ref={photoInput}
            id="post-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handlePhotos}
          />
          <label
            htmlFor="post-photo-input"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong bg-mist/50 px-6 py-8 text-center transition hover:border-ink hover:bg-mist"
          >
            <ImageIcon size={24} className="text-stone" />
            <span className="text-body-sm font-medium text-ink">Add photos</span>
            <span className="text-caption text-stone">JPG, PNG, or WebP</span>
          </label>

          {photos.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-caption text-stone">
                <span>
                  {readyPhotos.length} of {photos.length} uploaded
                </span>
                {photoBusy ? (
                  <span className="inline-flex items-center gap-1.5 text-ink">
                    <SpinnerIcon size={14} /> Uploading…
                  </span>
                ) : null}
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo) => (
                <li key={photo.id} className="space-y-2">
                  <div className="relative aspect-square overflow-hidden rounded-card bg-mist">
                    <Image
                      src={photo.previewUrl}
                      alt=""
                      fill
                      unoptimized
                      className={`object-cover ${photo.status === "uploading" ? "opacity-60" : ""}`}
                    />
                    {photo.status === "uploading" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <SpinnerIcon />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft"
                    >
                      <span className="sr-only">Remove photo</span>
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  {photo.status === "error" ? (
                    <p role="alert" className="text-caption text-danger">
                      {photo.error}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={photo.altText}
                      maxLength={POST_PHOTO_ALT_MAX_LENGTH}
                      onChange={(event) =>
                        setPhotos((current) =>
                          current.map((entry) =>
                            entry.id === photo.id
                              ? { ...entry, altText: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Describe this photo (optional)"
                      aria-label="Photo description"
                      className="h-9 w-full rounded-control border border-line bg-paper px-2.5 text-caption outline-none focus:border-ink"
                    />
                  )}
                </li>
              ))}
              </ul>
            </div>
          ) : null}

          {photoError ? (
            <p role="alert" className="mt-3 text-caption text-danger">
              {photoError}
            </p>
          ) : null}
          {state.fieldErrors?.photos ? (
            <p role="alert" className="mt-3 text-caption text-danger">
              {state.fieldErrors.photos}
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="caption-heading" className="border-t border-line pt-8">
        <h2 id="caption-heading" className="text-title font-medium">
          Caption
        </h2>
        <label htmlFor="post-caption" className="sr-only">
          Caption
        </label>
        <Textarea
          id="post-caption"
          name="caption"
          defaultValue={state.values?.caption ?? ""}
          maxLength={POST_CAPTION_MAX_LENGTH}
          rows={5}
          className="mt-3 min-h-32"
          placeholder={
            isVideo
              ? "What should people notice? A renovation, the light, a detail worth copying…"
              : kind === "photo"
                ? "Tell the story behind the photos."
                : "Share a thought about homes, a neighborhood, or something you made."
          }
          aria-describedby="caption-help"
        />
        <p id="caption-help" className="mt-1 text-caption text-stone">
          {POST_CAPTION_MAX_LENGTH} characters max. This is your post — not a verified property fact.
        </p>
        {state.fieldErrors?.caption ? (
          <p role="alert" className="mt-1 text-caption text-danger">
            {state.fieldErrors.caption}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="tags-heading" className="border-t border-line pt-8">
        <h2 id="tags-heading" className="text-title font-medium">
          Topics
        </h2>
        <p className="mt-1 text-body-sm text-stone">Choose up to {POST_CATEGORY_MAX}.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {POST_CATEGORIES.map((category) => {
            const active = categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={active}
                disabled={!active && categories.length >= POST_CATEGORY_MAX}
                className={`inline-flex h-9 items-center rounded-full border px-3.5 text-body-sm transition disabled:opacity-45 ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper text-ink hover:bg-mist"
                }`}
              >
                {POST_CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
        {categories.map((category) => (
          <input key={category} type="hidden" name="categories" value={category} />
        ))}
      </section>

      <section aria-labelledby="place-heading" className="border-t border-line pt-8">
        <h2 id="place-heading" className="text-title font-medium">
          Where it is
        </h2>
        <div className="mt-4 space-y-5">
          <PropertyPicker initial={initialProperty} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="post-neighborhood" className="text-body-sm font-medium">
                Neighborhood <span className="font-normal text-stone">(optional)</span>
              </label>
              <input
                id="post-neighborhood"
                name="neighborhood"
                defaultValue={state.values?.neighborhood ?? ""}
                maxLength={80}
                placeholder="Juniper Heights"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="post-city" className="text-body-sm font-medium">
                City <span className="font-normal text-stone">(optional)</span>
              </label>
              <input
                id="post-city"
                name="city"
                defaultValue={state.values?.city ?? ""}
                maxLength={80}
                placeholder="Portland"
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-caption leading-relaxed text-stone">
            Neighborhood-level only. Don&rsquo;t include a street address or house number.
          </p>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/create"
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-body-sm font-medium text-stone transition hover:bg-mist hover:text-ink"
        >
          Cancel
        </Link>
        <Button type="submit" size="lg" loading={pending} disabled={!canSubmit}>
          Publish {isVideo ? "video" : "post"}
        </Button>
      </div>
    </form>
  );
}
