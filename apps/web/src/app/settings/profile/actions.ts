"use server";

import {
  AVATAR_BUCKET,
  buildPublicStorageUrl,
  getFieldErrors,
  updateProfileSchema,
} from "@dwellr/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProfileFormState } from "@/lib/profile-form";
import { getCurrentUser } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { readText } from "@/lib/property-form";
import { createClient } from "@/lib/supabase/server";

// Same shape the storage policy and the photo paths use: <user-id>/<uuid>.<ext>
const AVATAR_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  const values = {
    displayName: readText(formData, "displayName"),
    bio: readText(formData, "bio"),
  };

  if (!user) {
    return { status: "error", message: "Your session expired. Sign in again.", values };
  }

  const parsed = updateProfileSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: getFieldErrors(parsed.error),
      values,
    };
  }

  const avatarPath = readText(formData, "avatarPath").trim();
  let avatarUrl: string | undefined;

  if (avatarPath) {
    if (!AVATAR_PATH_PATTERN.test(avatarPath) || !avatarPath.startsWith(`${user.id}/`)) {
      return {
        status: "error",
        message: "That avatar upload is not valid. Please choose the image again.",
        values,
      };
    }
    avatarUrl = buildPublicStorageUrl(getPublicEnv().supabaseUrl, AVATAR_BUCKET, avatarPath);
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName ?? null,
      bio: parsed.data.bio ?? null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id)
    .select("username")
    .single();

  if (error || !profile) {
    console.error("[profiles] update failed:", error?.message);
    return { status: "error", message: "We couldn't save your profile. Try again.", values };
  }

  revalidatePath("/me");
  revalidatePath(`/u/${profile.username}`);
  redirect(`/u/${profile.username}?updated=1`);
}
