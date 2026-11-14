"use client";

import { AVATAR_BUCKET, BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH } from "@dwellr/core";
import Image from "next/image";
import { useActionState, useRef, useState, type ChangeEvent } from "react";

import { updateProfileAction } from "@/app/settings/profile/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SpinnerIcon } from "@/components/ui/icons";
import { TextareaField } from "@/components/ui/textarea";
import { compressImage } from "@/lib/image";
import { initialProfileFormState } from "@/lib/profile-form";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  displayName: string | null;
  bio: string | null;
};

export function ProfileForm({ userId, name, avatarUrl, displayName, bio }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialProfileFormState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const values = state.values;

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const compressed = await compressImage(file, { maxEdge: 640, square: true });
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const supabase = createBrowserClient();

      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, compressed.blob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw new Error("That photo couldn't be uploaded. Try again.");

      setAvatarPath(path);
      setPreviewUrl(URL.createObjectURL(compressed.blob));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="avatarPath" value={avatarPath} />

      {state.message ? (
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="New avatar preview"
            width={112}
            height={112}
            unoptimized
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <Avatar name={name} src={avatarUrl} size="lg" />
        )}

        <div>
          <input
            ref={inputRef}
            id="avatar-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatar}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <SpinnerIcon size={14} /> : null}
            {uploading ? "Uploading…" : "Change photo"}
          </Button>
          <p className="mt-2 text-caption text-stone">JPG, PNG or WebP · cropped square.</p>
          {uploadError ? (
            <p role="alert" className="mt-1 text-caption text-danger">
              {uploadError}
            </p>
          ) : null}
        </div>
      </div>

      <Field
        label="Display name"
        name="displayName"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        placeholder="How your name appears"
        defaultValue={values?.displayName ?? displayName ?? ""}
        error={state.fieldErrors?.displayName}
      />

      <TextareaField
        label="Bio"
        name="bio"
        maxLength={BIO_MAX_LENGTH}
        hint={`${BIO_MAX_LENGTH} characters max`}
        placeholder="A line about you, or what you're looking for."
        defaultValue={values?.bio ?? bio ?? ""}
        error={state.fieldErrors?.bio}
      />

      <div className="flex justify-end border-t border-line pt-6">
        <Button type="submit" loading={pending} disabled={uploading}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
