"use client";

import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialAuthState } from "@/lib/auth-form";

export function ForgotPasswordForm({
  defaultEmail,
  linkError = false,
}: {
  defaultEmail?: string;
  linkError?: boolean;
}) {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialAuthState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {linkError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          That reset link is invalid or has expired. Enter your email to request a new one.
        </p>
      ) : null}

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            state.status === "error"
              ? "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-xl bg-mist px-4 py-3 text-sm text-ink"
          }
        >
          {state.message}
        </p>
      ) : null}

      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={defaultEmail ?? state.values?.email}
        error={errors.email}
      />

      <SubmitButton pendingLabel="Sending link…">Send reset link</SubmitButton>
    </form>
  );
}
