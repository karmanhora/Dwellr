/* eslint-disable @next/next/no-html-link-for-pages -- public waitlist navigation uses plain anchors to avoid client routing JS */
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function WaitlistHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-20">
        <a href="/" className="rounded-lg" aria-label="dwellr — home">
          <Logo size="sm" />
        </a>

        <div className="flex items-center gap-4">
          <p className="hidden text-caption tracking-[0.14em] text-stone uppercase sm:block">
            Seattle / King County
          </p>
          <a href="/#join" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Join the waitlist
          </a>
        </div>
      </Container>
    </header>
  );
}
