import { authorName as displayAuthorName, type Comment } from "@dwellr/core";
import Link from "next/link";

import { createCommentAction, deleteCommentAction } from "@/app/social/actions";
import { ReportButton } from "@/components/social/report-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { avatarPublicUrl } from "@/lib/storage";

function CommentItem({
  comment,
  postId,
  viewerId,
}: {
  comment: Comment;
  postId: string;
  viewerId: string | null;
}) {
  const authorName = displayAuthorName(comment.author);
  const canDelete = Boolean(viewerId && viewerId === comment.author?.id);
  const next = `/posts/${postId}#comments`;

  return (
    <article id={`comment-${comment.id}`} className="rounded-card border border-line p-4">
      <div className="flex items-center gap-3">
        <Avatar
          name={authorName}
          src={avatarPublicUrl(comment.author?.avatar_url ?? null)}
          size="xs"
        />
        <div className="min-w-0">
          {comment.author ? (
            <Link
              href={`/u/${comment.author.username}`}
              className="text-body-sm font-medium hover:underline"
            >
              {authorName}
            </Link>
          ) : (
            <span className="text-body-sm font-medium">Former member</span>
          )}
          <p className="text-caption text-stone">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(comment.createdAt))}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-stone uppercase">
          Comment
        </span>
      </div>

      {comment.deleted ? (
        <p className="mt-3 text-body-sm text-stone italic">This comment was deleted.</p>
      ) : (
        <p className="mt-3 text-body-sm leading-relaxed whitespace-pre-line text-ink/85">
          {comment.body}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {!comment.deleted && comment.parentId === null && viewerId ? (
          <details className="w-full">
            <summary className="cursor-pointer text-caption font-medium text-stone hover:text-ink">
              Reply
            </summary>
            <form action={createCommentAction} className="mt-3">
              <input type="hidden" name="targetType" value="post" />
              <input type="hidden" name="targetId" value={postId} />
              <input type="hidden" name="parentId" value={comment.id} />
              <input type="hidden" name="next" value={next} />
              <label htmlFor={`post-reply-${comment.id}`} className="sr-only">
                Reply to {authorName}
              </label>
              <Textarea
                id={`post-reply-${comment.id}`}
                name="body"
                required
                maxLength={1000}
                rows={2}
                placeholder={`Reply to ${authorName}`}
                className="min-h-20"
              />
              <Button type="submit" size="sm" className="mt-2">
                Post reply
              </Button>
            </form>
          </details>
        ) : null}

        {viewerId ? (
          <ReportButton targetType="comment" targetId={comment.id} label="Report" />
        ) : null}

        {canDelete && !comment.deleted ? (
          <form action={deleteCommentAction}>
            <input type="hidden" name="commentId" value={comment.id} />
            <input type="hidden" name="targetType" value="post" />
            <input type="hidden" name="targetId" value={postId} />
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="ghost" size="sm">
              Delete
            </Button>
          </form>
        ) : null}
      </div>

      {comment.replies.length > 0 ? (
        <ol className="mt-4 space-y-4 border-l border-line pl-4">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentItem comment={reply} postId={postId} viewerId={viewerId} />
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

export function PostComments({
  postId,
  comments,
  viewerId,
  commentError,
}: {
  postId: string;
  comments: Comment[];
  viewerId: string | null;
  commentError?: string;
}) {
  return (
    <section id="comments" aria-labelledby="comments-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="comments-heading" className="text-title font-medium">
          Conversation
        </h2>
        <span className="text-caption text-stone">
          {comments.length} {comments.length === 1 ? "thread" : "threads"}
        </span>
      </div>
      <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-stone">
        Comments are written by people. They are not property facts and do not change any verified
        label.
      </p>

      {commentError ? (
        <p role="alert" className="mt-4 rounded-card bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {commentError === "rate"
            ? "You are commenting too quickly. Wait a minute and try again."
            : "That comment didn't send. Try again."}
        </p>
      ) : null}

      {comments.length === 0 ? (
        <p className="mt-5 rounded-card border border-dashed border-line-strong bg-mist/40 px-4 py-6 text-body-sm text-stone">
          No comments yet. Ask a question or share what you noticed.
        </p>
      ) : (
        <ol className="mt-6 space-y-5">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem comment={comment} postId={postId} viewerId={viewerId} />
            </li>
          ))}
        </ol>
      )}

      {viewerId ? (
        <form action={createCommentAction} className="mt-6 rounded-card border border-line p-4">
          <input type="hidden" name="targetType" value="post" />
          <input type="hidden" name="targetId" value={postId} />
          <input type="hidden" name="next" value={`/posts/${postId}#comments`} />
          <label htmlFor="post-comment-body" className="text-body-sm font-medium">
            Add a comment
          </label>
          <Textarea
            id="post-comment-body"
            name="body"
            required
            maxLength={1000}
            rows={3}
            className="mt-2"
            placeholder="What did you notice? Keep it useful and civil."
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-caption text-stone">Up to 1000 characters.</span>
            <Button type="submit" size="sm">
              Post comment
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-5 text-body-sm text-stone">
          <Link
            href={`/sign-in?next=/posts/${postId}`}
            className="text-ink underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
    </section>
  );
}
