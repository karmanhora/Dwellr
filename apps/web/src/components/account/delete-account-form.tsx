"use client";

import { useActionState, useState } from "react";

import { deleteAccountAction } from "@/app/me/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialDeleteAccountState } from "@/lib/account-form";

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialDeleteAccountState,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <p
          role="alert"
          className="rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="delete-account-confirmation"
          className="text-body-sm font-medium text-ink"
        >
          Type <span className="font-semibold">{email}</span> to confirm
        </label>
        <Input
          id="delete-account-confirmation"
          name="confirmation"
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={email}
          required
          className="mt-2"
          aria-describedby="delete-account-hint"
        />
        <p id="delete-account-hint" className="mt-2 text-caption text-stone">
          This must match the email on your account exactly.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="danger" size="sm" loading={pending}>
          Delete permanently
        </Button>
      </div>
    </form>
  );
}
