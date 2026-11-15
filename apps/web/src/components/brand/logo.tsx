import type { SVGProps } from "react";

import { DWELLR_LOCKUP_PATH, DWELLR_MARK_PATH } from "@/components/brand/logo-paths";

/**
 * The house portion of public/brand/dwellr-mark.svg, drawn inline so it can
 * inherit currentColor and scale crisply.
 */
export function HouseMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="214 312 224 202"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path fill="currentColor" fillRule="evenodd" d={DWELLR_MARK_PATH} />
    </svg>
  );
}

const sizes = {
  sm: "h-5",
  md: "h-7",
  lg: "h-11",
} as const;

type LogoProps = {
  size?: keyof typeof sizes;
  className?: string;
};

/**
 * The supplied mark and custom wordmark are one lockup, so they scale together
 * as a single vector rather than as a mark plus live text.
 */
export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center text-ink ${className}`}>
      <svg
        viewBox="214 312 914 202"
        aria-hidden="true"
        focusable="false"
        className={`w-auto shrink-0 ${sizes[size]}`}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d={DWELLR_LOCKUP_PATH}
        />
      </svg>
      <span className="sr-only">dwellr</span>
    </span>
  );
}
