"use server";

import {
  createPostSchema,
  getFieldErrors,
  isUuid,
  POST_CATEGORY_MAX,
  POST_PHOTOS_BUCKET,
  POST_VIDEOS_BUCKET,
  updatePostSchema,
  type PostVideoInput,
} from "@dwellr/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  parsePhotos,
  parseVideo,
  publishErrorMessage,
  readText,
  snapshotPostForm,
  type PostFormState,
} from "@/lib/post-form";
import { createClient } from "@/lib/supabase/server";

async function removeUploadedMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photos: { storagePath: string }[],
  video: PostVideoInput | undefined,
): Promise<void> {
  const photoPaths = photos.map((photo) => photo.storagePath);
  if (video) photoPaths.push(video.posterPath);

  if (photoPaths.length > 0) {
    await supabase.storage.from(POST_PHOTOS_BUCKET).remove(photoPaths);
  }
  if (video) {
    await supabase.storage.from(POST_VIDEOS_BUCKET).remove([video.storagePath]);
  }
}

function postPath(formData: FormData, fallback: string): string {
  const value = readText(formData, "next");
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function createPostAction(
  _previousState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "Your session expired. Sign in again to publish this post.",
      values: snapshotPostForm(formData),
    };
  }

  const kind = readText(formData, "kind");
  const categories = formData
    .getAll("categories")
    .filter((value): value is string => typeof value === "string")
    .slice(0, POST_CATEGORY_MAX);
  const photos = parsePhotos(formData);
  const video = parseVideo(formData);

  const parsed = createPostSchema.safeParse({
    kind,
    caption: readText(formData, "caption"),
    categories,
    propertyId: readText(formData, "propertyId"),
    neighborhood: readText(formData, "neighborhood"),
    city: readText(formData, "city"),
    photos,
    video,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: getFieldErrors(parsed.error),
      values: snapshotPostForm(formData),
    };
  }

  const input = parsed.data;
  if (input.photos.some((photo) => !photo.storagePath.startsWith(`${user.id}/`))) {
    return {
      status: "error",
      message: "Those photos belong to a different account. Remove them and upload again.",
      values: snapshotPostForm(formData),
    };
  }
  if (
    input.video &&
    (!input.video.storagePath.startsWith(`${user.id}/`) ||
      !input.video.posterPath.startsWith(`${user.id}/`))
  ) {
    return {
      status: "error",
      message: "That video belongs to a different account. Remove it and upload again.",
      values: snapshotPostForm(formData),
    };
  }

  const supabase = await createClient();
  const { data: postId, error } = await supabase.rpc("create_post", {
    p_kind: input.kind,
    p_caption: input.caption,
    p_categories: input.categories,
    p_property_id: input.propertyId ?? null,
    p_neighborhood: input.neighborhood ?? null,
    p_city: input.city ?? null,
    p_photos: input.photos,
    p_video: input.video ?? null,
  });

  if (error || !postId) {
    console.error("[posts] create failed:", error?.message);
    await removeUploadedMedia(supabase, input.photos, input.video);
    return {
      status: "error",
      message: publishErrorMessage(error?.message ?? ""),
      values: snapshotPostForm(formData),
    };
  }

  revalidatePath("/feed");
  revalidatePath("/explore");
  revalidatePath("/watch");
  revalidatePath("/");
  redirect(`/posts/${postId}?created=1`);
}

export async function updatePostAction(
  _previousState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await getCurrentUser();
  const postId = readText(formData, "postId");
  if (!user) return { status: "error", message: "Your session expired. Sign in again." };
  if (!isUuid(postId)) return { status: "error", message: "That post could not be found." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("posts")
    .select("id, author_id, kind")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing || existing.author_id !== user.id) {
    return { status: "error", message: "You can only edit your own post." };
  }

  const parsed = updatePostSchema.safeParse({
    caption: readText(formData, "caption"),
    categories: formData
      .getAll("categories")
      .filter((value): value is string => typeof value === "string")
      .slice(0, POST_CATEGORY_MAX),
    propertyId: readText(formData, "propertyId"),
    neighborhood: readText(formData, "neighborhood"),
    city: readText(formData, "city"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: getFieldErrors(parsed.error),
      values: snapshotPostForm(formData),
    };
  }
  if (existing.kind === "text" && parsed.data.caption.trim().length === 0) {
    return {
      status: "error",
      message: "Write something for a text post.",
      fieldErrors: { caption: "Write something for a text post." },
      values: snapshotPostForm(formData),
    };
  }

  const { error } = await supabase
    .from("posts")
    .update({
      caption: parsed.data.caption,
      categories: parsed.data.categories,
      property_id: parsed.data.propertyId ?? null,
      neighborhood: parsed.data.neighborhood ?? null,
      city: parsed.data.city ?? null,
    })
    .eq("id", postId)
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[posts] update failed:", error.message);
    return {
      status: "error",
      message: error.message.includes("property")
        ? "That tagged home no longer exists. Remove the tag and try again."
        : "We couldn't save those changes. Try again.",
      values: snapshotPostForm(formData),
    };
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/feed");
  revalidatePath("/watch");
  redirect(`/posts/${postId}?updated=1`);
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const postId = readText(formData, "postId");
  const fallback = postPath(formData, "/feed");
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(fallback)}`);
  if (!isUuid(postId)) redirect(fallback);

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, author_id, property_id, post_photos(storage_path), videos(storage_path, poster_path), profiles!posts_author_id_fkey(username)",
    )
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!post || post.author_id !== user.id) redirect(fallback);

  const row = post as unknown as {
    id: string;
    author_id: string;
    property_id: string | null;
    post_photos: { storage_path: string }[] | null;
    videos: { storage_path: string; poster_path: string } | { storage_path: string; poster_path: string }[] | null;
    profiles: { username: string } | null;
  };
  const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;

  const photoPaths = (row.post_photos ?? []).map((photo) => photo.storage_path);
  if (video) photoPaths.push(video.poster_path);
  if (photoPaths.length > 0) {
    const { error } = await supabase.storage.from(POST_PHOTOS_BUCKET).remove(photoPaths);
    if (error) console.error("[posts] photo cleanup failed:", error.message);
  }
  if (video) {
    const { error } = await supabase.storage.from(POST_VIDEOS_BUCKET).remove([video.storage_path]);
    if (error) console.error("[posts] video cleanup failed:", error.message);
  }

  const { error } = await supabase.rpc("soft_delete_post", { p_post_id: postId });
  if (error) {
    console.error("[posts] soft delete failed:", error.message);
    redirect(`/posts/${postId}?deleteError=1`);
  }

  revalidatePath("/feed");
  revalidatePath("/explore");
  revalidatePath("/watch");
  revalidatePath(`/posts/${postId}`);
  if (row.property_id) revalidatePath(`/p/${row.property_id}`);
  if (row.profiles?.username) revalidatePath(`/u/${row.profiles.username}`);

  redirect(row.profiles?.username ? `/u/${row.profiles.username}?postDeleted=1` : "/feed?postDeleted=1");
}
