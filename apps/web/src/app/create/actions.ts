"use server";

import { createPropertySchema, getFieldErrors } from "@hauscrawl/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  parseFormPhotos,
  readPropertyFields,
  snapshotPropertyForm,
  type PropertyFormState,
} from "@/lib/property-form";
import { createClient } from "@/lib/supabase/server";

export async function createPropertyAction(
  _previousState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "Your session expired. Sign in again to publish this home.",
      values: snapshotPropertyForm(formData),
    };
  }

  const { fields, fieldErrors } = readPropertyFields(formData);
  const photos = parseFormPhotos(formData);
  const parsed = createPropertySchema.safeParse({ ...fields, photos });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { ...fieldErrors, ...getFieldErrors(parsed.error) },
      values: snapshotPropertyForm(formData),
    };
  }

  // Defence in depth: storage policies already restrict writes to this prefix,
  // but a property must never point at another account's objects.
  if (parsed.data.photos.some((photo) => !photo.storagePath.startsWith(`${user.id}/`))) {
    return {
      status: "error",
      message: "Those photos belong to a different account. Remove them and upload again.",
      values: snapshotPropertyForm(formData),
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      created_by: user.id,
      title: input.title,
      description: input.description ?? null,
      listing_status: input.listingStatus,
      price_cents: input.priceCents,
      currency: input.currency,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      square_feet: input.squareFeet,
      property_type: input.propertyType,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state ?? null,
      postal_code: input.postalCode ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select("id")
    .single();

  if (error || !property) {
    console.error("[properties] create failed:", error?.message);
    return {
      status: "error",
      message: "We couldn't publish this home. Nothing was saved — try again.",
      values: snapshotPropertyForm(formData),
    };
  }

  const { error: photoError } = await supabase.from("property_photos").insert(
    input.photos.map((photo, index) => ({
      property_id: property.id,
      storage_path: photo.storagePath,
      position: index,
      alt_text: photo.altText ?? null,
      width: photo.width ?? null,
      height: photo.height ?? null,
    })),
  );

  if (photoError) {
    console.error("[properties] photo link failed:", photoError.message);
    // The post is useless without its photos; drop it so nothing half-made is
    // left in the feed. Uploaded objects are cleaned up by the owner later.
    await supabase.from("properties").delete().eq("id", property.id);
    return {
      status: "error",
      message: "The photos couldn't be attached, so the post was not published. Try again.",
      values: snapshotPropertyForm(formData),
    };
  }

  revalidatePath("/explore");
  redirect(`/p/${property.id}`);
}
