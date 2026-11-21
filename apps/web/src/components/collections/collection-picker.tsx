"use client";

import {
  collectionVisibilityLabel,
  formatCollectionCount,
  type Collection,
} from "@hauscrawl/core";
import posthog from "posthog-js";
import { useActionState, useState } from "react";

import { addToCollectionAction, createCollectionAction } from "@/app/saved/actions";
import { Button } from "@/components/ui/button";
import { FolderPlusIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { initialCollectionFormState } from "@/lib/collection-form";

export function CollectionPicker({
  propertyId,
  collections,
}: {
  propertyId: string;
  collections: Collection[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createCollectionAction,
    initialCollectionFormState,
  );

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <FolderPlusIcon size={16} />
        Add to collection
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add to a collection"
        description="Saves are private. A collection stays private until you publish it."
      >
        {collections.length > 0 ? (
          <ul className="divide-y divide-line">
            {collections.map((collection) => (
              <li key={collection.id} className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium text-ink">
                    {collection.name}
                  </span>
                  <span className="block text-caption text-stone">
                    {formatCollectionCount(collection.itemCount)} ·{" "}
                    {collectionVisibilityLabel(collection.isPublic)}
                  </span>
                </span>
                <form
                  action={addToCollectionAction}
                  onSubmit={() => posthog.capture("property_added_to_collection")}
                >
                  <input type="hidden" name="collectionId" value={collection.id} />
                  <input type="hidden" name="slug" value={collection.shareSlug} />
                  <input type="hidden" name="propertyId" value={propertyId} />
                  <Button type="submit" variant="secondary" size="sm">
                    Add
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-stone">
            You don&rsquo;t have any collections yet. Create one below.
          </p>
        )}

        <div className="mt-6 border-t border-line pt-6">
          <h3 className="text-body-sm font-medium">New collection</h3>
          <form action={formAction} className="mt-3 space-y-3">
            <input type="hidden" name="propertyId" value={propertyId} />
            <div>
              <label htmlFor="new-collection-name" className="text-body-sm font-medium">
                Name
              </label>
              <Input
                id="new-collection-name"
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
              <label htmlFor="new-collection-description" className="text-body-sm font-medium">
                Description <span className="font-normal text-stone">(optional)</span>
              </label>
              <Textarea
                id="new-collection-description"
                name="description"
                maxLength={500}
                rows={2}
                defaultValue={state.values?.description}
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
              Create and add
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
