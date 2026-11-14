import { getInitials } from "@dwellr/core";

/**
 * Initials avatar. Photo avatars arrive with Storage uploads in a later
 * milestone; until then every profile renders the same calm fallback.
 */
export function Avatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const dimensions =
    size === "sm" ? "h-9 w-9 text-xs" : "h-16 w-16 text-lg sm:h-20 sm:w-20 sm:text-xl";

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-mist font-medium tracking-wide text-ink ${dimensions}`}
    >
      {getInitials(name)}
    </div>
  );
}
