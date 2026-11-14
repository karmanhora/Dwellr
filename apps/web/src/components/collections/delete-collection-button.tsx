"use client";

import { useState } from "react";

import { deleteCollectionAction } from "@/app/saved/actions";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

export function DeleteCollectionButton({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <TrashIcon size={16} />
        Delete
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this collection?"
        description="The collection is removed. The homes stay on dwellr and your saves are untouched."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <form action={deleteCollectionAction}>
              <input type="hidden" name="collectionId" value={collectionId} />
              <Button type="submit" variant="danger" size="sm">
                Delete collection
              </Button>
            </form>
          </>
        }
      />
    </>
  );
}
