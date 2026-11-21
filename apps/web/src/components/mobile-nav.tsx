"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, type ReactNode } from "react";

import { CompassIcon, HomeIcon, PlayIcon, PlusIcon, UserIcon } from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

/** Thumb-reachable primary navigation below the md breakpoint. */
export function MobileNav({
  username,
  userId,
  email,
}: {
  username: string | null;
  userId: string | null;
  email: string | null;
}) {
  const pathname = usePathname();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      if (previousUserId.current) {
        posthog.reset();
        previousUserId.current = null;
      }
      return;
    }

    if (previousUserId.current && previousUserId.current !== userId) {
      posthog.reset();
    }

    posthog.identify(userId, email ? { email } : undefined);
    previousUserId.current = userId;
  }, [email, userId]);

  const items: NavItem[] = [
    {
      href: username ? "/feed" : "/",
      label: username ? "Feed" : "Home",
      icon: <HomeIcon />,
      match: (path) => (username ? path.startsWith("/feed") : path === "/"),
    },
    {
      href: "/explore",
      label: "Explore",
      icon: <CompassIcon />,
      match: (path) => path.startsWith("/explore") || path.startsWith("/p/"),
    },
    {
      href: "/create",
      label: "Create",
      icon: <PlusIcon />,
      match: (path) => path.startsWith("/create"),
    },
    {
      href: "/watch",
      label: "Watch",
      icon: <PlayIcon />,
      match: (path) => path.startsWith("/watch"),
    },
    {
      href: username ? `/u/${username}` : "/sign-in",
      label: username ? "Profile" : "Sign in",
      icon: <UserIcon />,
      match: (path) =>
        username ? path === `/u/${username}` || path.startsWith("/settings") : path.startsWith("/sign-in"),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide transition ${
                  active ? "text-ink" : "text-stone hover:text-ink"
                }`}
              >
                <span className={active ? "text-ink" : "text-stone"}>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
