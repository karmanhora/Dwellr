import {
  canContribute,
  collectionActivityLabel,
  collectionRoleLabel,
  collectionVisibilityLabel,
  formatCollectionCount,
  formatMemberSince,
  getDisplayName,
  summarizeCollectionComparison,
  type CollectionEvaluation,
} from "@dwellr/core";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createInviteLinkAction,
  inviteByUsernameAction,
  leaveCollectionAction,
  removeEvaluationAction,
  removeMemberAction,
  revokeInviteAction,
  saveEvaluationAction,
  changeMemberRoleAction,
} from "@/app/c/[slug]/actions";
import {
  removeFromCollectionAction,
  setCollectionVisibilityAction,
} from "@/app/saved/actions";
import { DeleteCollectionButton } from "@/components/collections/delete-collection-button";
import { PropertyCard } from "@/components/property/property-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ArrowLeftIcon, StarIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";
import { getCollectionBySlug } from "@/lib/collections";
import { avatarPublicUrl } from "@/lib/storage";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCollectionBySlug(slug);

  if (result.status !== "ok") return { title: "Collection not found" };

  return {
    title: result.collection.name,
    description:
      result.collection.description ??
      `A collection of homes${result.owner ? ` by ${getDisplayName(result.owner)}` : ""} on HausCrawl.`,
    robots: result.collection.isPublic ? undefined : { index: false, follow: false },
  };
}

function readParam(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const value = Array.isArray(query[key]) ? query[key][0] : query[key];
  return value ?? null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-ink" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon key={value} size={13} filled={value <= rating} />
      ))}
    </span>
  );
}

