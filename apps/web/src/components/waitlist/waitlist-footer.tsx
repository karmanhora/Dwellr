import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getContactEmail } from "@/lib/site";

export function WaitlistFooter() {
  const contact = getContactEmail();

  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-8 py-10 sm:py-12">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <Logo size="sm" />
            <p className="mt-3 max-w-xs text-body-sm leading-relaxed text-stone">
              Find a home together. Early access starts in Seattle / King County.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
            <a href="/privacy" className="text-body-sm text-stone transition hover:text-ink">
              Privacy
            </a>
            <a href="/terms" className="text-body-sm text-stone transition hover:text-ink">
              Terms
            </a>
            <a
              href={`mailto:${contact}`}
              className="text-body-sm text-stone transition hover:text-ink"
            >
              Contact
            </a>
          </nav>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-line pt-5 text-caption text-stone sm:flex-row">
          <p>© {new Date().getFullYear()} dwellr</p>
          <p>Private by default. No street addresses.</p>
        </div>
      </Container>
    </footer>
  );
}
