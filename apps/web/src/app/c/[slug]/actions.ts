"use server";

import {
  collectionEvaluationSchema,
  collectionInviteRoleSchema,
  createCollectionInviteLinkSchema,
  createCollectionInviteSchema,
  getFieldErrors,
  isUuid,
  parseTagList,
} from "@hauscrawl/core";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getCollectionSlug, getProfileIdByUsername } from "@/lib/social";
import { readText } from "@/lib/property-form";
import { createClient } from "@/lib/supabase/server";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenForInvite(): string {
  return randomBytes(32).toString("base64url");
}

function safeSlug(value: string): string {
  return /^[a-z0-9]{12}$/.test(value) ? value : "";
}

export async function inviteByUsernameAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const slug = safeSlug(readText(formData, "slug"));

  if (!user) redirect(`/sign-in?next=/c/${slug}`);
  if (!isUuid(collectionId) || !slug) redirect("/saved");

  const parsed = createCollectionInviteSchema.safeParse({
    collectionId,
    username: readText(formData, "username"),
    role: readText(formData, "role") || "viewer",
    expiresInDays: readText(formData, "expiresInDays") || "7",
    maxUses: "1",
  });

  if (!parsed.success) {
    redirect(`/c/${slug}?inviteError=${encodeURIComponent(Object.values(getFieldErrors(parsed.error))[0] ?? "Check the invite details.")}`);
  }

  const invitee = await getProfileIdByUsername(parsed.data.username);
  if (!invitee || invitee.id === user.id) {
    redirect(`/c/${slug}?inviteError=${encodeURIComponent("That username was not found, or is already you.")}`);
  }

  const supabase = await createClient();
  const { data: existingMember } = await supabase
    .from("collection_members")
    .select("user_id")
    .eq("collection_id", collectionId)
    .eq("user_id", invitee.id)
    .maybeSingle();

  if (existingMember) {
    redirect(`/c/${slug}?inviteError=${encodeURIComponent("That person is already in this collection.")}`);
  }

  const token = tokenForInvite();
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("collection_invites").insert({
    collection_id: collectionId,
    invited_by: user.id,
    invitee_id: invitee.id,
    role: parsed.data.role,
    token_hash: hashToken(token),
    max_uses: 1,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[collections] invite failed:", error.message);
    redirect(`/c/${slug}?inviteError=${encodeURIComponent("We couldn't send that invite.")}`);
  }

  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}?invited=1`);
}

export async function createInviteLinkAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const slug = safeSlug(readText(formData, "slug"));

  if (!user) redirect(`/sign-in?next=/c/${slug}`);
  if (!isUuid(collectionId) || !slug) redirect("/saved");

  const parsed = createCollectionInviteLinkSchema.safeParse({
    collectionId,
    role: readText(formData, "role") || "viewer",
    expiresInDays: readText(formData, "expiresInDays") || "7",
    maxUses: readText(formData, "maxUses") || "5",
  });

  if (!parsed.success) {
    redirect(`/c/${slug}?inviteError=${encodeURIComponent("Choose a valid link role, expiry, and use count.")}`);
  }

  const token = tokenForInvite();
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { error } = await supabase.from("collection_invites").insert({
    collection_id: collectionId,
    invited_by: user.id,
    invitee_id: null,
    role: parsed.data.role,
    token_hash: hashToken(token),
    max_uses: parsed.data.maxUses,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[collections] link invite failed:", error.message);
    redirect(`/c/${slug}?inviteError=${encodeURIComponent("We couldn't create that link.")}`);
  }

  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}?link=${encodeURIComponent(token)}`);
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const inviteId = readText(formData, "inviteId");
  const slug = safeSlug(readText(formData, "slug"));
  if (!user || !isUuid(inviteId) || !slug) redirect(`/c/${slug}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .select("id");

  if (error) console.error("[collections] revoke invite failed:", error.message);
  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}?updated=1`);
}

export async function changeMemberRoleAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const memberId = readText(formData, "memberId");
  const slug = safeSlug(readText(formData, "slug"));
  const role = collectionInviteRoleSchema.safeParse(readText(formData, "role"));

  if (!user || !isUuid(collectionId) || !isUuid(memberId) || !slug || !role.success) {
    redirect(`/c/${slug}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_members")
    .update({ role: role.data })
    .eq("collection_id", collectionId)
    .eq("user_id", memberId)
    .select("user_id");

  if (error) console.error("[collections] role update failed:", error.message);
  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}?updated=1`);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const memberId = readText(formData, "memberId");
  const slug = safeSlug(readText(formData, "slug"));
  if (!user || !isUuid(collectionId) || !isUuid(memberId) || !slug) redirect(`/c/${slug}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_members")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", memberId)
    .neq("role", "owner");

  if (error) console.error("[collections] remove member failed:", error.message);
  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}?updated=1`);
}

