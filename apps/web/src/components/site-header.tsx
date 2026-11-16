import { getDisplayName } from "@hauscrawl/core";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { Logo } from "@/components/brand/logo";
import { SearchForm } from "@/components/search-form";
import { NotificationBell } from "@/components/social/notification-bell";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { getProfileById } from "@/lib/properties";
import { getUnreadNotificationCount } from "@/lib/social";
import { avatarPublicUrl } from "@/lib/storage";

export async function SiteHeader() {
  const user = await getCurrentUser();

  // The profile supplies the handle and avatar for the account menu; a missing
  // row is treated as "no profile yet" rather than blocking the header.
  const [profile, unreadCount] = await Promise.all([
    user ? getProfileById(user.id) : Promise.resolve(null),
    user ? getUnreadNotificationCount(user.id) : Promise.resolve(0),
  ]);
  const name = profile
    ? getDisplayName(profile)
    : (user?.email?.split("@")[0] ?? "Your account");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <Container className="flex h-16 items-center gap-4 sm:h-20">
        <div className="flex shrink-0 items-center gap-6">
          <Link href="/" className="rounded-lg" aria-label="HausCrawl — home">
            <Logo size="sm" />
          </Link>
          <Link
            href="/explore"
            className="hidden text-body-sm font-medium text-stone transition hover:text-ink md:inline"
          >
            Explore
          </Link>
          {user ? (
            <Link
              href="/feed"
              className="hidden text-body-sm font-medium text-stone transition hover:text-ink md:inline"
            >
              Feed
            </Link>
          ) : null}
          <Link
            href="/watch"
            className="hidden text-body-sm font-medium text-stone transition hover:text-ink md:inline"
          >
            Watch
          </Link>
        </div>

        <div className="hidden flex-1 justify-center px-6 md:flex">
          <SearchForm className="w-full max-w-sm" />
        </div>

        <nav className="ml-auto flex items-center gap-2" aria-label="Account">
          <Link
            href="/explore"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist md:hidden"
          >
            <span className="sr-only">Search homes</span>
            <SearchIcon />
          </Link>

          {user ? (
            <>
              <NotificationBell initialCount={unreadCount} />
              <ButtonLink href="/create" size="sm" className="max-sm:hidden">
                <PlusIcon size={16} />
                Create
              </ButtonLink>
              <AccountMenu
                name={name}
                username={profile?.username ?? null}
                avatarUrl={avatarPublicUrl(profile?.avatarUrl)}
              />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="inline-flex h-10 items-center rounded-full px-3 text-body-sm font-medium whitespace-nowrap text-stone transition hover:text-ink max-[380px]:hidden sm:px-4"
              >
                Sign in
              </Link>
              <ButtonLink href="/sign-up" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </nav>
      </Container>
    </header>
  );
}
