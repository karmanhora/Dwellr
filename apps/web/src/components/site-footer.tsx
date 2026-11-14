import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <Logo size="sm" />
        <p className="max-w-md text-sm leading-relaxed text-stone">
          A calmer way to find a home. Every detail is either verified by dwellr or clearly marked
          as added by the community.
        </p>
        <p className="text-xs text-stone">© {new Date().getFullYear()} dwellr</p>
      </div>
    </footer>
  );
}