function EvaluationSummary({
  evaluation,
  name,
}: {
  evaluation: CollectionEvaluation;
  name: string;
}) {
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-medium">{name}</span>
        <Stars rating={evaluation.rating} />
      </div>
      {evaluation.note ? (
        <p className="mt-1 text-body-sm leading-relaxed text-ink/80">{evaluation.note}</p>
      ) : null}
      {evaluation.pros.length > 0 || evaluation.cons.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {evaluation.pros.map((tag) => (
            <span key={`pro-${tag}`} className="rounded-full bg-moss-soft px-2 py-0.5 text-[10px] font-medium text-moss">
              + {tag}
            </span>
          ))}
          {evaluation.cons.map((tag) => (
            <span key={`con-${tag}`} className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-stone">
              − {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const [result, query] = await Promise.all([
    getCollectionBySlug(slug, user?.id ?? null),
    searchParams,
  ]);

  if (result.status === "missing") notFound();

  if (result.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="This collection didn't load"
          description="We couldn't read this collection. Try again in a moment."
          action={
            <ButtonLink href="/saved" variant="secondary" size="sm">
              Back to saved
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const {
    collection,
    owner,
    items,
    members,
    evaluations,
    activity,
    viewerRole,
    invites,
  } = result;
  const isOwner = viewerRole === "owner";
  const canWrite = canContribute(viewerRole);
  const isMember = Boolean(viewerRole);
  const memberIds = members.map((member) => member.userId);
  const comparison = summarizeCollectionComparison(
    items.map((item) => ({
      property: item.property,
      evaluations: evaluations.filter((evaluation) => evaluation.propertyId === item.propertyId),
    })),
    memberIds,
  );
  const comparisonByProperty = new Map(
    comparison.homes.map((home) => [home.property.id, home]),
  );
  const myRole = viewerRole;
  const header = await headers();
  const host = header.get("x-forwarded-host") ?? header.get("host") ?? "localhost:3000";
  const protocol = header.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const linkToken = readParam(query, "link");
  const inviteError = readParam(query, "inviteError");
  const activeInvites = invites.filter((invite) => invite.use_count < invite.max_uses);

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href={isMember ? "/saved" : "/explore"}
        className="inline-flex items-center gap-2 text-body-sm text-stone transition hover:text-ink"
      >
        <ArrowLeftIcon size={16} />
        {isMember ? "Saved homes" : "All homes"}
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={collection.isPublic ? "positive" : "quiet"}>
            {collectionVisibilityLabel(collection.isPublic)}
          </Badge>
          <span className="text-caption text-stone">
            {formatCollectionCount(collection.itemCount)} · {members.length}{" "}
            {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        <h1 className="mt-4 text-headline font-medium tracking-[-0.03em]">{collection.name}</h1>

        {collection.description ? (
          <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
            {collection.description}
          </p>
        ) : null}

        {owner ? (
          <Link
            href={`/u/${owner.username}`}
            className="mt-6 inline-flex items-center gap-3 rounded-lg transition hover:opacity-80"
          >
            <Avatar
              name={getDisplayName(owner)}
              src={avatarPublicUrl(owner.avatarUrl)}
              size="sm"
            />
            <span>
              <span className="block text-body-sm font-medium text-ink">
                {getDisplayName(owner)}
              </span>
              <span className="block text-caption text-stone">
                @{owner.username} · {formatMemberSince(owner.createdAt)}
              </span>
            </span>
          </Link>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {items.length >= 2 ? (
            <ButtonLink
              href={`/c/${collection.shareSlug}/compare`}
              variant="secondary"
              size="sm"
            >
              Compare all {items.length} homes
            </ButtonLink>
          ) : null}
          {isOwner ? (
            <>
              <form action={setCollectionVisibilityAction}>
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="slug" value={collection.shareSlug} />
                <input type="hidden" name="isPublic" value={String(!collection.isPublic)} />
                <Button type="submit" variant="secondary" size="sm">
                  {collection.isPublic ? "Make private" : "Publish collection"}
                </Button>
              </form>
              <DeleteCollectionButton collectionId={collection.id} />
            </>
          ) : null}
          {isMember && !isOwner ? (
            <form action={leaveCollectionAction}>
              <input type="hidden" name="collectionId" value={collection.id} />
              <input type="hidden" name="slug" value={collection.shareSlug} />
              <Button type="submit" variant="ghost" size="sm">
                Leave collection
              </Button>
            </form>
          ) : null}
        </div>

        {isOwner ? (
          <p className="mt-4 text-caption text-stone">
            {collection.isPublic
              ? `Anyone with /c/${collection.shareSlug} can view this collection. Only members can contribute.`
              : "Only members can see this collection. Publish it to share a read-only link."}
          </p>
        ) : null}
      </header>

      {["added", "updated", "joined", "evaluated"].some((key) => readParam(query, key) === "1") ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          {readParam(query, "evaluated") === "1"
            ? "Your evaluation is saved. Everyone in the collection can see it."
            : readParam(query, "joined") === "1"
              ? "You joined this collection."
              : "Collection updated."}
        </p>
      ) : null}

      {readParam(query, "invited") === "1" ? (
        <p role="status" className="mt-6 rounded-card bg-moss-soft px-4 py-3 text-body-sm text-moss">
          Invite sent. It appears in their notifications.
        </p>
      ) : null}

      {inviteError ? (
        <p role="alert" className="mt-6 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          {inviteError}
        </p>
      ) : null}

      {readParam(query, "evaluationError") === "1" ? (
        <p role="alert" className="mt-6 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          Choose a rating from 1 to 5. Notes are 500 characters, and each list holds up to six
          tags.
        </p>
      ) : null}

      {readParam(query, "itemError") === "1" ? (
        <p role="alert" className="mt-6 rounded-card bg-danger-soft px-4 py-3 text-body-sm text-danger">
          The collection was created, but the home could not be added. Add it again from the home
          page.
        </p>
      ) : null}

      {linkToken ? (
        <section className="mt-6 rounded-card border border-line bg-mist/60 p-4">
          <h2 className="text-body-sm font-medium">Shareable invite link</h2>
          <p className="mt-1 text-caption text-stone">
            Anyone with this link can join until it expires or is revoked. It is shown once.
          </p>
          <code className="mt-3 block overflow-x-auto rounded-control bg-paper px-3 py-2 text-body-sm text-ink">
            {origin}/invite/{linkToken}
          </code>
          <p className="mt-2 text-caption text-stone">
            This link is multi-use and expiring. Revoke it from Pending invites when the group is
            set.
          </p>
        </section>
      ) : null}

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          {items.length === 0 ? (
            <EmptyState
              title="This collection is empty"
              description={
                canWrite
                  ? "Open a home and choose “Add to collection” to put it here."
                  : "No homes have been added yet."
              }
              action={
                canWrite ? (
                  <ButtonLink href="/explore" size="sm">
                    Explore homes
                  </ButtonLink>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-12">
              {items.map((item, index) => {
                const homeEvaluations = evaluations.filter(
                  (evaluation) => evaluation.propertyId === item.propertyId,
                );
                const mine = homeEvaluations.find((evaluation) => evaluation.userId === user?.id);
                const summary = comparisonByProperty.get(item.propertyId);
                const memberName = (memberId: string) =>
                  members.find((member) => member.userId === memberId)?.displayName ?? "Member";

                return (
                  <li key={item.propertyId}>
                    <PropertyCard property={item.property} priority={index < 2} />

                    {item.note ? (
                      <p className="mt-3 border-l-2 border-line pl-3 text-body-sm leading-relaxed text-stone">
                        {item.note}
                      </p>
                    ) : null}

                    <section
                      aria-label={`Evaluations for ${item.property.title}`}
                      className="mt-5 rounded-card border border-line p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-body font-medium">Everyone&rsquo;s take</h2>
                        <div className="flex flex-wrap items-center gap-2">
                          {summary?.everyoneLikes ? (
                            <Badge tone="positive">Everyone likes</Badge>
                          ) : summary?.disagreement ? (
                            <Badge tone="quiet">Split opinion</Badge>
                          ) : null}
                          {homeEvaluations.length > 0 ? (
                            <span className="text-caption text-stone">
                              {homeEvaluations.length} of {members.length} rated
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {homeEvaluations.length === 0 ? (
                        <p className="mt-2 text-body-sm text-stone">
                          No ratings yet. {canWrite ? "Start with yours below." : ""}
                        </p>
                      ) : (
                        <div className="mt-3">
                          {homeEvaluations.map((evaluation) => (
                            <EvaluationSummary
                              key={evaluation.userId}
                              evaluation={evaluation}
                              name={memberName(evaluation.userId)}
                            />
                          ))}
                        </div>
                      )}

                      {canWrite ? (
                        <form action={saveEvaluationAction} className="mt-5 border-t border-line pt-5">
                          <input type="hidden" name="collectionId" value={collection.id} />
                          <input type="hidden" name="propertyId" value={item.propertyId} />
                          <input type="hidden" name="slug" value={collection.shareSlug} />
                          <p className="text-body-sm font-medium">
                            {mine ? "Update your evaluation" : "Rate this home"}
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                            <div>
                              <label
                                htmlFor={`rating-${item.propertyId}`}
                                className="text-caption text-stone"
                              >
                                Rating
                              </label>
                              <Select
                                id={`rating-${item.propertyId}`}
                                name="rating"
                                required
                                defaultValue={mine?.rating ?? "4"}
                                className="mt-1.5"
                              >
                                {[5, 4, 3, 2, 1].map((rating) => (
                                  <option key={rating} value={rating}>
                                    {rating} / 5
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <label
                                htmlFor={`pros-${item.propertyId}`}
                                className="text-caption text-stone"
                              >
                                Pros <span className="text-stone-soft">(comma separated)</span>
                              </label>
                              <input
                                id={`pros-${item.propertyId}`}
                                name="pros"
                                maxLength={240}
                                defaultValue={mine?.pros.join(", ") ?? ""}
                                placeholder="light, garden, quiet street"
                                className="mt-1.5 h-12 w-full rounded-control border border-line bg-paper px-3.5 text-body outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label
                              htmlFor={`cons-${item.propertyId}`}
                              className="text-caption text-stone"
                            >
                              Cons <span className="text-stone-soft">(comma separated)</span>
                            </label>
                            <input
                              id={`cons-${item.propertyId}`}
                              name="cons"
                              maxLength={240}
                              defaultValue={mine?.cons.join(", ") ?? ""}
                              placeholder="street noise, small kitchen"
                              className="mt-1.5 h-12 w-full rounded-control border border-line bg-paper px-3.5 text-body outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                            />
                          </div>
                          <div className="mt-3">
                            <label
                              htmlFor={`note-${item.propertyId}`}
                              className="text-caption text-stone"
                            >
                              Note
                            </label>
                            <Textarea
                              id={`note-${item.propertyId}`}
                              name="note"
                              maxLength={500}
                              rows={2}
                              defaultValue={mine?.note ?? ""}
                              placeholder="What did you notice that the photos don't show?"
                              className="mt-1.5 min-h-20"
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button type="submit" size="sm">
                              {mine ? "Save evaluation" : "Add evaluation"}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-4 text-caption text-stone">
                          Viewers can read every evaluation but cannot rate or add homes.
                        </p>
                      )}

                      {mine ? (
                        <form action={removeEvaluationAction} className="mt-2">
                          <input type="hidden" name="collectionId" value={collection.id} />
                          <input type="hidden" name="propertyId" value={item.propertyId} />
                          <input type="hidden" name="slug" value={collection.shareSlug} />
                          <Button type="submit" variant="ghost" size="sm">
                            Remove my evaluation
                          </Button>
                        </form>
                      ) : null}
                    </section>

                    {canWrite ? (
                      <form action={removeFromCollectionAction} className="mt-3">
                        <input type="hidden" name="collectionId" value={collection.id} />
                        <input type="hidden" name="propertyId" value={item.propertyId} />
                        <input type="hidden" name="slug" value={collection.shareSlug} />
                        <Button type="submit" variant="ghost" size="sm">
                          Remove from collection
                        </Button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="members-heading" className="rounded-card border border-line p-4">
            <h2 id="members-heading" className="text-title font-medium">
              Members
            </h2>
            <p className="mt-1 text-caption text-stone">
              {myRole ? `You are ${collectionRoleLabel(myRole).toLowerCase()}.` : "Invite-only."}
            </p>

            <ul className="mt-4 divide-y divide-line">
              {members.map((member) => (
                <li key={member.userId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.displayName}
                      src={avatarPublicUrl(member.avatarUrl)}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${member.username}`}
                        className="block truncate text-body-sm font-medium hover:underline"
                      >
                        {member.displayName}
                      </Link>
                      <p className="truncate text-caption text-stone">@{member.username}</p>
                    </div>
                    <Badge tone={member.role === "owner" ? "neutral" : "quiet"}>
                      {collectionRoleLabel(member.role)}
                    </Badge>
                  </div>

                  {isOwner && member.role !== "owner" ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <form action={changeMemberRoleAction} className="flex items-end gap-2">
                        <input type="hidden" name="collectionId" value={collection.id} />
                        <input type="hidden" name="memberId" value={member.userId} />
                        <input type="hidden" name="slug" value={collection.shareSlug} />
                        <label htmlFor={`role-${member.userId}`} className="sr-only">
                          Role for {member.displayName}
                        </label>
                        <Select
                          id={`role-${member.userId}`}
                          name="role"
                          defaultValue={member.role}
                          className="h-9 w-28 text-body-sm"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </Select>
                        <Button type="submit" variant="secondary" size="sm">
                          Save
                        </Button>
                      </form>
                      <form action={removeMemberAction}>
                        <input type="hidden" name="collectionId" value={collection.id} />
                        <input type="hidden" name="memberId" value={member.userId} />
                        <input type="hidden" name="slug" value={collection.shareSlug} />
                        <Button type="submit" variant="ghost" size="sm">
                          Remove
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {isOwner ? (
            <section aria-labelledby="invite-heading" className="rounded-card border border-line p-4">
              <h2 id="invite-heading" className="text-title font-medium">
                Invite someone
              </h2>

              <form action={inviteByUsernameAction} className="mt-4 space-y-3">
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="slug" value={collection.shareSlug} />
                <div>
                  <label htmlFor="invite-username" className="text-body-sm font-medium">
                    Username
                  </label>
                  <input
                    id="invite-username"
                    name="username"
                    required
                    placeholder="mina"
                    className="mt-1.5 h-10 w-full rounded-control border border-line bg-paper px-3 text-body-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label htmlFor="invite-role" className="text-body-sm font-medium">
                    Role
                  </label>
                  <Select id="invite-role" name="role" defaultValue="viewer" className="mt-1.5 h-10">
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="invite-days" className="text-body-sm font-medium">
                    Expires in
                  </label>
                  <Select id="invite-days" name="expiresInDays" defaultValue="7" className="mt-1.5 h-10">
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </Select>
                </div>
                <Button type="submit" size="sm">
                  Send invite
                </Button>
              </form>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="text-body-sm font-medium">Or share a link</h3>
                <p className="mt-1 text-caption text-stone">
                  A revocable, expiring link for several people.
                </p>
                <form action={createInviteLinkAction} className="mt-3 space-y-3">
                  <input type="hidden" name="collectionId" value={collection.id} />
                  <input type="hidden" name="slug" value={collection.shareSlug} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="link-role" className="text-caption text-stone">
                        Role
                      </label>
                      <Select id="link-role" name="role" defaultValue="viewer" className="mt-1 h-10">
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="link-uses" className="text-caption text-stone">
                        Uses
                      </label>
                      <Select id="link-uses" name="maxUses" defaultValue="5" className="mt-1 h-10">
                        <option value="1">1</option>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="link-days" className="text-caption text-stone">
                      Expires in
                    </label>
                    <Select id="link-days" name="expiresInDays" defaultValue="7" className="mt-1 h-10">
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </Select>
                  </div>
                  <Button type="submit" variant="secondary" size="sm">
                    Create invite link
                  </Button>
                </form>
              </div>

              {activeInvites.length > 0 ? (
                <div className="mt-6 border-t border-line pt-5">
                  <h3 className="text-body-sm font-medium">Pending invites</h3>
                  <ul className="mt-2 space-y-2">
                    {activeInvites.map((invite) => (
                      <li key={invite.id} className="flex items-center justify-between gap-2 text-caption text-stone">
                        <span>
                          {invite.role} · {invite.use_count}/{invite.max_uses} used · expires{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(invite.expires_at))}
                        </span>
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <input type="hidden" name="slug" value={collection.shareSlug} />
                          <Button type="submit" variant="ghost" size="sm">
                            Revoke
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="activity-heading" className="rounded-card border border-line p-4">
            <h2 id="activity-heading" className="text-title font-medium">
              Activity
            </h2>
            {activity.length === 0 ? (
              <p className="mt-2 text-body-sm text-stone">Nothing has happened yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <p className="text-body-sm leading-relaxed text-ink">
                      {entry.action === "member_joined" || entry.action === "member_left" ? (
                        <>
                          <span className="font-medium">{entry.targetName ?? "Someone"}</span>{" "}
                          {entry.action === "member_joined" ? "joined" : "left"}
                        </>
                      ) : entry.action === "member_removed" ? (
                        <>
                          <span className="font-medium">{entry.actorName}</span> removed{" "}
                          <span className="font-medium">{entry.targetName ?? "a member"}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{entry.actorName}</span>{" "}
                          {collectionActivityLabel(entry).toLowerCase()}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-caption text-stone">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(entry.createdAt))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </Container>
  );
}
