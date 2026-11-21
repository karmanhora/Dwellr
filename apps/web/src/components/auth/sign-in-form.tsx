"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useActionState } from "react";

import { signInAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialAuthState } from "@/lib/auth-form";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, initialAuthState);
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      onSubmit={() => posthog.capture("sign_in_submitted")}
      className="space-y-5"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.message ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
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
        defaultValue={state.values?.email}
        error={errors.email}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        error={errors.password}
      />

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>

      <p className="text-center text-sm text-stone">
        <Link
          href="/forgot-password"
          className="font-medium text-ink underline underline-offset-4"
        >
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
