"use client";

import { useActionState } from "react";

import { createCollectionAction } from "@/app/saved/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialCollectionFormState } from "@/lib/collection-form";

export function CollectionCreateForm() {
  const [state, formAction, pending] = useActionState(
    createCollectionAction,
    initialCollectionFormState,
  );

  return (
    <form action={formAction} className="rounded-panel border border-line p-5">
      <h2 className="text-title font-medium">New collection</h2>
      <p className="mt-1 text-body-sm text-stone">
        Group the homes you&rsquo;re comparing. You can publish a collection when you&rsquo;re ready
        to share it.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="collection-name" className="text-body-sm font-medium">
            Name
          </label>
          <Input
            id="collection-name"
            name="name"
            required
            maxLength={60}
            defaultValue={state.values?.name}
            placeholder="Weekend tours"
            invalid={Boolean(state.fieldErrors?.name)}
            className="mt-1.5"
          />
          {state.fieldErrors?.name ? (
            <p className="mt-1.5 text-caption text-danger">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="collection-description" className="text-body-sm font-medium">
            Description <span className="font-normal text-stone">(optional)</span>
          </label>
          <Textarea
            id="collection-description"
            name="description"
            maxLength={500}
            rows={3}
            defaultValue={state.values?.description}
            placeholder="What are you looking for in these homes?"
            className="mt-1.5"
          />
        </div>

        <label className="flex items-center gap-2 text-body-sm text-ink">
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={state.values?.isPublic}
            className="h-4 w-4 rounded border-line text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
          Make this collection public
        </label>

        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-card bg-danger-soft px-3 py-2 text-body-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" size="sm" loading={pending}>
          Create collection
        </Button>
      </div>
    </form>
  );
}
