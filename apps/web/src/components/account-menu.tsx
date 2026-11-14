"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/me/actions";
import { Avatar } from "@/components/ui/avatar";
import { ChevronDownIcon } from "@/components/ui/icons";

type AccountMenuProps = {
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

const itemClass =
  "block w-full rounded-lg px-3 py-2 text-left text-body-sm text-ink transition hover:bg-mist";

export function AccountMenu({ name, username, avatarUrl }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full p-0.5 transition hover:bg-mist"
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
        <span className="sr-only">Account menu</span>
        <ChevronDownIcon size={16} className="text-stone" />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 z-50 mt-2 w-60 rounded-card border border-line bg-paper p-1.5 shadow-lift"
        >
          <div className="px-3 py-2">
            <p className="truncate text-body-sm font-medium text-ink">{name}</p>
            {username ? <p className="truncate text-caption text-stone">@{username}</p> : null}
          </div>

          <div className="my-1 h-px bg-line" role="none" />

          {username ? (
            <Link href={`/u/${username}`} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              Your profile
            </Link>
          ) : null}
          <Link href="/saved" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Saved homes
          </Link>
          <Link href="/create" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Post a home
          </Link>
          <Link
            href="/settings/profile"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            Profile settings
          </Link>

          <div className="my-1 h-px bg-line" role="none" />

          <form action={signOutAction} role="none">
            <button type="submit" role="menuitem" className={itemClass}>
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
