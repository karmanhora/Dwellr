import { SearchIcon } from "@/components/ui/icons";

export function SearchForm({
  defaultValue = "",
  className = "",
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action="/explore" role="search" className={`relative ${className}`}>
      <SearchIcon
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone"
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search city or neighborhood"
        aria-label="Search homes"
        className="h-10 w-full rounded-full border border-line bg-mist pr-4 pl-10 text-body-sm text-ink outline-none placeholder:text-stone-soft focus:border-ink focus:bg-paper"
      />
    </form>
  );
}
