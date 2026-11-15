"use server";

import {
  commentSchema,
  feedPreferencesSchema,
  getFieldErrors,
  isUuid,
  reportSchema,
  safeRedirectPath,
} from "@dwellr/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { readText } from "@/lib/property-form";
import { createClient } from "@/lib/supabase/server";

export type ReportState = {
  status: "idle" | "success" | "error";
  message?: string;
};


function backTo(formData: FormData, fallback: string): string {
  return safeRedirectPath(readText(formData, "next"), fallback);
}

export async function toggleLikeAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const targetType = readText(formData, "targetType");
  const targetId = readText(formData, "targetId");
  const fallback = targetType === "post" ? `/posts/${targetId}` : `/p/${targetId}`;
  const next = backTo(formData, fallback);

  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if ((targetType !== "property" && targetType !== "post") || !isUuid(targetId)) {
    redirect(next);
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("content_likes")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("content_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
    : await supabase.from("content_likes").insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      });

  if (error) console.error("[social] like toggle failed:", error.message);
  revalidatePath(targetType === "post" ? `/posts/${targetId}` : `/p/${targetId}`);
  revalidatePath("/watch");
  redirect(next);
}

export async function createCommentAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const targetId = readText(formData, "targetId");
  const next = backTo(formData, `/p/${targetId}#comments`);

  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const parsed = commentSchema.safeParse({
    targetType: readText(formData, "targetType"),
    targetId,
    parentId: readText(formData, "parentId"),
    body: readText(formData, "body"),
  });

  if (!parsed.success) {
    redirect(`${next}${next.includes("?") ? "&" : "?"}commentError=invalid#comments`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    author_id: user.id,
    parent_id: parsed.data.parentId ?? null,
    body: parsed.data.body,
  });

  if (error) {
    const rateLimited = error.message.toLowerCase().includes("too quickly");
    console.error("[social] comment failed:", error.message);
    redirect(
      `${next}${next.includes("?") ? "&" : "?"}commentError=${rateLimited ? "rate" : "failed"}#comments`,
    );
  }

  revalidatePath(
    parsed.data.targetType === "post"
      ? `/posts/${parsed.data.targetId}`
      : `/p/${parsed.data.targetId}`,
  );
  revalidatePath("/watch");
  redirect(`${next.split("#")[0]}#comments`);
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const commentId = readText(formData, "commentId");
  const targetId = readText(formData, "targetId");
  const targetType = readText(formData, "targetType") === "post" ? "post" : "property";
  const next = backTo(
    formData,
    targetType === "post" ? `/posts/${targetId}#comments` : `/p/${targetId}#comments`,
  );

  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!isUuid(commentId)) redirect(next);

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", commentId)
    .is("deleted_at", null)
    .select("id");

  if (error) console.error("[social] delete comment failed:", error.message);
  revalidatePath(targetType === "post" ? `/posts/${targetId}` : `/p/${targetId}`);
  redirect(next);
}

async function setFollow(formData: FormData, follow: boolean): Promise<void> {
  const user = await getCurrentUser();
  const targetId = readText(formData, "targetId");
  const next = backTo(formData, "/explore");

  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!isUuid(targetId) || targetId === user.id) redirect(next);

  const supabase = await createClient();
  const { error } = follow
    ? await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId })
    : await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);

  if (error && error.code !== "23505") {
    console.error("[social] follow change failed:", error.message);
  }
  revalidatePath(next);
  redirect(next);
}

export async function followUserAction(formData: FormData): Promise<void> {
  await setFollow(formData, true);
}

export async function unfollowUserAction(formData: FormData): Promise<void> {
  await setFollow(formData, false);
}

export async function blockUserAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const targetId = readText(formData, "targetId");
  if (!user) redirect("/sign-in");

  if (isUuid(targetId) && targetId !== user.id) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: user.id, blocked_id: targetId });
    if (error && error.code !== "23505") {
      console.error("[social] block failed:", error.message);
    }
  }

  revalidatePath("/explore");
  redirect("/explore?blocked=1");
}

export async function unblockUserAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const targetId = readText(formData, "targetId");
  const next = backTo(formData, "/settings/blocked");
  if (!user) redirect("/sign-in");

  if (isUuid(targetId)) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", targetId);
    if (error) console.error("[social] unblock failed:", error.message);
  }

  revalidatePath(next);
  redirect(next);
}

export async function createReportAction(
  _previousState: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Sign in again to send a report." };
  }

  const parsed = reportSchema.safeParse({
    targetType: readText(formData, "targetType"),
    targetId: readText(formData, "targetId"),
    reason: readText(formData, "reason"),
    details: readText(formData, "details"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: Object.values(getFieldErrors(parsed.error))[0] ?? "Choose a reason first.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });

  if (error) {
    console.error("[social] report failed:", error.message);
    return { status: "error", message: "We couldn't send that report. Try again." };
  }

  return {
    status: "success",
    message: "Report received. Only you and the moderation team can see it.",
  };
}

export async function saveFeedPreferencesAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/feed");

  const neighborhoods = Array.from(
    new Set(
      readText(formData, "neighborhoods")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);

  const propertyTypes = formData
    .getAll("propertyTypes")
    .filter((value): value is string => typeof value === "string")
    .slice(0, 10);

  const parsed = feedPreferencesSchema.safeParse({ neighborhoods, propertyTypes });
  if (!parsed.success) redirect("/feed?preferencesError=1");

  const supabase = await createClient();
  const { error } = await supabase.from("feed_preferences").upsert({
    user_id: user.id,
    neighborhoods: parsed.data.neighborhoods,
    property_types: parsed.data.propertyTypes,
  });

  if (error) {
    console.error("[social] feed preferences failed:", error.message);
    redirect("/feed?preferencesError=1");
  }

  revalidatePath("/feed");
  redirect("/feed?saved=1");
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/notifications");

  const id = Number(readText(formData, "notificationId"));
  if (!Number.isInteger(id) || id <= 0) redirect("/notifications");

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/notifications");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) console.error("[social] mark all read failed:", error.message);
  revalidatePath("/notifications");
  redirect("/notifications");
}
