"use client";

import {
  POST_CAPTION_MAX_LENGTH,
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  POST_CATEGORY_MAX,
  type PostCategory,
} from "@hauscrawl/core";
import Link from "next/link";
import { useActionState, useState } from "react";

import { updatePostAction } from "@/app/posts/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PostFormState } from "@/lib/post-form";

export function EditPostForm({
  postId,
  kind,
  caption,
  categories: initialCategories,
  propertyId,
  propertyLabel,
  neighborhood,
  city,
}: {
  postId: string;
  kind: "text" | "photo" | "video";
  caption: string;
  categories: PostCategory[];
  propertyId: string | null;
  propertyLabel: string | null;
  neighborhood: string | null;
  city: string | null;
}) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(updatePostAction, {
    status: "idle",
  });
  const [categories, setCategories] = useState<PostCategory[]>(initialCategories);

  function toggleCategory(category: PostCategory) {
    setCategories((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      if (current.length >= POST_CATEGORY_MAX) return current;
      return [...current, category];
    });
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="propertyId" value={propertyId ?? ""} />

      {state.message ? (
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="edit-caption" className="text-body-sm font-medium">
          Caption
        </label>
        <Textarea
          id="edit-caption"
          name="caption"
          defaultValue={state.values?.caption ?? caption}
          required={kind === "text"}
          maxLength={POST_CAPTION_MAX_LENGTH}
          rows={6}
          className="mt-1.5"
        />
        {state.fieldErrors?.caption ? (
          <p role="alert" className="mt-1 text-caption text-danger">
            {state.fieldErrors.caption}
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-body-sm font-medium">Topics</legend>
        <p className="mt-1 text-caption text-stone">Choose up to {POST_CATEGORY_MAX}.</p>
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
      </fieldset>

      <div>
        <p className="text-body-sm font-medium">Tagged home</p>
        {propertyId && propertyLabel ? (
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-card border border-line bg-mist/60 px-3 py-2.5">
            <span className="truncate text-body-sm">{propertyLabel}</span>
            <Link
              href={`/posts/${postId}/edit?removeProperty=1`}
              className="shrink-0 text-caption text-stone underline underline-offset-4 hover:text-ink"
            >
              Remove tag
            </Link>
          </div>
        ) : (
          <p className="mt-1 text-caption text-stone">
            No home tagged. Media and tags are not editable after publishing yet; delete and repost
            to change photos or video.
          </p>
        )}
        <input type="hidden" name="neighborhood" value={neighborhood ?? ""} />
        <input type="hidden" name="city" value={city ?? ""} />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
        <Link
          href={`/posts/${postId}`}
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-body-sm font-medium text-stone hover:bg-mist hover:text-ink"
        >
          Cancel
        </Link>
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
