import { formatMemberSince, getDisplayName, toProfile } from "@dwellr/core";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/me");

  // Server-side read of the caller's own profile. RLS allows public reads, but
  // we only ever render the signed-in user's row here.
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[me] profile lookup failed:", error.message);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[11px] font-medium tracking-[0.22em] text-stone uppercase">Your account</p>
      <h1 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-ink sm:text-4xl">
        Your profile
      </h1>

      {error ? (
        <section className="mt-8 rounded-[1.75rem] border border-red-200 bg-red-50/50 p-6 sm:p-8">
          <h2 className="text-lg font-medium text-ink">We couldn&rsquo;t load your profile</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone">
            Something went wrong reading your details. Your account is still signed in — try again,
            and if it keeps happening we&rsquo;ll need to look at the database.
          </p>
          <Link
            href="/me"
            className="mt-5 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Try again
          </Link>
        </section>
      ) : row ? (
        <ProfileCard
          name={getDisplayName(toProfile(row))}
          username={row.username}
          bio={row.bio}
          joinedAt={row.created_at}
        />
      ) : (
        <section className="mt-8 rounded-[1.75rem] border border-line p-6 sm:p-8">
          <h2 className="text-lg font-medium text-ink">Your profile isn&rsquo;t ready yet</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone">
            Your account was created but its public profile is missing. That should happen
            automatically at sign-up — sign out and back in, and if it still doesn&rsquo;t appear we
            need to check the database trigger.
          </p>
        </section>
      )}

      <div className="mt-10 border-t border-line pt-8">
        <form
          action={signOutAction}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-stone">
            Signed in as <span className="text-ink">{user.email}</span>
          </p>
          <div className="sm:w-40">
            <SubmitButton variant="quiet" pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

type ProfileCardProps = {
  name: string;
  username: string;
  bio: string | null;
  joinedAt: string;
};

function ProfileCard({ name, username, bio, joinedAt }: ProfileCardProps) {
  return (
    <article className="mt-8 rounded-[1.75rem] border border-line p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={name} />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium text-ink">{name}</h2>
          <p className="mt-0.5 text-sm text-stone">@{username}</p>
        </div>
        <span className="sm:ml-auto inline-flex h-7 shrink-0 items-center rounded-full bg-mist px-3 text-[10px] font-semibold tracking-[0.14em] text-ink uppercase">
          Public profile
        </span>
      </div>

      <dl className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-medium tracking-[0.16em] text-stone uppercase">Joined</dt>
          <dd className="mt-1.5 text-sm text-ink">{formatMemberSince(joinedAt)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-[0.16em] text-stone uppercase">
            Username
          </dt>
          <dd className="mt-1.5 text-sm text-ink">@{username}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-line pt-6">
        <p className="text-[11px] font-medium tracking-[0.16em] text-stone uppercase">Bio</p>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-stone">
          {bio ?? "No bio yet."}
        </p>
      </div>
    </article>
  );
}
