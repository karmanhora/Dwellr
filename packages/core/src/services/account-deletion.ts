import { AVATAR_BUCKET, PROPERTY_BUCKET } from "../constants/property";
import { POST_PHOTOS_BUCKET, POST_VIDEOS_BUCKET } from "../constants/post";

/** Every bucket that can contain files owned by a user. */
export const ACCOUNT_STORAGE_BUCKETS = [
  AVATAR_BUCKET,
  PROPERTY_BUCKET,
  POST_PHOTOS_BUCKET,
  POST_VIDEOS_BUCKET,
] as const;

export type AccountStorageBucket = (typeof ACCOUNT_STORAGE_BUCKETS)[number];

export interface AccountStorageEntry {
  name: string;
  id: string | null;
}

export interface AccountStorageError {
  message: string;
}

export interface AccountStorageListOptions {
  limit: number;
  offset: number;
}

/**
 * Small adapter shape kept independent of the Supabase client so the cleanup
 * policy can be unit tested without a live project.
 */
export interface AccountStorageClient {
  list(
    bucket: AccountStorageBucket,
    prefix: string,
    options: AccountStorageListOptions,
  ): Promise<{ data: AccountStorageEntry[] | null; error: AccountStorageError | null }>;
  remove(
    bucket: AccountStorageBucket,
    paths: string[],
  ): Promise<{ error: AccountStorageError | null }>;
}

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

async function listPaths(
  client: AccountStorageClient,
  bucket: AccountStorageBucket,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await client.list(bucket, prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
    });

    if (error) {
      throw new Error(`Could not list ${bucket}/${prefix}: ${error.message}`);
    }

    const entries = data ?? [];

    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;

      // Supabase represents folders with a null object id; recurse so cleanup
      // does not depend on the current one-level upload convention.
      if (entry.id === null) {
        paths.push(...(await listPaths(client, bucket, path)));
      } else {
        paths.push(path);
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break;
    offset += entries.length;
  }

  return paths;
}

/**
 * Remove every file under `<userId>/` in every user-owned bucket, then re-list
 * each bucket. Throws if anything remains, so callers can abort account
 * deletion rather than leave orphaned files behind.
 */
export async function removeUserStorageObjects(
  client: AccountStorageClient,
  userId: string,
): Promise<{ objectsRemoved: number }> {
  if (!userId) throw new Error("A user id is required to clean up storage.");

  let objectsRemoved = 0;

  for (const bucket of ACCOUNT_STORAGE_BUCKETS) {
    const paths = await listPaths(client, bucket, userId);

    for (let index = 0; index < paths.length; index += REMOVE_BATCH_SIZE) {
      const batch = paths.slice(index, index + REMOVE_BATCH_SIZE);
      const { error } = await client.remove(bucket, batch);

      if (error) {
        throw new Error(`Could not remove ${bucket} objects: ${error.message}`);
      }
    }

    const remaining = await listPaths(client, bucket, userId);
    if (remaining.length > 0) {
      throw new Error(
        `${remaining.length} ${bucket} object(s) still exist after cleanup.`,
      );
    }

    objectsRemoved += paths.length;
  }

  return { objectsRemoved };
}
