"use server";

import { getFieldErrors, signInSchema, signUpSchema } from "@dwellr/core";
import { redirect } from "next/navigation";

import { safeRedirectPath, type AuthFormState } from "@/lib/auth-form";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Maps Supabase auth errors to copy that is useful without leaking internals
 * (no raw database errors, no account enumeration beyond what auth already does).
 */
function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "That email and password don't match. Try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email address first, then sign in.";
  }
  if (normalized.includes("already registered")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }

  return "Something went wrong on our end. Please try again.";
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    email: readText(formData, "email"),
    username: readText(formData, "username"),
    displayName: readText(formData, "displayName"),
  };

  const parsed = signUpSchema.safeParse({
    email: values.email,
    password: readText(formData, "password"),
    username: values.username,
    displayName: values.displayName,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: getFieldErrors(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName ?? null,
      },
    },
  });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message), values };
  }

  // With email confirmation enabled Supabase returns no session. The dev
  // project has it disabled, so this is only a graceful fallback.
  if (!data.session) {
    return {
      status: "notice",
      message: "Check your inbox to confirm your email, then sign in.",
      values,
    };
  }

  redirect("/me");
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readText(formData, "email");
  const parsed = signInSchema.safeParse({
    email,
    password: readText(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: getFieldErrors(parsed.error),
      values: { email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message), values: { email } };
  }

  redirect(safeRedirectPath(readText(formData, "next")));
}
