"use server";

import { getFieldErrors, isUuid, PROPERTY_BUCKET, updatePropertySchema } from "@hauscrawl/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  readPropertyFields,
  readText,
  snapshotPropertyForm,
  type PropertyFormState,
} from "@/lib/property-form";
import { createClient } from "@/lib/supabase/server";

export async function updatePropertyAction(
  _previousState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getCurrentUser();
  const id = readText(formData, "propertyId");

  if (!user) {
    return {
      status: "error",
      message: "Your session expired. Sign in again to save changes.",
      values: snapshotPropertyForm(formData),
    };
  }
  if (!isUuid(id)) {
    return { status: "error", message: "That property link is not valid." };
  }

  const { fields, fieldErrors } = readPropertyFields(formData);
  const parsed = updatePropertySchema.safeParse(fields);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { ...fieldErrors, ...getFieldErrors(parsed.error) },
      values: snapshotPropertyForm(formData),
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  // The owner filter is redundant with RLS, and intentionally so: an update
  // that returns no row must never look like a success.
  const { data, error } = await supabase
    .from("properties")
    .update({
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
    .eq("id", id)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[properties] update failed:", error.message);
    return {
      status: "error",
      message: "We couldn't save those changes. Try again.",
      values: snapshotPropertyForm(formData),
    };
  }
  if (!data) {
    return {
      status: "error",
      message: "You can only edit a post you created. It may also have been removed.",
      values: snapshotPropertyForm(formData),
    };
  }

  revalidatePath(`/p/${id}`);
  revalidatePath("/explore");
  redirect(`/p/${id}?updated=1`);
}

export async function reconfirmPropertyAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = readText(formData, "propertyId");

  if (!user || !isUuid(id)) redirect(`/p/${id}`);

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!property) redirect(`/p/${id}`);

  const { error } = await supabase.from("property_confirmations").insert({
    property_id: id,
    confirmed_by: user.id,
  });

  if (error) {
    console.error("[properties] confirmation failed:", error.message);
    redirect(`/p/${id}`);
  }

  revalidatePath(`/p/${id}`);
  revalidatePath("/explore");
  redirect(`/p/${id}?confirmed=1`);
}

export async function deletePropertyAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = readText(formData, "propertyId");

  if (!user || !isUuid(id)) redirect("/explore");

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, created_by, property_photos(storage_path)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[properties] delete lookup failed:", error.message);
    redirect(`/p/${id}`);
  }
  if (!property || property.created_by !== user.id) redirect(`/p/${id}`);

  const paths = property.property_photos.map((photo) => photo.storage_path);

  if (paths.length > 0) {
    // Storage policies also scope deletes to the owner's prefix.
    const { error: storageError } = await supabase.storage.from(PROPERTY_BUCKET).remove(paths);
    if (storageError) {
      console.error("[properties] photo cleanup failed:", storageError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (deleteError) {
    console.error("[properties] delete failed:", deleteError.message);
    redirect(`/p/${id}`);
  }

  revalidatePath("/explore");
  revalidatePath("/me");
  redirect("/explore?deleted=1");
}
