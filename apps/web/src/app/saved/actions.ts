"use server";

import {
  COLLECTION_SHARE_SLUG_LENGTH,
  createCollectionSchema,
  getFieldErrors,
  isUuid,
} from "@hauscrawl/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  readCollectionFields,
  snapshotCollectionForm,
  type CollectionFormState,
} from "@/lib/collection-form";
import { readText } from "@/lib/property-form";
import { createClient } from "@/lib/supabase/server";

function generateShareSlug(): string {
  // 12 lowercase hex characters, generated server-side. The DB enforces the
  // shape and the unique index; collisions are retried below.
  return crypto.randomUUID().replace(/-/g, "").slice(0, COLLECTION_SHARE_SLUG_LENGTH);
}

/** Idempotent save/unsave; the property stays independent of any collection. */
export async function toggleSaveAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const propertyId = readText(formData, "propertyId");
  if (!user) redirect(`/sign-in?next=/p/${propertyId}`);
  if (!isUuid(propertyId)) return;

  const remove = readText(formData, "intent") === "remove";
  const supabase = await createClient();

  if (remove) {
    await supabase
      .from("property_saves")
      .delete()
      .eq("property_id", propertyId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("property_saves").upsert(
      { property_id: propertyId, user_id: user.id },
      { onConflict: "property_id,user_id", ignoreDuplicates: true },
    );
  }

  revalidatePath(`/p/${propertyId}`);
  revalidatePath("/saved");
}

export async function createCollectionAction(
  _previousState: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const user = await getCurrentUser();
  const values = snapshotCollectionForm(formData);

  if (!user) {
    return {
      status: "error",
      message: "Your session expired. Sign in again to create a collection.",
      values,
    };
  }

  const parsed = createCollectionSchema.safeParse(readCollectionFields(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: getFieldErrors(parsed.error),
      values,
    };
  }

  const propertyId = readText(formData, "propertyId");
  const supabase = await createClient();

  if (propertyId) {
    if (!isUuid(propertyId)) {
      return { status: "error", message: "That property link is not valid.", values };
    }
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .maybeSingle();
    if (!property) {
      return {
        status: "error",
        message: "That home is no longer available, so the collection was not created.",
        values,
      };
    }
  }

  let created: { id: string; share_slug: string } | null = null;

  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const { data, error } = await supabase
      .from("collections")
      .insert({
        owner_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        is_public: parsed.data.isPublic,
        share_slug: generateShareSlug(),
      })
      .select("id, share_slug")
      .single();

    if (data) {
      created = data;
      break;
    }

    const duplicate = error?.code === "23505" || error?.message.includes("duplicate");
    if (!duplicate) {
      console.error("[collections] create failed:", error?.message);
      return {
        status: "error",
        message: "We couldn't create that collection. Try again.",
        values,
      };
    }
  }

  if (!created) {
    return {
      status: "error",
      message: "We couldn't generate a share link. Try again.",
      values,
    };
  }

  if (propertyId) {
    const { error: itemError } = await supabase.from("collection_items").insert({
      collection_id: created.id,
      property_id: propertyId,
      added_by: user.id,
    });

    if (itemError) {
      console.error("[collections] initial item failed:", itemError.message);
      revalidatePath("/saved");
      redirect(`/c/${created.share_slug}?itemError=1`);
    }
  }

  revalidatePath("/saved");
  redirect(propertyId ? `/c/${created.share_slug}?added=1` : `/c/${created.share_slug}`);
}

export async function addToCollectionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const propertyId = readText(formData, "propertyId");
  const slug = readText(formData, "slug");

  if (!user) redirect("/sign-in?next=/saved");
  if (!isUuid(collectionId) || !isUuid(propertyId) || !/^[a-z0-9]{12}$/.test(slug)) {
    redirect("/saved");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("collection_items").upsert(
    { collection_id: collectionId, property_id: propertyId, added_by: user.id },
    { onConflict: "collection_id,property_id", ignoreDuplicates: true },
  );

  if (error) console.error("[collections] add item failed:", error.message);

  revalidatePath(`/c/${slug}`);
  revalidatePath("/saved");
  redirect(`/c/${slug}?added=1`);
}

export async function removeFromCollectionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const propertyId = readText(formData, "propertyId");
  const slug = readText(formData, "slug");

  if (!user) redirect("/sign-in?next=/saved");
  if (!isUuid(collectionId) || !isUuid(propertyId) || !/^[a-z0-9]{12}$/.test(slug)) {
    redirect("/saved");
  }

  const supabase = await createClient();
  await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId);

  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}`);
}

export async function setCollectionVisibilityAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = readText(formData, "collectionId");
  const slug = readText(formData, "slug");
  const isPublic = readText(formData, "isPublic") === "true";

  if (!user) redirect("/sign-in?next=/saved");
  if (!isUuid(id) || !/^[a-z0-9]{12}$/.test(slug)) redirect("/saved");

  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) console.error("[collections] visibility update failed:", error.message);

  revalidatePath(`/c/${slug}`);
  revalidatePath("/saved");
  redirect(`/c/${slug}?updated=1`);
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = readText(formData, "collectionId");

  if (!user) redirect("/sign-in?next=/saved");
  if (!isUuid(id)) redirect("/saved");

  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) console.error("[collections] delete failed:", error.message);

  revalidatePath("/saved");
  redirect("/saved?deleted=1");
}

