"use client";

import { deletePostAction } from "@/app/posts/actions";
import { Button } from "@/components/ui/button";

export function DeletePostButton({
  postId,
  redirectTo,
}: {
  postId: string;
  redirectTo: string;
}) {
  return (
    <form
      action={deletePostAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this post? Photos and video are removed from storage.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="next" value={redirectTo} />
      <Button type="submit" variant="ghost" size="sm">
        Delete post
      </Button>
    </form>
  );
}
