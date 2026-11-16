"use server";

import { redirect } from "next/navigation";

import { removeUserStorage } from "@/lib/account-deletion";
import type { DeleteAccountState } from "@/lib/account-form";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccountAction(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await getCurrentUser();

  if (!user?.email) {
    return { status: "error", message: "Your session expired. Sign in again." };
  }

  const confirmation = readText(formData, "confirmation").trim();
  if (confirmation.toLowerCase() !== user.email.toLowerCase()) {
    return {
      status: "error",
      message: "Type your account email exactly to confirm deletion.",
    };
  }

  const supabase = await createClient();

  // Files must go first: after the auth row is deleted the user's session can
  // no longer authorize Storage deletes. The helper re-lists every bucket and
  // refuses to continue if any object survives.
  try {
    await removeUserStorage(supabase, user.id);
  } catch (error) {
    console.error(
      "[account] storage cleanup failed:",
      error instanceof Error ? error.message : error,
    );
    return {
      status: "error",
      message:
        "We couldn't remove all of your uploaded files, so your account was not deleted. Try again or contact support.",
    };
  }

  const { error } = await supabase.rpc("delete_my_account");

  if (error) {
    console.error("[account] deletion failed:", error.message);
    return {
      status: "error",
      message:
        "Your uploaded files were removed, but we couldn't finish deleting your account. Try again or contact support.",
    };
  }

  // The auth row is gone; clear the now-invalid local session and return to
  // the public site. A sign-out error here must not hide a successful delete.
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/");
}
