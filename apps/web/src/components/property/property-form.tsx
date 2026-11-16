"use client";

import {
  centsToDollarInput,
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  PROPERTY_BUCKET,
  PROPERTY_DESCRIPTION_MAX_LENGTH,
  PROPERTY_MAX_PHOTOS,
  PROPERTY_PHOTO_MAX_EDGE,
  PROPERTY_PHOTO_MIME_TYPES,
  PROPERTY_TITLE_MAX_LENGTH,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type ListingStatus,
  type PropertyType,
} from "@dwellr/core";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ImageIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons";
import { SelectField } from "@/components/ui/select";
import { TextareaField } from "@/components/ui/textarea";
import { compressImage } from "@/lib/image";
import type { PropertyFormState } from "@/lib/property-form";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type UploadItem = {
  id: string;
  status: "uploading" | "ready" | "error";
  previewUrl: string;
  storagePath?: string;
  width?: number;
  height?: number;
  altText: string;
  error?: string;
};

export type PropertyFormInitial = {
  title: string;
  description: string | null;
  listingStatus: ListingStatus;
  priceCents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: PropertyType;
  neighborhood: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

type PropertyFormProps = {
  mode: "create" | "edit";
  userId: string;
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  propertyId?: string;
  initial?: PropertyFormInitial;
  existingPhotos?: { id: string; url: string; altText: string | null }[];
};

export function PropertyForm({
  mode,
  userId,
  action,
  propertyId,
  initial,
  existingPhotos = [],
}: PropertyFormProps) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const [items, setItems] = useState<UploadItem[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const values = state.values;
  const readyPhotos = items.filter((item) => item.status === "ready");
  const uploading = items.some((item) => item.status === "uploading");
  const failed = items.some((item) => item.status === "error");
  const totalPhotos = existingPhotos.length + readyPhotos.length;
  const photosJson = JSON.stringify(
    readyPhotos.map((item) => ({
      storagePath: item.storagePath,
      width: item.width,
      height: item.height,
      altText: item.altText.trim() || undefined,
    })),
  );

  const canSubmit =
    !pending &&
    !uploading &&
    !failed &&
    (mode === "edit" || readyPhotos.length > 0 || existingPhotos.length > 0) &&
    totalPhotos <= PROPERTY_MAX_PHOTOS;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setPhotoError(null);
    const room = PROPERTY_MAX_PHOTOS - existingPhotos.length - items.length;
    if (room <= 0) {
      setPhotoError(`You can add up to ${PROPERTY_MAX_PHOTOS} photos.`);
      return;
    }

    const selected = files.slice(0, room);
    if (files.length > room) {
      setPhotoError(`Only ${room} more photo${room === 1 ? "" : "s"} can be added.`);
    }

    for (const file of selected) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      setItems((current) => [
        ...current,
        { id, status: "uploading", previewUrl, altText: "" },
      ]);

      try {
        if (!PROPERTY_PHOTO_MIME_TYPES.includes(file.type as (typeof PROPERTY_PHOTO_MIME_TYPES)[number])) {
          throw new Error("Use a JPG, PNG, or WebP image.");
        }

        const compressed = await compressImage(file, { maxEdge: PROPERTY_PHOTO_MAX_EDGE });
        const storagePath = `${userId}/${crypto.randomUUID()}.webp`;
        const supabase = createBrowserClient();

        const { error } = await supabase.storage
          .from(PROPERTY_BUCKET)
          .upload(storagePath, compressed.blob, {
            contentType: "image/webp",
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw new Error(
            error.message.toLowerCase().includes("row-level security") ||
              error.message.toLowerCase().includes("unauthorized")
              ? "Your session expired before the upload finished. Sign in and try again."
              : "That photo couldn't be uploaded. Check your connection and try again.",
          );
        }

        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "ready",
                  storagePath,
                  width: compressed.width,
                  height: compressed.height,
                }
              : item,
          ),
        );
      } catch (error) {
        setItems((current) =>
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

  function removeItem(id: string) {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <form action={formAction} className="space-y-14">
      {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
      {mode === "create" ? <input type="hidden" name="photos" value={photosJson} /> : null}

      {state.message ? (
        <p
          role="alert"
          className={`rounded-card px-4 py-3 text-body-sm ${
            state.status === "notice" ? "bg-moss-soft text-moss" : "bg-danger-soft text-danger"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <section aria-labelledby="photos-heading">
        <p className="text-eyebrow text-stone uppercase">Step 01</p>
        <h2 id="photos-heading" className="mt-2 text-title font-medium">
          Photos
        </h2>
        <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-stone">
          The first photo becomes the cover. Images are resized in your browser before uploading, so
          phone photos stay manageable.
        </p>

        {mode === "create" ? (
          <>
            <div className="mt-5">
              <input
                ref={inputRef}
                id="photo-input"
                type="file"
                accept={PROPERTY_PHOTO_MIME_TYPES.join(",")}
                multiple
                className="sr-only"
                onChange={handleFiles}
              />
              <label
                htmlFor="photo-input"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-line-strong bg-mist/50 px-6 py-10 text-center transition hover:border-ink hover:bg-mist"
              >
                <ImageIcon className="text-stone" size={26} />
                <span className="text-body-sm font-medium text-ink">Add photos</span>
                <span className="text-caption text-stone">
                  JPG, PNG or WebP · up to {PROPERTY_MAX_PHOTOS} photos
                </span>
              </label>
            </div>

            {items.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-caption text-stone">
                  <span>
                    {readyPhotos.length} of {items.length} uploaded
                  </span>
                  {uploading ? (
                    <span className="inline-flex items-center gap-1.5 text-ink">
                      <SpinnerIcon size={14} /> Uploading…
                    </span>
                  ) : null}
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-ink transition-all duration-500"
                    style={{ width: `${(readyPhotos.length / Math.max(items.length, 1)) * 100}%` }}
                  />
                </div>

                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {items.map((item) => (
                    <li key={item.id} className="space-y-2">
                      <div className="relative aspect-square overflow-hidden rounded-card bg-mist">
                        <Image
                          src={item.previewUrl}
                          alt=""
                          width={400}
                          height={400}
                          unoptimized
                          className={`h-full w-full object-cover ${
                            item.status === "uploading" ? "opacity-60" : ""
                          }`}
                        />
                        {item.status === "uploading" ? (
                          <div className="absolute inset-0 flex items-center justify-center text-ink">
                            <SpinnerIcon />
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper/90 text-ink shadow-soft transition hover:bg-paper"
                        >
                          <span className="sr-only">Remove photo</span>
                          <TrashIcon size={14} />
                        </button>
                      </div>
                      {item.status === "error" ? (
                        <p role="alert" className="text-caption text-danger">
                          {item.error}
                        </p>
                      ) : (
                        <input
                          type="text"
                          value={item.altText}
                          maxLength={200}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, altText: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Describe this photo (optional)"
                          aria-label="Photo description"
                          className="h-9 w-full rounded-control border border-line bg-paper px-2.5 text-caption text-ink outline-none placeholder:text-stone-soft focus:border-ink"
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
          </>
        ) : (
          <div className="mt-5">
            {existingPhotos.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {existingPhotos.map((photo) => (
                  <li key={photo.id} className="relative aspect-square overflow-hidden rounded-card bg-mist">
                    <Image
                      src={photo.url}
                      alt={photo.altText ?? ""}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-stone">This post has no photos.</p>
            )}
            <p className="mt-3 text-caption text-stone">
              Photo editing is not available yet. Delete and repost if the photos are wrong.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="details-heading" className="border-t border-line pt-10">
        <p className="text-eyebrow text-stone uppercase">Step 02</p>
        <h2 id="details-heading" className="mt-2 text-title font-medium">
          The home
        </h2>

        <div className="mt-6 space-y-6">
          <Field
            label="Title"
            name="title"
            required
            maxLength={PROPERTY_TITLE_MAX_LENGTH}
            placeholder="Sunlit two-bed by the park"
            defaultValue={values?.title ?? initial?.title ?? ""}
            error={state.fieldErrors?.title}
          />

          <TextareaField
            label="Description"
            name="description"
            maxLength={PROPERTY_DESCRIPTION_MAX_LENGTH}
            placeholder="What makes this home worth a closer look? Layout, light, the street, the things photos miss."
            defaultValue={values?.description ?? initial?.description ?? ""}
            error={state.fieldErrors?.description}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Listing status"
              name="listingStatus"
              defaultValue={values?.listingStatus ?? initial?.listingStatus ?? "unknown"}
              hint="Only what you know"
              error={state.fieldErrors?.listingStatus}
            >
              {LISTING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LISTING_STATUS_LABELS[status]}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Property type"
              name="propertyType"
              defaultValue={values?.propertyType ?? initial?.propertyType ?? "house"}
              error={state.fieldErrors?.propertyType}
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type]}
                </option>
              ))}
            </SelectField>
          </div>

          <Field
            label="Price"
            name="price"
            inputMode="decimal"
            placeholder="450000"
            hint="USD, leave blank if unlisted"
            defaultValue={values?.price ?? centsToDollarInput(initial?.priceCents ?? null)}
            error={state.fieldErrors?.price ?? state.fieldErrors?.priceCents}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              max={50}
              step="0.5"
              placeholder="2"
              defaultValue={values?.bedrooms ?? initial?.bedrooms?.toString() ?? ""}
              error={state.fieldErrors?.bedrooms}
            />
            <Field
              label="Bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              max={50}
              step="0.5"
              placeholder="1.5"
              defaultValue={values?.bathrooms ?? initial?.bathrooms?.toString() ?? ""}
              error={state.fieldErrors?.bathrooms}
            />
            <Field
              label="Square feet"
              name="squareFeet"
              type="number"
              min={1}
              max={100000}
              step="1"
              placeholder="980"
              defaultValue={values?.squareFeet ?? initial?.squareFeet?.toString() ?? ""}
              error={state.fieldErrors?.squareFeet}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="location-heading" className="border-t border-line pt-10">
        <p className="text-eyebrow text-stone uppercase">Step 03</p>
        <h2 id="location-heading" className="mt-2 text-title font-medium">
          Where it is
        </h2>
        <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-stone">
          Neighborhood-level only. HausCrawl does not collect street addresses in this version, so
          never include one in the title or description.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field
            label="Neighborhood"
            name="neighborhood"
            required
            placeholder="Juniper Heights"
            defaultValue={values?.neighborhood ?? initial?.neighborhood ?? ""}
            error={state.fieldErrors?.neighborhood}
          />
          <Field
            label="City"
            name="city"
            required
            placeholder="Portland"
            defaultValue={values?.city ?? initial?.city ?? ""}
            error={state.fieldErrors?.city}
          />
          <Field
            label="State or region"
            name="state"
            placeholder="OR"
            defaultValue={values?.state ?? initial?.state ?? ""}
            error={state.fieldErrors?.state}
          />
          <Field
            label="Postal code"
            name="postalCode"
            placeholder="97212"
            hint="Optional"
            defaultValue={values?.postalCode ?? initial?.postalCode ?? ""}
            error={state.fieldErrors?.postalCode}
          />
        </div>

        <details className="mt-6 rounded-card border border-line px-4 py-3">
          <summary className="cursor-pointer text-body-sm font-medium text-ink">
            Approximate map pin (optional)
          </summary>
          <p className="mt-2 text-caption leading-relaxed text-stone">
            Rounded to two decimals (about 1 km) and never shown as a street address.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field
              label="Latitude"
              name="latitude"
              type="number"
              step="0.01"
              min={-90}
              max={90}
              placeholder="45.55"
              defaultValue={values?.latitude ?? initial?.latitude?.toString() ?? ""}
              error={state.fieldErrors?.latitude}
            />
            <Field
              label="Longitude"
              name="longitude"
              type="number"
              step="0.01"
              min={-180}
              max={180}
              placeholder="-122.60"
              defaultValue={values?.longitude ?? initial?.longitude?.toString() ?? ""}
              error={state.fieldErrors?.longitude}
            />
          </div>
        </details>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={mode === "edit" && propertyId ? `/p/${propertyId}` : "/explore"}
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-body-sm font-medium text-stone transition hover:bg-mist hover:text-ink"
        >
          Cancel
        </Link>
        <Button type="submit" size="lg" loading={pending} disabled={!canSubmit}>
          {mode === "create" ? "Publish home" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
