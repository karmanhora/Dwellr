"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CompassIcon, HomeIcon, PlusIcon, UserIcon } from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

/** Thumb-reachable primary navigation below the md breakpoint. */
export function MobileNav({ username }: { username: string | null }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: "/",
      label: "Home",
      icon: <HomeIcon />,
      match: (path) => path === "/",
    },
    {
      href: "/explore",
      label: "Explore",
      icon: <CompassIcon />,
      match: (path) => path.startsWith("/explore") || path.startsWith("/p/"),
    },
    {
      href: "/create",
      label: "Post",
      icon: <PlusIcon />,
      match: (path) => path.startsWith("/create"),
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
      <ul className="grid grid-cols-4">
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
