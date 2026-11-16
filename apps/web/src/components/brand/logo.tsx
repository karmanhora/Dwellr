import Image from "next/image";

/**
 * The supplied HausCrawl logo is one lockup: the house mark and wordmark on an
 * ink field. The square mark here is cropped from that same artwork for
 * decorative surfaces and app icons.
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
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
} as const;

type LogoProps = {
  size?: keyof typeof sizes;
  className?: string;
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span className={`inline-flex shrink-0 self-start ${className}`}>
      <Image
        src="/brand/hauscrawl-lockup.svg"
        alt="HausCrawl"
        width={1150}
        height={250}
        unoptimized
        className={`${sizes[size]} w-auto`}
      />
    </span>
  );
}
