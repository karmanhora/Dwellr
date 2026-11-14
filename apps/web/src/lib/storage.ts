import { AVATAR_BUCKET, buildPublicStorageUrl, PROPERTY_BUCKET } from "@dwellr/core";

import { getPublicEnv } from "@/lib/env";

export function propertyPhotoUrl(storagePath: string): string {
  return buildPublicStorageUrl(getPublicEnv().supabaseUrl, PROPERTY_BUCKET, storagePath);
}

/** Avatars are stored as a public URL; tolerate a legacy bare path too. */
export function avatarPublicUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.includes("/")) return null;
  return buildPublicStorageUrl(getPublicEnv().supabaseUrl, AVATAR_BUCKET, value);
}
