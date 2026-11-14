/** Shape as stored in Postgres (snake_case). */
export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

/** Shape used by UI code (camelCase, no transport concerns). */
export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export type ProfileField = "username" | "displayName" | "bio" | "avatarUrl";
