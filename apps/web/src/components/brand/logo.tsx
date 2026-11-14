import type { SVGProps } from "react";

/**
 * House mark drawn inline so it can inherit currentColor and scale crisply.
 * Geometry matches public/brand/dwellr-mark.svg — keep the two in sync.
 */
export function HouseMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48 2 94 40v54H2V40L48 2Zm-12 92V66a12 12 0 0 1 24 0v28H36Z"
      />
    </svg>
  );
}

const sizes = {
  sm: { mark: "h-5 w-5", word: "text-[1.05rem]" },
  md: { mark: "h-7 w-7", word: "text-2xl" },
  lg: { mark: "h-11 w-11", word: "text-4xl" },
} as const;

type LogoProps = {
  size?: keyof typeof sizes;
  className?: string;
};

/**
 * The wordmark is set in Outfit (the brand typeface) rather than an image so it
 * stays crisp at every size and remains accessible text.
 */
export function Logo({ size = "md", className = "" }: LogoProps) {
  const { mark, word } = sizes[size];

  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <HouseMark className={mark} />
      <span className={`font-medium lowercase leading-none tracking-[-0.045em] ${word}`}>
        dwellr
      </span>
    </span>
  );
}
