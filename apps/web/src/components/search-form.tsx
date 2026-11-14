import { SearchIcon } from "@/components/ui/icons";

type SearchInputProps = {
  defaultValue?: string;
  className?: string;
  size?: "sm" | "md";
};

/** The field alone, so pages can place it inside their own filter form. */
export function SearchInput({ defaultValue = "", className = "", size = "sm" }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
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
        className={`w-full rounded-full border border-line bg-mist pr-4 pl-10 text-body-sm text-ink outline-none placeholder:text-stone-soft focus:border-ink focus:bg-paper ${
          size === "md" ? "h-12" : "h-10"
        }`}
      />
    </div>
  );
}

export function SearchForm({ defaultValue = "", className = "" }: SearchInputProps) {
  return (
    <form action="/explore" role="search" className={className}>
      <SearchInput defaultValue={defaultValue} />
    </form>
  );
}
