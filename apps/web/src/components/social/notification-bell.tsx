"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BellIcon } from "@/components/ui/icons";

/**
 * Notifications are low-frequency, so a 60-second poll plus a refetch on focus
 * is enough. Realtime would add a websocket subscription and reconnect logic
 * without changing what the user sees.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/notifications/count", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { count?: number };
        if (!cancelled && typeof body.count === "number") setCount(body.count);
      } catch {
        // A failed poll is not an error state; the last known count stays.
      }
    }

    const interval = window.setInterval(refresh, 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
    >
      <BellIcon />
      {count > 0 ? (
        <span className="absolute top-1.5 right-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-paper">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
