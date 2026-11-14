"use client";

import { useState } from "react";

import { deletePropertyAction } from "@/app/p/[id]/actions";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

export function DeletePropertyButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <TrashIcon size={16} />
        Delete
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this home?"
        description="The post, its facts, and its photos will be removed. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <form action={deletePropertyAction}>
              <input type="hidden" name="propertyId" value={propertyId} />
              <Button type="submit" variant="danger" size="sm">
                Delete permanently
              </Button>
            </form>
          </>
        }
      />
    </>
  );
}
