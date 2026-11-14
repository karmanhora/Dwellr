import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link href="/" className="rounded-lg" aria-label="dwellr — home">
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <Link
              href="/me"
              className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Your profile
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-stone transition hover:text-ink sm:px-4"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper transition hover:bg-ink/90"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
