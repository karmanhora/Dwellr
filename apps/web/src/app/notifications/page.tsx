import {
  notificationHref,
  notificationLabel,
  notificationTypeLabel,
} from "@hauscrawl/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  acceptDirectInviteAction,
  declineDirectInviteAction,
} from "@/app/c/[slug]/actions";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/social/actions";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getCurrentUser } from "@/lib/auth";
import { getPendingInvites } from "@/lib/collections";
import { getNotificationsWithStatus, getUnreadNotificationCount } from "@/lib/social";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const value = Array.isArray(query[key]) ? query[key][0] : query[key];
  return value ?? null;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/notifications");

  const [result, unread, pendingInvites, query] = await Promise.all([
    getNotificationsWithStatus(user.id),
    getUnreadNotificationCount(user.id),
    getPendingInvites(user.id),
    searchParams,
  ]);

  const declined = param(query, "declined") === "1";
  const inviteError = param(query, "inviteError") === "1";

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-stone uppercase">Your account</p>
          <h1 className="mt-3 text-headline font-medium tracking-[-0.03em]">Notifications</h1>
          <p className="mt-2 text-body-sm text-stone">
            Invites, replies, likes and new followers. Only you can read these.
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="sm">
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {declined ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Invite declined.
        </p>
      ) : null}

      {inviteError ? (
        <p role="alert" className="mt-6 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          That invite is no longer valid. It may have expired, been revoked, or already been used.
        </p>
      ) : null}

      {pendingInvites.length > 0 ? (
        <section aria-labelledby="invitations-heading" className="mt-8 rounded-card border border-line p-4">
          <h2 id="invitations-heading" className="text-title font-medium">
            Invitations
          </h2>
          <p className="mt-1 text-caption text-stone">
            Named invites waiting for you. Accepting adds the collection to your saved homes.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium">{invite.collectionName}</p>
                    <p className="text-caption text-stone">
                      Join as {invite.role} · expires{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(invite.expiresAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <form action={acceptDirectInviteAction}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <Button type="submit" size="sm">
                        Accept
                      </Button>
                    </form>
                    <form action={declineDirectInviteAction}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Decline
                      </Button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.failed ? (
        <div className="mt-8">
          <ErrorState
            title="Notifications didn't load"
            description="We couldn't reach the notification database. Try again."
            action={
              <ButtonLink href="/notifications" variant="secondary" size="sm">
                Try again
              </ButtonLink>
            }
          />
        </div>
      ) : result.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing here yet"
            description="When someone follows you, comments on your home, or invites you to a collection, it will show up here."
            action={
              <ButtonLink href="/explore" size="sm">
                Explore homes
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {result.items.map((notification) => {
            const href = notificationHref(notification);
            const isUnread = !notification.readAt;
            return (
              <li
                key={notification.id}
                className={`py-4 ${isUnread ? "bg-mist/30" : ""}`}
              >
                <div className="flex items-start gap-3 px-2">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      isUnread ? "bg-ink" : "bg-line-strong"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isUnread ? "neutral" : "quiet"}>
                        {notificationTypeLabel(notification.type)}
                      </Badge>
                      {isUnread ? <span className="sr-only">Unread</span> : null}
                    </div>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-ink">
                      {notificationLabel(notification)}
                    </p>
                    <p className="mt-0.5 text-caption text-stone">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(notification.createdAt))}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {href !== "/notifications" ? (
                        <Link
                          href={href}
                          className="inline-flex h-8 items-center rounded-full px-2 text-caption font-medium text-ink underline underline-offset-4"
                        >
                          Open
                        </Link>
                      ) : null}
                      {isUnread ? (
                        <form action={markNotificationReadAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Mark read
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Container>
  );
}
