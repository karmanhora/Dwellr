import type { Profile, ProfileRow } from "../types/profile";

/** Maps a database row to the camelCase profile used across clients. */
export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
  };
}

/** Display name falls back to the username so the UI never shows a blank. */
export function getDisplayName(profile: Pick<Profile, "displayName" | "username">): string {
  const trimmed = profile.displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : profile.username;
}

/** One or two letters for the avatar fallback, derived from the display name. */
export function getInitials(value: string): string {
  const words = value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);

  if (words.length === 0) return "?";

  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/** Human-readable join date, stable across clients and locales. */
export function formatMemberSince(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Member";

  return `Member since ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date)}`;
}