export async function leaveCollectionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const slug = safeSlug(readText(formData, "slug"));
  if (!user || !isUuid(collectionId) || !slug) redirect(`/c/${slug}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_members")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", user.id)
    .neq("role", "owner");

  if (error) console.error("[collections] leave failed:", error.message);
  revalidatePath("/saved");
  redirect("/saved?left=1");
}

export async function saveEvaluationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const propertyId = readText(formData, "propertyId");
  const slug = safeSlug(readText(formData, "slug"));

  if (!user) redirect(`/sign-in?next=/c/${slug}`);
  if (!isUuid(collectionId) || !isUuid(propertyId) || !slug) redirect(`/c/${slug}`);

  const parsed = collectionEvaluationSchema.safeParse({
    collectionId,
    propertyId,
    rating: readText(formData, "rating"),
    note: readText(formData, "note"),
    pros: parseTagList(readText(formData, "pros")),
    cons: parseTagList(readText(formData, "cons")),
  });

  if (!parsed.success) {
    redirect(`/c/${slug}?evaluationError=1`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("collection_item_evaluations").upsert(
    {
      collection_id: collectionId,
      property_id: propertyId,
      user_id: user.id,
      rating: parsed.data.rating,
      note: parsed.data.note ?? null,
      pros: parsed.data.pros,
      cons: parsed.data.cons,
    },
    { onConflict: "collection_id,property_id,user_id" },
  );

  if (error) {
    console.error("[collections] evaluation save failed:", error.message);
    redirect(`/c/${slug}?evaluationError=1`);
  }

  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/compare`);
  redirect(`/c/${slug}?evaluated=1`);
}

export async function removeEvaluationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const collectionId = readText(formData, "collectionId");
  const propertyId = readText(formData, "propertyId");
  const slug = safeSlug(readText(formData, "slug"));

  if (!user || !isUuid(collectionId) || !isUuid(propertyId) || !slug) redirect(`/c/${slug}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_item_evaluations")
    .delete()
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId)
    .eq("user_id", user.id);

  if (error) console.error("[collections] evaluation delete failed:", error.message);
  revalidatePath(`/c/${slug}`);
  redirect(`/c/${slug}?updated=1`);
}

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = readText(formData, "token");
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/invite/${encodeURIComponent(token)}`);
  if (!token) redirect("/notifications");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_collection_invite", {
    p_token_hash: hashToken(token),
  });

  if (error || !data) {
    console.error("[collections] accept invite failed:", error?.message);
    redirect(`/invite/${encodeURIComponent(token)}?error=1`);
  }

  const slug = await getCollectionSlug(data);
  if (!slug) redirect("/saved?joined=1");
  redirect(`/c/${slug}?joined=1`);
}

export async function acceptDirectInviteAction(formData: FormData): Promise<void> {
  const inviteId = readText(formData, "inviteId");
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/notifications");
  if (!isUuid(inviteId)) redirect("/notifications");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_collection_invite_by_id", {
    p_invite_id: inviteId,
  });

  if (error || !data) {
    console.error("[collections] accept direct invite failed:", error?.message);
    redirect("/notifications?inviteError=1");
  }

  const slug = await getCollectionSlug(data);
  revalidatePath("/notifications");
  redirect(slug ? `/c/${slug}?joined=1` : "/saved?joined=1");
}

export async function declineDirectInviteAction(formData: FormData): Promise<void> {
  const inviteId = readText(formData, "inviteId");
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/notifications");
  if (!isUuid(inviteId)) redirect("/notifications");

  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_collection_invite_by_id", {
    p_invite_id: inviteId,
  });

  if (error) console.error("[collections] decline direct invite failed:", error.message);
  revalidatePath("/notifications");
  redirect("/notifications?declined=1");
}

export async function declineInviteAction(formData: FormData): Promise<void> {
  const token = readText(formData, "token");
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/invite/${encodeURIComponent(token)}`);
  if (!token) redirect("/notifications");

  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_collection_invite", {
    p_token_hash: hashToken(token),
  });

  if (error) console.error("[collections] decline invite failed:", error.message);
  redirect("/notifications?declined=1");
}
