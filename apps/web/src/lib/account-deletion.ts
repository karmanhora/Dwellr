import { removeUserStorageObjects } from "@dwellr/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/** Remove and verify every storage object under the signed-in user's prefix. */
export async function removeUserStorage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ objectsRemoved: number }> {
  return removeUserStorageObjects(
    {
      list: async (bucket, prefix, options) => {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, options);
        return {
          data: data?.map(({ id, name }) => ({ id, name })) ?? null,
          error,
        };
      },
      remove: async (bucket, paths) => {
        const { error } = await supabase.storage.from(bucket).remove(paths);
        return { error };
      },
    },
    userId,
  );
}
