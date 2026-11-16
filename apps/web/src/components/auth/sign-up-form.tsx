"use client";

import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, USERNAME_MAX_LENGTH } from "@hauscrawl/core";
import { useActionState } from "react";

import { signUpAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialAuthState } from "@/lib/auth-form";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialAuthState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
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
        label="Display name"
        name="displayName"
        hint="Optional"
        autoComplete="name"
        placeholder="Karman Hora"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        defaultValue={state.values?.displayName}
        error={errors.displayName}
      />

      <Field
        label="Username"
        name="username"
        required
        autoComplete="username"
        placeholder="karman"
        spellCheck={false}
        maxLength={USERNAME_MAX_LENGTH}
        defaultValue={state.values?.username}
        error={errors.username}
      />

      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state.values?.email}
        error={errors.email}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint={`${PASSWORD_MIN_LENGTH}+ chars · letters & numbers`}
        minLength={PASSWORD_MIN_LENGTH}
        error={errors.password}
      />

      <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>
    </form>
  );
}
