"use client";

import {
  POST_PHOTOS_BUCKET,
  POST_VIDEOS_BUCKET,
  type VideoProvider,
  type VideoUploadInput,
  type VideoUploadResult,
} from "@dwellr/core";

import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase Storage implementation of the core VideoProvider boundary.
 * Upload uses XHR so the create screen can show real progress and cancel.
 */
export class SupabaseVideoProvider implements VideoProvider {
  readonly name = "supabase-storage";

  async upload({
    path,
    file,
    contentType,
    onProgress,
    signal,
  }: VideoUploadInput): Promise<VideoUploadResult> {
    const supabase = createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Your session expired before the upload finished. Sign in and try again.");
    }

    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");

    return new Promise<VideoUploadResult>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${supabaseUrl}/storage/v1/object/${POST_VIDEOS_BUCKET}/${encodedPath}`);
      request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      request.setRequestHeader("apikey", supabaseAnonKey);
      request.setRequestHeader("Content-Type", contentType);
      request.setRequestHeader("x-upsert", "false");
      request.setRequestHeader("cache-control", "max-age=3600");

      function abort() {
        request.abort();
        reject(new Error("Upload cancelled."));
      }

      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });

      request.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        }
      };

      request.onerror = () => {
        reject(new Error("That video couldn't be uploaded. Check your connection and try again."));
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress?.(100);
          resolve({ path, sizeBytes: file.size });
          return;
        }

        let message = "That video couldn't be uploaded.";
        try {
          const body = JSON.parse(request.responseText) as { message?: string };
          if (body.message?.toLowerCase().includes("row-level security")) {
            message = "Your session expired before the upload finished. Sign in and try again.";
          } else if (body.message?.toLowerCase().includes("mime")) {
            message = "Storage rejected that file type. Use MP4 (H.264) or WebM.";
          } else if (body.message?.toLowerCase().includes("size")) {
            message = "Storage rejected that file because it is over 25 MB.";
          }
        } catch {
          // Keep the generic message when the response is not JSON.
        }
        reject(new Error(message));
      };

      request.send(file);
    });
  }

  async remove(path: string): Promise<void> {
    const supabase = createClient();
    await supabase.storage.from(POST_VIDEOS_BUCKET).remove([path]);
  }

  playbackUrl(path: string): string {
    const supabase = createClient();
    return supabase.storage.from(POST_VIDEOS_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  posterUrl(path: string): string {
    const supabase = createClient();
    return supabase.storage.from(POST_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
  }
}
