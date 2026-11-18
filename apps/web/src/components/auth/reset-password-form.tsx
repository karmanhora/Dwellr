"use client";

import { PASSWORD_MIN_LENGTH } from "@hauscrawl/core";
import { useActionState } from "react";

import { updatePasswordAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialAuthState } from "@/lib/auth-form";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialAuthState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <Field
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint={`${PASSWORD_MIN_LENGTH}+ chars · letters & numbers`}
        minLength={PASSWORD_MIN_LENGTH}
        error={errors.password}
      />

      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <SubmitButton pendingLabel="Saving password…">Save password</SubmitButton>
    </form>
  );
}
