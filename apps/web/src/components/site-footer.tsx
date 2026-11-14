import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-6 pt-10 pb-24 lg:flex-row lg:items-center lg:justify-between lg:py-10">
        <Logo size="sm" />
        <nav aria-label="Footer" className="flex gap-6">
          <Link
            href="/explore"
            className="text-body-sm whitespace-nowrap text-stone transition hover:text-ink"
          >
            Explore homes
          </Link>
          <Link
            href="/create"
            className="text-body-sm whitespace-nowrap text-stone transition hover:text-ink"
          >
            Post a home
          </Link>
        </nav>
        <p className="max-w-md text-body-sm leading-relaxed text-stone">
          Every detail is either verified by dwellr or clearly marked as added by the community.
        </p>
        <p className="text-caption whitespace-nowrap text-stone">© {new Date().getFullYear()} dwellr</p>
      </Container>
    </footer>
  );
}
