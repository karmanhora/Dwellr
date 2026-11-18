import Image from "next/image";

/**
 * The supplied HausCrawl logo is one lockup: the house mark and wordmark on a
 * light field. The transparent variant removes only that field for warm waitlist
 * surfaces. The square mark here is cropped from the same artwork for decorative
 * surfaces and app icons.
 */
export function HouseMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/hauscrawl-mark.png"
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      unoptimized
      className={className}
    />
  );
}

const sizes = {
  xs: "h-6 sm:h-8",
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
} as const;

type LogoProps = {
  size?: keyof typeof sizes;
  className?: string;
  transparent?: boolean;
};

export function Logo({ size = "md", className = "", transparent = false }: LogoProps) {
  return (
    <span className={`inline-flex shrink-0 self-start ${className}`}>
      <Image
        src={
          transparent
            ? "/brand/hauscrawl-lockup-transparent.svg"
            : "/brand/hauscrawl-lockup.svg"
        }
        alt="HausCrawl"
        width={1800}
        height={280}
        unoptimized
        className={`${sizes[size]} w-auto`}
      />
    </span>
  );
}
