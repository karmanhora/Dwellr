"use server";

import {
  emailSchema,
  getFieldErrors,
  passwordSchema,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@hauscrawl/core";
import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { AuthFormState } from "@/lib/auth-form";
import { absoluteUrl } from "@/lib/site";
import { createWaitlistAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const EXISTING_ACCOUNT_MESSAGE =
  "This email already has a HausCrawl account. If you joined the waitlist, set your password below; otherwise sign in.";

function isExistingAccountError(error: AuthError): boolean {
  return (
    error.code === "user_already_exists" ||
    error.code === "email_exists" ||
    /already (?:been )?registered|already exists/i.test(error.message)
  );
}

/**
 * Maps Supabase auth errors to copy that is useful without leaking internals
 * (no raw database errors, no account enumeration beyond what auth already does).
 */
function friendlyAuthError(error: AuthError): string {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "email_address_invalid" || message.includes("is invalid")) {
    return "That email address can't receive mail. Check it and try another one.";
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "That email and password don't match. Try again.";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirm your email address first, then sign in.";
  }
  if (isExistingAccountError(error)) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (code === "same_password" || message.includes("same password")) {
    return "Choose a password you have not used before.";
  }
  if (code === "over_email_send_rate_limit" || message.includes("email rate limit")) {
    return "Supabase is limiting confirmation emails right now. Wait a few minutes, or turn off email confirmation in your dev project.";
  }
  if (
    code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many")
  ) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("database error saving new user")) {
    return "We couldn't finish creating your profile. Please try again.";
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
    if (isExistingAccountError(error)) {
      return {
        status: "notice",
        message: EXISTING_ACCOUNT_MESSAGE,
        recoverAccount: true,
        values,
      };
    }

    return { status: "error", message: friendlyAuthError(error), values };
  }

  // Supabase may return an existing waitlist-created user without an error and
  // without a session. That account has no password, so send the person to the
  // recovery flow rather than telling them to check an inbox or redirecting
  // into a session they cannot return to later. A confirmed existing account
  // can also come back as an obfuscated user with no identities.
  if (
    data.user?.app_metadata?.waitlist === true ||
    (Array.isArray(data.user?.identities) && data.user.identities.length === 0)
  ) {
    return {
      status: "notice",
      message: EXISTING_ACCOUNT_MESSAGE,
      recoverAccount: true,
      values,
    };
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

export async function requestPasswordResetAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(readText(formData, "email"));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: absoluteUrl("/auth/confirm"),
  });

  if (error) {
    // Keep the response identical for unknown addresses, existing accounts and
    // provider rate limits. The email provider is the only place that leaks a
    // signal, and Supabase rate-limits it independently.
    console.error("[auth] password reset request failed:", error.code ?? "unknown");
  }

  return {
    status: "notice",
    message:
      "If an account exists for that email, a password reset link is on its way. Check your inbox.",
    values: { email: parsed.data },
  };
}

export async function updatePasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  const parsed = passwordSchema.safeParse(password);
  const fieldErrors: Record<string, string> = {};

  if (!parsed.success) {
    Object.assign(fieldErrors, getFieldErrors(parsed.error));
  }
  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  // A recovery link proves control of the email. Confirm an unconfirmed Auth
  // record before saving the password, so a mirrored waitlist user cannot end up
  // with a password but still no verified account.
  if (!user.email_confirmed_at) {
    const admin = createWaitlistAdminClient();
    if (!admin) {
      return {
        status: "error",
        message: "Account recovery is temporarily unavailable. Try again in a moment.",
      };
    }

    const { error: confirmError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (confirmError) {
      console.error("[auth] auth email confirmation failed:", confirmError.code);
      return {
        status: "error",
        message: "We couldn't verify this account. Try again in a moment.",
      };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { status: "error", message: friendlyAuthError(error) };
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
    return { status: "error", message: friendlyAuthError(error), values: { email } };
  }

  redirect(safeRedirectPath(readText(formData, "next")));
}
