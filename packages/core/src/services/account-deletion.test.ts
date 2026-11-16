import { describe, expect, it } from "vitest";

import {
  ACCOUNT_STORAGE_BUCKETS,
  removeUserStorageObjects,
  type AccountStorageClient,
} from "./account-deletion";

type BucketObjects = Map<string, Set<string>>;

function createFakeStorage(
  initial: Partial<Record<(typeof ACCOUNT_STORAGE_BUCKETS)[number], string[]>>,
  options: { ignoreRemoves?: boolean } = {},
): { client: AccountStorageClient; objects: BucketObjects } {
  const objects: BucketObjects = new Map(
    ACCOUNT_STORAGE_BUCKETS.map((bucket) => [bucket, new Set(initial[bucket] ?? [])]),
  );

  const client: AccountStorageClient = {
    async list(bucket, prefix) {
      const children = new Map<string, { name: string; id: string | null }>();
      const bucketObjects = objects.get(bucket) ?? new Set<string>();

      for (const path of bucketObjects) {
        if (!path.startsWith(`${prefix}/`)) continue;

        const remainder = path.slice(prefix.length + 1);
        const [name, ...rest] = remainder.split("/");
        if (!name) continue;

        children.set(name, { name, id: rest.length > 0 ? null : path });
      }

      return { data: [...children.values()], error: null };
    },
    async remove(bucket, paths) {
      if (!options.ignoreRemoves) {
        const bucketObjects = objects.get(bucket);
        for (const path of paths) bucketObjects?.delete(path);
      }
      return { error: null };
    },
  };

  return { client, objects };
}

describe("removeUserStorageObjects", () => {
  it("removes nested and top-level files across every user bucket", async () => {
    const { client, objects } = createFakeStorage({
      avatars: ["user-1/avatar.webp"],
      "property-photos": ["user-1/album/one.webp", "user-1/album/two.webp"],
      "post-photos": ["user-1/photo.webp"],
      "post-videos": ["user-1/clip.mp4"],
    });

    await expect(removeUserStorageObjects(client, "user-1")).resolves.toEqual({
      objectsRemoved: 5,
    });

    expect([...objects.values()].map((bucket) => bucket.size)).toEqual([0, 0, 0, 0]);
  });

  it("re-lists after removal and fails instead of reporting an orphaned file", async () => {
    const { client } = createFakeStorage(
      {
        avatars: ["user-1/avatar.webp"],
      },
      { ignoreRemoves: true },
    );

    await expect(removeUserStorageObjects(client, "user-1")).rejects.toThrow(
      "object(s) still exist after cleanup",
    );
  });
});
