import type { SVGProps } from "react";

/**
 * The HausCrawl monogram. The old house mark and its inline paths have been
 * removed; the supplied name is now the primary brand signal.
 */
export function HouseMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <rect width="512" height="512" rx="96" fill="currentColor" />
      <path fill="#FFFFFF" d="M144 128h64v104h96V128h64v256h-64V288h-96v96h-64z" />
    </svg>
  );
}

const sizes = {
  sm: { mark: "h-6 w-6", text: "text-lg" },
  md: { mark: "h-8 w-8", text: "text-xl" },
  lg: { mark: "h-11 w-11", text: "text-3xl" },
} as const;

type LogoProps = {
  size?: keyof typeof sizes;
  className?: string;
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-ink ${className}`}
      aria-label="HausCrawl"
    >
      <HouseMark className={`${sizes[size].mark} shrink-0`} />
      <span className={`font-medium tracking-[-0.045em] ${sizes[size].text}`}>HausCrawl</span>
    </span>
  );
}
