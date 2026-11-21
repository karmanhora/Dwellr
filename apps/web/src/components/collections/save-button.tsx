"use client";

import posthog from "posthog-js";

import { toggleSaveAction } from "@/app/saved/actions";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "@/components/ui/icons";

/** A private bookmark, separate from any named collection. */
export function SaveButton({ propertyId, saved }: { propertyId: string; saved: boolean }) {
  return (
    <form
      action={toggleSaveAction}
      onSubmit={() =>
        posthog.capture("property_save_toggled", { action: saved ? "remove" : "save" })
      }
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="intent" value={saved ? "remove" : "save"} />
      <Button type="submit" variant={saved ? "secondary" : "primary"} size="sm" aria-pressed={saved}>
        <HeartIcon size={16} filled={saved} />
        {saved ? "Saved" : "Save"}
      </Button>
    </form>
  );
}
