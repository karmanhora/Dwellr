import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <Logo size="sm" />
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/explore" className="text-body-sm text-stone transition hover:text-ink">
            Explore homes
          </Link>
          <Link href="/create" className="text-body-sm text-stone transition hover:text-ink">
            Post a home
          </Link>
        </nav>
        <p className="max-w-md text-body-sm leading-relaxed text-stone">
          Every detail is either verified by dwellr or clearly marked as added by the community.
        </p>
        <p className="text-caption text-stone">© {new Date().getFullYear()} dwellr</p>
      </Container>
    </footer>
  );
}
