import {
  AVATAR_BUCKET,
  buildPublicStorageUrl,
  POST_PHOTOS_BUCKET,
  POST_VIDEOS_BUCKET,
  PROPERTY_BUCKET,
} from "@dwellr/core";

import { getPublicEnv } from "@/lib/env";

export function propertyPhotoUrl(storagePath: string): string {
  return buildPublicStorageUrl(getPublicEnv().supabaseUrl, PROPERTY_BUCKET, storagePath);
}

export function postPhotoUrl(storagePath: string): string {
  return buildPublicStorageUrl(getPublicEnv().supabaseUrl, POST_PHOTOS_BUCKET, storagePath);
}

export function postVideoUrl(storagePath: string): string {
  return buildPublicStorageUrl(getPublicEnv().supabaseUrl, POST_VIDEOS_BUCKET, storagePath);
}

/** Avatars are stored as a public URL; tolerate a legacy bare path too. */
export function avatarPublicUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.includes("/")) return null;
  return buildPublicStorageUrl(getPublicEnv().supabaseUrl, AVATAR_BUCKET, value);
}
